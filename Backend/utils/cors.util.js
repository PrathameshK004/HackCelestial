const configuredOrigins = (process.env.ADMIN_FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const fixedOrigins = [
  'https://hack-celestial-one.vercel.app',
  'https://triptual-web.vercel.app',
  'https://triptual-admin-dashboard.vercel.app',
  'https://triptual-admin-dashboard-git-main.vercel.app',
];

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (configuredOrigins.includes(origin) || fixedOrigins.includes(origin)) {
    return true;
  }

  const localPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;
  const lanPattern = /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/i;
  const expoPattern = /^exp:\/\//i;

  if (localPattern.test(origin) || lanPattern.test(origin) || expoPattern.test(origin)) {
    return true;
  }

  return /^https:\/\/triptual-admin-dashboard(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
}

module.exports = { corsOrigin, isAllowedOrigin };