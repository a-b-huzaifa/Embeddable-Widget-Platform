const rateLimit = require('express-rate-limit');

/**
 * Standard 429 response handler for structured JSON error output
 */
function rateLimitHandler(req, res, next, options) {
  res.status(options.statusCode || 429).json({
    success: false,
    error: {
      message: options.message || 'Too many requests. Please slow down and try again later.',
      statusCode: 429
    }
  });
}

/**
 * 1. Per-IP Rate Limiter for Submission Endpoint
 * Default: 30 requests per 15-minute window per IP
 */
const submissionIpLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10 : (parseInt(process.env.RATE_LIMIT_IP_MAX, 10) || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many submissions from this IP. Please wait before submitting again.',
  handler: rateLimitHandler
});

/**
 * 2. Per-Widget Rate Limiter for Burst Protection
 * Limits rapid succession floods on a single widget
 * Default: 60 submissions per 5-minute window per widget
 */
const submissionWidgetLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 5 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 15 : (parseInt(process.env.RATE_LIMIT_WIDGET_MAX, 10) || 60),
  keyGenerator: (req) => {
    return req.body?.widget_id || req.body?.widgetId || req.params?.widgetId || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many submissions for this widget. Please try again shortly.',
  handler: rateLimitHandler
});

/**
 * Factory helper for testing custom burst limits
 */
function createCustomRateLimiter({ windowMs = 1000, max = 5, message = 'Too many requests' }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    handler: rateLimitHandler
  });
}

module.exports = {
  submissionIpLimiter,
  submissionWidgetLimiter,
  createCustomRateLimiter,
  rateLimitHandler
};
