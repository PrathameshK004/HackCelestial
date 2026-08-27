# HackCelestial

## PostgreSQL setup

This API uses PostgreSQL through the `pg` client. On startup it creates the `users` table if it does not already exist.

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to your Neon PostgreSQL connection string. Keep this value out of source control.
3. Set `JWTSecret`, `REFRESH_TOKEN_SECRET`, and `EMAIL_SERVICE_API`.
4. Optionally set `EMAIL_SERVICE_URL`; it defaults to `https://email-service-delta-seven.vercel.app/api/send-email`.
5. Start the API with `npm start` or `npm run dev`.

Authentication uses a 15-minute access token and a 7-day rotating refresh token. Set `ACCESS_TOKEN_EXPIRES_IN` and `REFRESH_TOKEN_EXPIRES_IN` with values such as `15m` and `7d`; set `REFRESH_TOKEN_SECRET` to a separate secret from `JWTSecret`.

Use `POST /api/users/refresh` to rotate the refresh token and issue a new access token. `POST /api/users/logout` revokes the current refresh token. The access token can be sent as a Bearer token or is read from the `accessToken` cookie.

The API listens on port `4000` by default.