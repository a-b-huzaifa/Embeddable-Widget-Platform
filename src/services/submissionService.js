const submissionRepository = require('../repositories/submissionRepository');
const widgetRepository = require('../repositories/widgetRepository');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');
const { geoService } = require('./geoService');
const { dispatchSafeConfirmation } = require('./notificationService');

async function submitLead({
  widgetId,
  payload,
  geo = null,
  referrer = null,
  clientIp = null,
  hpCheck = null,
  geoProviders = null,
  notificationHandler = null
}) {
  if (!widgetId) {
    throw new BadRequestError('widget_id is required');
  }

  // Honeypot Anti-Spam Control:
  // If the honeypot field is filled with any content, it indicates bot submission.
  // Silently drop without writing to database.
  const isBot = Boolean(
    (hpCheck && String(hpCheck).trim().length > 0) ||
    (payload && payload._hp_check && String(payload._hp_check).trim().length > 0)
  );

  if (isBot) {
    // Return standard success response to bot, but bypass database write completely
    return {
      id: '00000000-0000-0000-0000-000000000000',
      widget_id: widgetId,
      status: 'spam_dropped',
      created_at: new Date().toISOString()
    };
  }

  // 1. Resolve target widget to verify existence and extract tenant_id
  const widget = await widgetRepository.findWidgetById(widgetId);
  if (!widget) {
    throw new NotFoundError(`Widget with ID ${widgetId} not found`);
  }

  // 2. Safe IP-to-Geo Enrichment with Fallback Chain
  let resolvedGeo = null;
  if (clientIp) {
    try {
      resolvedGeo = await geoService.resolveIpGeo(clientIp, geoProviders);
    } catch (err) {
      // Safe side effect: Geolocation lookup failure must never fail the submission
      console.warn(`[SubmissionService] Geo enrichment error for IP ${clientIp}: ${err.message}`);
    }
  }

  // 3. Format geo / telemetry metadata
  const enrichedGeo = {
    ...(geo || {}),
    ...(resolvedGeo || {}),
    ...(clientIp ? { client_ip: clientIp } : {}),
    ...(referrer ? { referrer } : {})
  };

  // 4. Primary Critical Work: Persist submission linked to widget_id and tenant_id
  const submission = await submissionRepository.createSubmission({
    widgetId: widget.id,
    tenantId: widget.tenant_id,
    payload,
    geo: Object.keys(enrichedGeo).length > 0 ? enrichedGeo : null,
    status: 'new'
  });

  // 5. Post-Storage Safe Side Effect: Dispatch lead confirmation notification
  // Guaranteed to NEVER bubble errors or cause the submission request to fail
  await dispatchSafeConfirmation(
    { submission, widget, payload },
    notificationHandler
  );

  return {
    id: submission.id,
    widget_id: submission.widget_id,
    tenant_id: submission.tenant_id,
    status: submission.status,
    created_at: submission.created_at
  };
}

module.exports = {
  submitLead
};
