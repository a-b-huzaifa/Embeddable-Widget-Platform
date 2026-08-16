const express = require('express');
const router = express.Router();
const submissionService = require('../services/submissionService');
const { validate } = require('../middleware/validate');
const { createSubmissionSchema } = require('../schemas/submissionSchemas');
const { submissionCors } = require('../middleware/corsConfig');
const { submissionIpLimiter, submissionWidgetLimiter } = require('../middleware/rateLimiter');

// Apply explicit CORS middleware for submissions
router.use(submissionCors);
router.options('*', submissionCors);

/**
 * POST /api/submissions
 * Public lead capture submission ingestion endpoint with rate limiting & honeypot anti-spam
 */
router.post(
  '/',
  submissionIpLimiter,
  submissionWidgetLimiter,
  validate(createSubmissionSchema, 'body'),
  async (req, res, next) => {
    try {
      const widgetId = req.body.widget_id || req.body.widgetId;
      const { payload, geo, referrer, _hp_check } = req.body;
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await submissionService.submitLead({
        widgetId,
        payload,
        geo,
        referrer: referrer || req.headers.referer || req.headers.referrer,
        clientIp,
        hpCheck: _hp_check
      });

      res.status(201).json({
        success: true,
        message: 'Lead submission received successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/public/widgets/:widgetId/submit (Convenience alias for script bundles)
 */
router.post(
  '/public/widgets/:widgetId/submit',
  async (req, res, next) => {
    try {
      const widgetId = req.params.widgetId;
      const { payload, geo, referrer } = req.body || {};
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Validate payload existence
      if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error: payload must be a non-empty object',
            statusCode: 400
          }
        });
      }

      const result = await submissionService.submitLead({
        widgetId,
        payload,
        geo,
        referrer: referrer || req.headers.referer || req.headers.referrer,
        clientIp
      });

      res.status(201).json({
        success: true,
        message: 'Lead submission received successfully',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
