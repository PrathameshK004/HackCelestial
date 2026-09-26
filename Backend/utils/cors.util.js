const configuredOrigins = (process.env.ADMIN_FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const fixedOrigins = [
  'https://hack-celestial-one.vercel.app',,
  'https://triptual-web.vercel.app',
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.includes(origin) || fixedOrigins.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return /^https:\/\/triptual-admin-dashboard(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
}

function corsOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
}

module.exports = { corsOrigin, isAllowedOrigin };