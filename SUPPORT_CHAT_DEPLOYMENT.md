# Support Chat Production Deployment

## Runtime Design

- The customer API owns the ticket REST API and customer Socket.IO endpoint.
- The admin API owns admin authentication and the agent Socket.IO endpoint.
- Both APIs must use the same PostgreSQL database.
- Database triggers write ticket, message, and status changes to `support_ticket_event_outbox` in the same transaction as the chat write.
- PostgreSQL `NOTIFY` wakes both socket services for low-latency delivery. Each service keeps its own cursor and replays outbox rows after reconnects/restarts.
- Socket.IO delivers immediately when clients are connected. Customer and agent clients reload persisted history on reconnect, so temporary disconnects do not lose messages.
- The customer API and admin API use separate JWT secrets. Do not share admin signing secrets with the customer API.

## Deployment Order

1. Deploy the outer repository's customer API `support` branch. Its startup migration creates the outbox tables and triggers.
2. Deploy the nested `Triptual-Admin-Dashboard` repository's `support` branch. Configure its Render service with the same `DATABASE_URL` as the customer API. Keep `JWT_SECRET` generated/unique for the admin service.
3. Set the admin Vercel project's `VITE_API_BASE_URL` to the actual Render admin API origin, for example `https://<actual-admin-render-host>` without `/api`. The dashboard derives its Socket.IO origin from this value. `VITE_SOCKET_URL` is optional; if set, use the same origin without `/api`.
4. In the customer WebApp Vercel project, set `VITE_API_URL=https://triptual-api.onrender.com/api` if a `VITE_API_URL` override already exists. Otherwise the source fallback uses that live API.
5. Rebuild and publish the mobile app after changing `EXPO_PUBLIC_API_URL`; Expo environment values are embedded at build time.

## Verification

- Admin dashboard displays `Live Socket Connected` after login.
- Open the same ticket in the customer app and agent dashboard.
- Send a message from either side. It should appear immediately in the other conversation without refreshing.
- Disconnect/reconnect one client; the open conversation should resync from persisted history.
- If a message write succeeds but the peer is offline, it remains in the ticket history and appears on reconnect.

Never commit `.env` files or paste secrets into logs/chat. Rotate credentials previously exposed in the workspace and update them in the hosting providers.
