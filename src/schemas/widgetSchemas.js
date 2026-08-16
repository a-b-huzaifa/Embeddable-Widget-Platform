const { z } = require('zod');

const fieldSchema = z.object({
  id: z.string().min(1, 'Field id is required'),
  type: z.enum(['text', 'email', 'textarea', 'select', 'number', 'phone', 'checkbox']),
  label: z.string().min(1, 'Field label is required'),
  required: z.boolean().optional().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional()
});

const displayOptionsSchema = z.object({
  theme: z.string().optional(),
  primary_color: z.string().optional(),
  primaryColor: z.string().optional(),
  background_color: z.string().optional(),
  backgroundColor: z.string().optional(),
  text_color: z.string().optional(),
  textColor: z.string().optional(),
  position: z.enum(['bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left', 'inline', 'modal', 'popup']).optional(),
  trigger: z.enum(['immediate', 'delay', 'scroll', 'exit_intent']).optional(),
  trigger_delay_ms: z.number().nonnegative().optional(),
  allowed_domains: z.array(z.string()).optional(),
  allowedDomains: z.array(z.string()).optional()
}).passthrough();

const createWidgetSchema = z.object({
  type: z.string().min(1).default('lead_capture'),
  title: z.string().min(1, 'Title cannot be empty').max(255),
  description: z.string().optional().default(''),
  fields: z.array(fieldSchema).optional().default([]),
  button_text: z.string().optional(),
  buttonText: z.string().optional(),
  display_options: displayOptionsSchema.optional(),
  displayOptions: displayOptionsSchema.optional()
}).refine(
  (data) => data.title && data.title.trim().length > 0,
  { message: 'Widget title is required and cannot be whitespace only', path: ['title'] }
);

const updateWidgetSchema = z.object({
  type: z.string().min(1).optional(),
  title: z.string().min(1, 'Title cannot be empty').max(255).optional(),
  description: z.string().optional(),
  fields: z.array(fieldSchema).optional(),
  button_text: z.string().optional(),
  buttonText: z.string().optional(),
  display_options: displayOptionsSchema.optional(),
  displayOptions: displayOptionsSchema.optional()
});

const widgetIdParamSchema = z.object({
  id: z.string().uuid('Widget ID must be a valid UUID')
});

module.exports = {
  fieldSchema,
  displayOptionsSchema,
  createWidgetSchema,
  updateWidgetSchema,
  widgetIdParamSchema
};
