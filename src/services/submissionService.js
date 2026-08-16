const submissionRepository = require('../repositories/submissionRepository');
const widgetRepository = require('../repositories/widgetRepository');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');

async function submitLead({ widgetId, payload, geo = null, referrer = null, clientIp = null }) {
  if (!widgetId) {
    throw new BadRequestError('widget_id is required');
  }

  // 1. Resolve target widget to verify existence and extract tenant_id
  const widget = await widgetRepository.findWidgetById(widgetId);
  if (!widget) {
    throw new NotFoundError(`Widget with ID ${widgetId} not found`);
  }

  // 2. Format geo / telemetry metadata
  const enrichedGeo = {
    ...(geo || {}),
    ...(clientIp ? { client_ip: clientIp } : {}),
    ...(referrer ? { referrer } : {})
  };

  // 3. Persist submission linked to correct widget_id and tenant_id
  const submission = await submissionRepository.createSubmission({
    widgetId: widget.id,
    tenantId: widget.tenant_id,
    payload,
    geo: Object.keys(enrichedGeo).length > 0 ? enrichedGeo : null,
    status: 'new'
  });

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
