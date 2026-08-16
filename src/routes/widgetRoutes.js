const express = require('express');
const router = express.Router();
const widgetService = require('../services/widgetService');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createWidgetSchema,
  updateWidgetSchema,
  widgetIdParamSchema
} = require('../schemas/widgetSchemas');

// All widget management endpoints require authentication
router.use(authMiddleware);

// POST /api/widgets - Create new widget
router.post(
  '/',
  validate(createWidgetSchema, 'body'),
  async (req, res, next) => {
    try {
      const widget = await widgetService.createWidget(req.tenantId, req.body);
      res.status(201).json({
        success: true,
        message: 'Widget created successfully',
        data: widget
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/widgets - List tenant widgets
router.get('/', async (req, res, next) => {
  try {
    const widgets = await widgetService.listWidgets(req.tenantId);
    res.status(200).json({
      success: true,
      data: widgets
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/widgets/:id - Get single widget
router.get(
  '/:id',
  validate(widgetIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const widget = await widgetService.getWidgetById(req.params.id, req.tenantId);
      res.status(200).json({
        success: true,
        data: widget
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/widgets/:id - Update widget
router.put(
  '/:id',
  validate(widgetIdParamSchema, 'params'),
  validate(updateWidgetSchema, 'body'),
  async (req, res, next) => {
    try {
      const updatedWidget = await widgetService.updateWidget(
        req.params.id,
        req.tenantId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: 'Widget updated successfully',
        data: updatedWidget
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/widgets/:id - Delete widget
router.delete(
  '/:id',
  validate(widgetIdParamSchema, 'params'),
  async (req, res, next) => {
    try {
      await widgetService.deleteWidget(req.params.id, req.tenantId);
      res.status(200).json({
        success: true,
        message: 'Widget deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
