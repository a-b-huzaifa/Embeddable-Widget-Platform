const { ForbiddenError, BadRequestError } = require('./errorHandler');

/**
 * Validates that a requested resource belongs strictly to the authenticated tenant.
 * If there is a mismatch (i.e. cross-tenant access attempt), throws ForbiddenError (403).
 *
 * @param {string} resourceTenantId - The tenant_id of the entity in the database
 * @param {string} currentTenantId - The authenticated req.tenantId
 * @param {string} [resourceName='resource'] - Human readable name for error logging
 */
function assertTenantOwnership(resourceTenantId, currentTenantId, resourceName = 'resource') {
  if (!resourceTenantId || !currentTenantId) {
    throw new BadRequestError('Tenant validation parameters missing');
  }

  if (String(resourceTenantId) !== String(currentTenantId)) {
    throw new ForbiddenError(`Forbidden: Access denied to ${resourceName} belonging to another tenant`);
  }
}

/**
 * Route-level guard middleware verifying req.tenantId exists
 * and matches :tenantId URL param if supplied.
 */
function tenantGuard(req, res, next) {
  if (!req.tenantId) {
    return next(new ForbiddenError('Forbidden: Tenant context missing'));
  }

  if (req.params.tenantId && String(req.params.tenantId) !== String(req.tenantId)) {
    return next(new ForbiddenError('Forbidden: Route tenantId does not match authenticated tenant'));
  }

  next();
}

/**
 * Helper to enforce tenant_id in SQL WHERE clauses.
 *
 * @param {string} baseSql - The base SQL query
 * @param {string} [tenantColumn='tenant_id'] - The column representing tenant ownership
 * @returns {string} Scoped SQL fragment
 */
function scopeTenantQuery(baseSql, tenantColumn = 'tenant_id') {
  const separator = baseSql.toLowerCase().includes('where') ? 'AND' : 'WHERE';
  return `${baseSql} ${separator} ${tenantColumn} = $1`;
}

module.exports = {
  assertTenantOwnership,
  tenantGuard,
  scopeTenantQuery
};
