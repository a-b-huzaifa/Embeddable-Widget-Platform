const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const widgetService = require('../services/widgetService');
const { validate } = require('../middleware/validate');
const { widgetIdParamSchema } = require('../schemas/widgetSchemas');

// Load script bundle into memory for ultra-fast delivery
const bundlePath = path.join(__dirname, '../public/widget.v1.js');
let bundleContent = '';
if (fs.existsSync(bundlePath)) {
  bundleContent = fs.readFileSync(bundlePath, 'utf8');
}

/**
 * GET /widget.v1.js & /widget.js
 * Versioned, immutable, public bundle with far-future caching headers
 */
function serveWidgetBundle(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (!bundleContent && fs.existsSync(bundlePath)) {
    bundleContent = fs.readFileSync(bundlePath, 'utf8');
  }

  res.status(200).send(bundleContent);
}

router.get('/widget.v1.js', serveWidgetBundle);
router.get('/widget.js', serveWidgetBundle);

/**
 * GET /widgets/:id/config (and /api/public/widgets/:id/config)
 * Public, short-lived cached JSON configuration endpoint
 */
router.get(
  '/widgets/:id/config',
  validate(widgetIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const config = await widgetService.getPublicWidgetConfig(req.params.id);

      // Short-lived caching headers (60s) with wildcard CORS
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

      res.status(200).json({
        success: true,
        data: config
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
