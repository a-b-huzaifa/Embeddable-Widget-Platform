const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const widgetRoutes = require('./routes/widgetRoutes');
const publicRoutes = require('./routes/publicRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const { errorHandler, NotFoundError } = require('./middleware/errorHandler');

const app = express();

// Global Middlewares
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Public Lead Ingestion Endpoint (CORS-managed)
app.use('/api/submissions', submissionRoutes);
app.use('/api', submissionRoutes);

// Public Widget Delivery Routes (Unauthenticated, Fast Cached)
app.use('/', publicRoutes);
app.use('/api/public', publicRoutes);

// Protected API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Widget Management Routes
app.use('/api/widgets', widgetRoutes);
app.use('/api/v1/widgets', widgetRoutes);

// Catch 404 for unknown endpoints
app.use((req, res, next) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} not found`));
});

// Global Error Handler Middleware (ensures clean JSON responses)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

module.exports = app;
