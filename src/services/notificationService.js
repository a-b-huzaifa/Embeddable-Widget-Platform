/**
 * Confirmation & Notification Side Effect Service
 * Dispatches simulated email confirmations or webhooks after a lead submission is stored.
 */

async function sendSubmissionConfirmation({ submission, widget, payload }) {
  const recipient = payload?.email || payload?.work_email || 'tenant-notifications@example.com';
  const leadName = payload?.full_name || payload?.name || 'Prospective Client';
  const widgetTitle = widget?.title || 'Lead Capture Widget';

  // Simulated structured email dispatch log
  const emailBody = [
    '====================================================',
    '📧 [NEW LEAD CONFIRMATION DISPATCH]',
    `To: ${recipient}`,
    `Subject: Confirmation: Your submission for "${widgetTitle}"`,
    `Timestamp: ${submission.created_at || new Date().toISOString()}`,
    `Submission ID: ${submission.id}`,
    `Widget ID: ${submission.widget_id}`,
    `Lead Name: ${leadName}`,
    `Payload Summary: ${JSON.stringify(payload)}`,
    'Status: Dispatched Successfully',
    '===================================================='
  ].join('\n');

  console.log(emailBody);

  return {
    dispatched: true,
    recipient,
    submission_id: submission.id,
    timestamp: new Date().toISOString()
  };
}

/**
 * Safe execution wrapper for confirmation side effects
 * Guaranteed to NEVER bubble errors or fail the parent submission request
 */
async function dispatchSafeConfirmation(data, notificationHandler = sendSubmissionConfirmation) {
  try {
    if (typeof notificationHandler === 'function') {
      await notificationHandler(data);
    }
  } catch (err) {
    // Safe side effect: Log failure to error telemetry without interrupting the client response
    console.error(`[NotificationService] Safe confirmation side effect failed: ${err.message}`);
  }
}

module.exports = {
  sendSubmissionConfirmation,
  dispatchSafeConfirmation
};
