const widgetRepository = require('../repositories/widgetRepository');
const { assertTenantOwnership } = require('../middleware/tenantGuard');
const { NotFoundError, BadRequestError } = require('../middleware/errorHandler');

async function createWidget(tenantId, widgetData) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required to create a widget');
  }
  if (!widgetData.title) {
    throw new BadRequestError('Widget title is required');
  }

  return widgetRepository.createWidget({
    tenantId,
    type: widgetData.type || 'lead_capture',
    title: widgetData.title.trim(),
    description: widgetData.description || '',
    fields: widgetData.fields || [],
    buttonText: widgetData.buttonText || widgetData.button_text || 'Submit',
    displayOptions: widgetData.displayOptions || widgetData.display_options || {}
  });
}

async function listWidgets(tenantId) {
  if (!tenantId) {
    throw new BadRequestError('Tenant ID is required to list widgets');
  }
  return widgetRepository.listWidgetsByTenant(tenantId);
}

async function getWidgetById(widgetId, currentTenantId) {
  const widget = await widgetRepository.findWidgetById(widgetId);

  if (!widget) {
    throw new NotFoundError(`Widget with ID ${widgetId} not found`);
  }

  // Enforce tenant isolation guard
  assertTenantOwnership(widget.tenant_id, currentTenantId, 'widget');

  return widget;
}

async function updateWidget(widgetId, currentTenantId, updateData) {
  const existingWidget = await widgetRepository.findWidgetById(widgetId);

  if (!existingWidget) {
    throw new NotFoundError(`Widget with ID ${widgetId} not found`);
  }

  // Enforce tenant isolation guard
  assertTenantOwnership(existingWidget.tenant_id, currentTenantId, 'widget');

  return widgetRepository.updateWidget({
    id: widgetId,
    tenantId: currentTenantId,
    type: updateData.type,
    title: updateData.title,
    description: updateData.description,
    fields: updateData.fields,
    buttonText: updateData.buttonText || updateData.button_text,
    displayOptions: updateData.displayOptions || updateData.display_options
  });
}

async function deleteWidget(widgetId, currentTenantId) {
  const existingWidget = await widgetRepository.findWidgetById(widgetId);

  if (!existingWidget) {
    throw new NotFoundError(`Widget with ID ${widgetId} not found`);
  }

  // Enforce tenant isolation guard
  assertTenantOwnership(existingWidget.tenant_id, currentTenantId, 'widget');

  return widgetRepository.deleteWidget(widgetId, currentTenantId);
}

module.exports = {
  createWidget,
  listWidgets,
  getWidgetById,
  updateWidget,
  deleteWidget
};
