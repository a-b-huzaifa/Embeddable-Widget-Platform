const cors = require('cors');

// Explicit origin whitelist
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function getCustomAllowedOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  }
  return [];
}

const submissionCorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (such as mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const whitelist = [...DEFAULT_ALLOWED_ORIGINS, ...getCustomAllowedOrigins()];

    if (whitelist.includes(origin)) {
      return callback(null, true);
    }

    // Disallowed origin: return false (CORS headers will NOT be set for disallowed origin)
    return callback(null, false);
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
};

const submissionCors = cors(submissionCorsOptions);

module.exports = {
  submissionCors,
  submissionCorsOptions,
  DEFAULT_ALLOWED_ORIGINS
};
