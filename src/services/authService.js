const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const tenantRepository = require('../repositories/tenantRepository');
const userRepository = require('../repositories/userRepository');
const { JWT_SECRET } = require('../middleware/auth');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

async function register({ name, slug, email, password }) {
  if (!name || !slug || !email || !password) {
    throw new BadRequestError('Name, slug, email, and password are required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanSlug = slug.trim().toLowerCase();

  // Check if tenant slug or email already exists
  const existingTenant = await tenantRepository.findTenantBySlug(cleanSlug);
  if (existingTenant) {
    throw new BadRequestError('A tenant with this slug already exists');
  }

  const existingUser = await userRepository.findUserByEmail(cleanEmail);
  if (existingUser) {
    throw new BadRequestError('A user with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Execute in transaction
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const tenant = await tenantRepository.createTenant(
      { name: name.trim(), slug: cleanSlug },
      client
    );

    const user = await userRepository.createUser(
      {
        tenantId: tenant.id,
        email: cleanEmail,
        passwordHash,
        role: 'admin'
      },
      client
    );

    await client.query('COMMIT');

    const token = generateToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      }
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new BadRequestError('Email and password are required');
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await userRepository.findUserByEmail(cleanEmail);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tenant = await tenantRepository.findTenantById(user.tenant_id);
  if (!tenant) {
    throw new NotFoundError('Associated tenant account not found');
  }

  const token = generateToken({
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    }
  };
}

async function getMe(userId, tenantId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const tenant = await tenantRepository.findTenantById(tenantId);
  if (!tenant) {
    throw new NotFoundError('Tenant not found');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    }
  };
}

module.exports = {
  register,
  login,
  getMe,
  generateToken
};
