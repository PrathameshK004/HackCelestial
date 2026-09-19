# GroupTrip Ledger (HackCelestial) — Enterprise Production Architecture

**System Architecture & Engineering Specification**  
**Classification:** Production-Ready, High-Concurrency Distributed System Architecture  
**Target Scale:** 1M+ Monthly Active Travelers, 100K+ Concurrent Trips, Sub-50ms Ledger Recalculations  

---

## 1. Executive Summary & Production Vision

GroupTrip Ledger is an event-driven, distributed financial coordination platform for multi-vendor group travel. While the MVP established the fundamental domain model (the itinerary as the ledger's single source of truth), operating at production scale requires:
1. **Financial Strictness & Zero Race Conditions:** Using distributed locks (Redlock) and idempotency keys to ensure financial consistency during concurrent expense entry and mid-trip participant modifications.
2. **Event-Driven Recalculation Engine:** Decoupling heavy financial recalculations and debt-simplification graph algorithms from HTTP request/response lifecycles using **Apache Kafka**.
3. **Sub-Millisecond Read Latency & Distributed Caching:** Using **Redis** for cluster-wide caching, session state, sliding-window rate limiting, and temporary state aggregation.
4. **Real-Time Live Collaboration & Push Notifications:** Leveraging **Socket.io** backed by **Redis Pub/Sub adapter** to broadcast instant balance changes, expense additions, and UPI payment settlements across all connected trip members.
5. **Observability, Resilience & Scalability:** Kubernetes (EKS/GKE) container orchestration with horizontal pod autoscalers (HPA), PostgreSQL with PgBouncer connection pooling, read replicas, and distributed tracing.

---

## 2. High-Level Production Architecture Diagram

```
                                      ┌──────────────────────────────────────────────┐
                                      │              CLIENT APPLICATIONS             │
                                      │  • Web App (React 18 + Vite + TypeScript PWA)│
                                      │  • Mobile Apps (Android / iOS via Capacitor) │
                                      └──────────────────────┬───────────────────────┘
                                                             │
                                   HTTPS / WSS (TLS 1.3)     │ CDN (Cloudflare / CloudFront)
                                                             ▼
                                      ┌──────────────────────────────────────────────┐
                                      │          EDGE & API GATEWAY LAYER            │
                                      │      (Kong / Envoy / Nginx Ingress)          │
                                      │  • SSL Termination & DDOS Shield             │
                                      │  • Global Rate Limiting (Redis Token Bucket) │
                                      │  • JWT Validation & Edge Routing             │
                                      └──────────────┬───────────────────────────────┘
                                                     │
                     ┌───────────────────────────────┴───────────────────────────────┐
                     │                                                               │
                     ▼ REST / GraphQL (Port 4000)                                    ▼ WebSocket / WSS (Port 4001)
     ┌───────────────────────────────────────────────┐               ┌───────────────────────────────────────────────┐
     │           CORE API CLUSTER (Node.js)          │               │         REAL-TIME NOTIFICATION CLUSTER        │
     │      (Scalable K8s Pods / Stateless)          │               │        (Socket.io Stateful Gateway Pods)      │
     │  • Auth & User Management                     │               │  • Live Room Subscriptions (trip:{groupId})   │
     │  • Trip & Booking Management                  │               │  • Real-Time Ledger Diff Broadcasts           │
     │  • Expense Ingestion & Idempotency Check      │               │  • UPI Settlement Confirmations               │
     │  • Distributed Lock Manager (Redlock)         │               │  • Push Alerts (FCM / APNs Bridge)            │
     └───────┬───────────────────────┬───────────────┘               └───────────────────────▲───────────────────────┘
             │                       │                                                       │
             │ Read/Write            │ Cache / Lock                                          │ Socket.io Redis Adapter
             ▼                       ▼                                                       ▼
┌─────────────────────────┐  ┌────────────────────────────────────────────────────────────────────────────────────────┐
│     POSTGRESQL CLUSTER  │  │                                REDIS ENTERPRISE CLUSTER                                │
│ (AWS Aurora / Neon PG)  │  │  • L1/L2 Query Cache (TTL 5m-1h)         • Socket.io Redis Pub/Sub Stream Engine        │
│ • Primary: Write Master │  │  • Redlock Distributed Mutex (Ledger)    • Rate Limiting & Session Token Blacklists     │
│ • Read Replicas (x3)    │  │  • Idempotency Store (TTL 24h)           • Real-time Hot-Trip In-Memory Balances        │
│ • PgBouncer Poolers     │  └────────────────────────────────────────────────────────────────────────────────────────┘
└────────────┬────────────┘
             │ Change Data Capture (Debezium)
             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       APACHE KAFKA EVENT STREAMING BACKBONE                                         │
│   Topics:                                                                                                           │
│   • `trip.expense.created`    • `trip.member.changed`     • `trip.settlement.recorded`    • `notification.dispatch` │
│   • `trip.recalculate.request`• `ledger.audit.stream`     • `payment.webhook.events`      • `dlq.failed.events`     │
└──────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┘
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                ▼                                                                     ▼
┌───────────────────────────────────────────────┐                     ┌───────────────────────────────────────────────┐
│     LEDGER RECALCULATION CONSUMER WORKERS     │                     │     NOTIFICATION & INTEGRATION CONSUMERS      │
│  • 5 Cost-Sharing Parallel Split Engines      │                     │  • Socket.io Relay (Emits to Redis Pub/Sub)   │
│  • Min-Cash-Flow Graph Solver                 │                     │  • Push Notification Engine (FCM / APNs)      │
│  • Change Diff Compute & Audit Event Emitter  │                     │  • Transactional Email & SMS (SendGrid/Twilio)│
│  • Writes Settled State to Read DB & Redis    │                     │  • Webhook Dispatcher (Vendor APIs / Banks)   │
└───────────────────────────────────────────────┘                     └───────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Enterprise Component Catalog

| Tier | Current Stack (MVP) | Enterprise Production Stack | Architectural Purpose & Value Added |
|---|---|---|---|
| **Client / Mobile** | React 18, Vite 6, Capacitor 7 Android | React 18, Capacitor 7 (iOS + Android), Workbox PWA | Offline-first sync, native UPI deep links, biometrics |
| **API Gateway** | Express built-in routing | Kong Gateway / Envoy Proxy | TLS 1.3 termination, centralized rate limiting, circuit breaking |
| **Backend Services** | Node.js 20, Express 5.1 | Node.js 20 / TypeScript Microservices (K8s) | Stateless horizontal auto-scaling, domain-driven boundaries |
| **Real-Time Layer** | Polling / Request-Response | **Socket.io + `@socket.io/redis-adapter`** | Instant bi-directional ledger push, zero client polling |
| **In-Memory & Caching** | None (Direct DB queries) | **Redis 7 Cluster (Redis Sentinel/Cluster)** | Distributed locking (Redlock), query cache, token revocation |
| **Message Streaming** | None (Synchronous calls) | **Apache Kafka (Confluent / MSK)** | Event sourcing, asynchronous financial recalculation, DLQ |
| **Relational Database** | Single PostgreSQL (Neon) | **AWS Aurora PostgreSQL + PgBouncer** | 1 Primary Write Master + 3 Read Replicas, connection pooling |
| **Storage & Media** | Local filesystem | **AWS S3 / Cloudflare R2 + CDN** | Encrypted storage for receipts, invoices, bills, trip covers |
| **Receipt OCR & AI** | Manual bill entry | **AWS Textract / Gemini Vision API** | Automated multi-item receipt scanning and split suggestion |
| **CI/CD & DevOps** | Jenkins, local Dockerfiles | **GitHub Actions / ArgoCD / Helm on K8s** | GitOps continuous deployment, canary releases, zero downtime |
| **Observability** | Console logs | **OpenTelemetry, Prometheus, Grafana, Loki** | Distributed APM tracing, p99 latency alerts, audit metrics |

---

## 4. Key Production System Architectures

### 4.1 Redis Distributed Caching & Locking Strategy

In a multi-traveler environment, concurrent modifications (e.g., Alice adds a dinner expense while Bob marks a cab ride paid and Charlie leaves the trip) can lead to race conditions and inconsistent net balances.

#### 1. Distributed Concurrency Lock (Redlock)
Every financial recalculation is guarded by a distributed mutex on Redis:
- **Lock Key:** `lock:trip:{groupId}:recalculate`
- **Lock Acquisition:** `SET lock:trip:{groupId}:recalculate {token} NX PX 5000`
- **Guarantee:** Exactly one recalculation worker mutates the ledger for a specific trip at any given millisecond. Concurrent requests queue into Kafka.

#### 2. Tiered Caching Hierarchy
- **L1 Cache (In-Memory Micro-Cache):** 2-second in-memory LRU cache inside each Node.js process for hot trip metadata.
- **L2 Cache (Redis Cluster):**
  - `cache:trip:{groupId}:summary` (TTL: 10 minutes, invalidated on expense/settlement mutation).
  - `cache:trip:{groupId}:ledger` (Precomputed Net Balances + Min-Cash-Flow graph routes).
  - `cache:user:{userId}:profile` (User details, avatar, UPI IDs; TTL: 1 hour).
  - `idempotency:{idempotencyKey}` (Ensures duplicate HTTP requests from shaky mobile networks never bill twice; TTL: 24 hours).

---

### 4.2 Apache Kafka Event Streaming Backbone

Instead of recalculating the entire trip ledger within the client's synchronous HTTP `POST /expenses` request, the API delegates all state mutations into Kafka topics.

```
[Client] ──── POST /api/groups/:id/expenses ───► [API Gateway / Express]
                                                          │
                                         1. Validate & Store Pending Event (PG)
                                         2. Publish Event to Kafka
                                                          ▼
                                      ┌───────────────────────────────────────┐
                                      │ TOPIC: `trip.expense.created`         │
                                      │ Key: `groupId` (Partition Key)        │
                                      └───────────────────┬───────────────────┘
                                                          │
                                                          ▼
                                      ┌───────────────────────────────────────┐
                                      │ LEDGER WORKER POOL (Consumer Group)   │
                                      │ • Acquires Redlock for `groupId`      │
                                      │ • Runs 5-Model Expense Splitter       │
                                      │ • Recomputes Net Balances             │
                                      │ • Solves Min-Cash-Flow Graph          │
                                      │ • Commits Snapshot to PG              │
                                      │ • Invalidate Redis Cache              │
                                      └───────────────────┬───────────────────┘
                                                          │
                       ┌──────────────────────────────────┴──────────────────────────────────┐
                       ▼                                                                     ▼
    ┌─────────────────────────────────────┐                               ┌─────────────────────────────────────┐
    │ TOPIC: `notification.dispatch`      │                               │ TOPIC: `ledger.audit.stream`        │
    │ Payload: { groupId, changeDiff }    │                               │ Payload: { immutableAuditLogEntry } │
    └──────────────────┬──────────────────┘                               └──────────────────┬──────────────────┘
                       │                                                                     │
                       ▼                                                                     ▼
    ┌─────────────────────────────────────┐                               ┌─────────────────────────────────────┐
    │ REAL-TIME RELAY CONSUMER            │                               │ COMPLIANCE & ANALYTICS SINK         │
    │ Emits to Redis Pub/Sub Channel      │                               │ Writes to S3 Data Lake / BigQuery   │
    │ -> Socket.io pushes to mobile apps! │                               │ for tax, fraud, & analytical reporting│
    └─────────────────────────────────────┘                               └─────────────────────────────────────┘
```

#### Kafka Topic Architecture
- **`trip.expense.created` / `modified` / `deleted`**: Partitioned by `groupId` so all transactions for a single trip land on the same consumer partition in chronological order.
- **`trip.settlement.recorded`**: Peer-to-peer settle-ups via UPI or cash.
- **`trip.member.changed`**: Triggered when a participant joins or drops out mid-trip, initiating prorated cost recalculation.
- **`notification.dispatch`**: Consumed by the push and email notification service.
- **`dead-letter-queue (DLQ)`**: Captures malformed calculation errors for automated retry with exponential backoff and engineer alert via PagerDuty.

---

### 4.3 Real-Time WebSockets & Push Notifications (Socket.io)

```
                       ┌──────────────────────────────────────────────┐
                       │           CLIENT WEB & MOBILE APPS           │
                       │   Socket.io Client connected to WSS Gateway  │
                       └──────────────▲────────────────▲──────────────┘
                                      │                │
                             WebSocket Connection    WebSocket Connection
                                      │                │
                       ┌──────────────┴───┐        ┌───┴──────────────┐
                       │ Socket.io Node 1 │        │ Socket.io Node 2 │
                       └──────────────┬───┘        └───┬──────────────┘
                                      │                │
                                      ▼                ▼
                       ┌──────────────────────────────────────────────┐
                       │          REDIS PUB/SUB ADAPTER STREAM        │
                       │        `redis.subscribe("trip:*")`           │
                       └──────────────────────▲───────────────────────┘
                                              │
                                              │ Publishes new balance diff
                               ┌──────────────┴──────────────┐
                               │ Ledger Recalculation Worker │
                               └─────────────────────────────┘
```

#### Real-Time Event Matrix
1. **`trip:join-room`**: Client joins dynamic room `trip:{groupId}` upon opening the trip screen.
2. **`expense:added`**: Pushes the new expense card to all active screens without page refresh.
3. **`ledger:rebalanced`**: Broadcasts the updated individual share, net balance changes, and the recalculated debt simplification plan.
4. **`settlement:confirmed`**: Instant green checkmark animation displayed when a peer receives a UPI settlement.
5. **Background Push Fallback:** If a user is not actively connected via WebSocket, the Notification Worker routes the event to **Firebase Cloud Messaging (FCM)** for Android and **Apple Push Notification service (APNs)** for iOS.

---

### 4.4 End-to-End Fault Tolerance & Idempotency Pipeline

In financial systems, network drops during mobile payments frequently result in repeated clicks or retried requests.

```
Client App                           API Gateway & Backend                       PostgreSQL & Redis
    │                                          │                                          │
    │── POST /api/payments/record ────────────►│                                          │
    │   Headers:                               │                                          │
    │   X-Idempotency-Key: uuid-v4             │                                          │
    │                                          │── 1. Check Redis for Idempotency Key ───►│
    │                                          │◄─ 2. Key Not Found (New Request) ────────│
    │                                          │── 3. SET idempotency:key "PROCESSING" ──►│
    │                                          │                                          │
    │                                          │── 4. BEGIN DB Transaction ──────────────►│
    │                                          │   • Insert Expense / Settlement          │
    │                                          │   • Commit Transaction                   │
    │                                          │                                          │
    │                                          │── 5. SET idempotency:key "COMPLETED" ───►│
    │                                          │      with cached response payload        │
    │                                          │                                          │
    │◄─ 201 Created (Success Response) ────────│                                          │
    │                                          │                                          │
    │   (Network fails; Client retries)        │                                          │
    │── POST /api/payments/record (RETRY) ────►│                                          │
    │   X-Idempotency-Key: uuid-v4             │── 6. Check Redis for Idempotency Key ───►│
    │                                          │◄─ 7. Found "COMPLETED" + Cached JSON ────│
    │◄─ 200 OK (Instant Cached Response) ──────│                                          │
    │   (Zero double-charging!)                │                                          │
```

---

### 4.5 Production Database Schema & Sharding Strategy

For large-scale operations, PostgreSQL is configured with:
- **Connection Pooling:** **PgBouncer** in transaction pooling mode handling up to 10,000 idle client connections while keeping PostgreSQL backend connections under 200.
- **Table Partitioning:** The high-volume tables (`expenses`, `expense_splits`, `settlements`, `ledger_audit_log`) are **range-partitioned by `created_at`** (monthly partitions) or **hash-partitioned by `group_id`**.
- **Read/Write Splitting:** Read operations (`GET /groups/:id/expenses`, `GET /groups/:id/audit-log`) are routed via connection string to Read Replicas, offloading the Primary Master for writes.

---

### 4.6 Kubernetes Production Deployment Topology

```yaml
# Conceptual Kubernetes Microservices Architecture
Namespaces:
  - grouptrip-production:
      Ingress:
        - Host: api.grouptripledger.com -> Kong Ingress Controller
        - Host: ws.grouptripledger.com  -> Socket.io Ingress (Sticky Sessions enabled)
      Deployments:
        - api-core-deployment:
            Replicas: 4-20 (HPA based on CPU 70% / HTTP RPS)
        - socketio-realtime-deployment:
            Replicas: 3-10 (HPA based on WebSocket connection count)
        - ledger-worker-deployment:
            Replicas: 4-16 (KEDA Autoscaling based on Kafka consumer lag)
        - notification-worker-deployment:
            Replicas: 2-8
      StatefulSets:
        - redis-cluster: 3 Masters + 3 Replicas
  - data-platform:
      - Kafka Cluster (Strimzi Operator / Confluent)
      - PgBouncer Poolers
```

---

## 5. Security, Compliance & Observability

1. **Zero-Trust Financial Auditing:**
   - Cryptographic hashing of every audit entry linking to the previous entry hash (Merkle chain), preventing database tampering or manual ledger edits.
2. **PCI-DSS & UPI Compliance:**
   - The platform never stores debit/credit card numbers or UPI PINs. All payments are initiated via standard NPCI `upi://` deep link protocols or verified payment gateway webhooks with HMAC-SHA256 signature verification.
3. **Observability Stack:**
   - **Metrics:** Prometheus scrapes Node.js processes, Redis, Kafka lag, and PostgreSQL connection pool stats.
   - **Visualization:** Grafana dashboards displaying Recalculation p95/p99 Latency, Active WebSocket Connections, Kafka Consumer Lag, and API RPS.
   - **Tracing:** OpenTelemetry instrumentation across API $\to$ Kafka $\to$ Worker $\to$ DB for complete distributed transaction visibility.

---

## 6. Implementation Roadmap: From MVP to Enterprise

| Phase | Milestone | Key Architectural Deliverables |
|---|---|---|
| **Phase 1 (Done)** | **Core Engine & MVP** | PostgreSQL schema, 5 split models, Min-Cash-Flow graph algorithm, Capacitor Android UPI plugin. |
| **Phase 2 (Immediate)** | **Redis & Real-Time Sync** | Deploy Redis, implement Redlock for ledger mutations, integrate Socket.io for live updates. |
| **Phase 3** | **Kafka Event Streaming** | Decouple recalculation engine into Kafka consumer worker, establish dead-letter queues. |
| **Phase 4** | **Kubernetes & Cloud Scale** | Containerize with Helm charts, configure Kong API Gateway, deploy PgBouncer connection pooling. |
| **Phase 5** | **AI Receipt OCR & Global FX** | Textract/Vision OCR receipt scanning, multi-currency live exchange rate conversion engine. |
