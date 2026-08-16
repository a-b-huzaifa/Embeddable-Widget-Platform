const EventEmitter = require('events');

class EventStreamService extends EventEmitter {
  constructor() {
    super();
    // Increase maximum listener capacity for concurrent dashboard viewers
    this.setMaxListeners(100);
  }

  /**
   * Handle incoming Server-Sent Events connection
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  handleSseConnection(req, res) {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized stream connection', statusCode: 401 }
      });
    }

    // Set standard SSE response headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send initial handshake / connected event
    const initialPayload = JSON.stringify({
      type: 'connected',
      tenantId,
      timestamp: new Date().toISOString()
    });
    res.write(`data: ${initialPayload}\n\n`);

    // Event listener strictly scoped to this tenant
    const channelName = `tenant:${tenantId}`;
    const messageListener = (eventData) => {
      try {
        res.write(`data: ${JSON.stringify(eventData)}\n\n`);
      } catch (err) {
        console.error(`[EventStreamService] Failed to write SSE chunk: ${err.message}`);
      }
    };

    this.on(channelName, messageListener);

    // Heartbeat ping every 25s to keep connection alive through load balancers
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (err) {
        clearInterval(heartbeatInterval);
      }
    }, 25000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      this.removeListener(channelName, messageListener);
    });
  }

  /**
   * Publish new lead capture event to connected tenant dashboard viewers
   * Safe execution: Never throws or interrupts calling flow
   */
  publishLeadEvent(tenantId, leadData) {
    if (!tenantId) return;
    try {
      const channelName = `tenant:${tenantId}`;
      const payload = {
        type: 'new_lead',
        tenantId,
        data: leadData,
        timestamp: new Date().toISOString()
      };
      this.emit(channelName, payload);
    } catch (err) {
      console.error(`[EventStreamService] Error broadcasting lead event: ${err.message}`);
    }
  }
}

const defaultEventStreamService = new EventStreamService();

module.exports = {
  EventStreamService,
  eventStreamService: defaultEventStreamService
};
