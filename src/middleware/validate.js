const { ZodError } = require('zod');
const { BadRequestError } = require('./errorHandler');

/**
 * Express middleware to validate request payload/params/query against a Zod schema.
 * Formats validation issues cleanly into a 400 Bad Request error.
 *
 * @param {import('zod').ZodSchema} schema - Zod validation schema
 * @param {'body' | 'params' | 'query'} [source='body'] - Request property to validate
 */
function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed; // assign sanitized / coerced data back
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formattedErrors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        }));

        const primaryMessage = formattedErrors.length > 0
          ? `Validation error: ${formattedErrors[0].field ? formattedErrors[0].field + ' ' : ''}${formattedErrors[0].message}`
          : 'Invalid request data';

        return next(new BadRequestError(primaryMessage, formattedErrors));
      }
      next(err);
    }
  };
}

module.exports = { validate };
