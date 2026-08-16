const express = require('express');
const cors = require('cors');
const router = express.Router();
const authService = require('../services/authService');
const { authMiddleware } = require('../middleware/auth');

router.use(cors());

// POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, slug, email, password } = req.body;
    const result = await authService.register({ name, slug, email, password });
    res.status(201).json({
      success: true,
      message: 'Tenant and user registered successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me (Authenticated)
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.id, req.tenantId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
