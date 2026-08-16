const { z } = require('zod');

const MAX_PAYLOAD_BYTES = 10 * 1024; // 10KB payload limit

const createSubmissionSchema = z.object({
  widget_id: z.string().uuid('widget_id must be a valid UUID').optional(),
  widgetId: z.string().uuid('widgetId must be a valid UUID').optional(),
  payload: z.record(z.any())
    .refine((obj) => obj && typeof obj === 'object' && Object.keys(obj).length > 0, {
      message: 'Payload must be a non-empty object containing at least one field'
    })
    .refine((obj) => {
      try {
        return JSON.stringify(obj).length <= MAX_PAYLOAD_BYTES;
      } catch {
        return false;
      }
    }, {
      message: `Payload exceeds the maximum allowed size of ${MAX_PAYLOAD_BYTES / 1024}KB`
    }),
  referrer: z.string().max(2048, 'Referrer URL cannot exceed 2048 characters').optional().nullable(),
  _hp_check: z.string().optional().nullable(),
  geo: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
    ip: z.string().optional()
  }).passthrough().optional().nullable()
}).refine((data) => data.widget_id || data.widgetId, {
  message: 'Either widget_id or widgetId is required',
  path: ['widget_id']
});

module.exports = {
  createSubmissionSchema,
  MAX_PAYLOAD_BYTES
};
