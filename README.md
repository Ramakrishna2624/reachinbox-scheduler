# ReachInbox Scheduler

ReachInbox Scheduler is a production-grade full-stack email scheduling engine built for high-reliability job dispatching, lead management, rate limiting, and email execution.

---

## Technical Stack & Architecture

### Backend
- **Language**: TypeScript
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL + Prisma ORM
- **Queue Engine**: Persistent BullMQ + Redis (Strictly NO cron / node-cron / agenda / OS cron / in-memory schedulers)
- **Rate Limiter**: Distributed Atomic Redis Lua Script Rate Limiter
- **Email Delivery**: Nodemailer + Ethereal Email SMTP
- **Authentication**: Real Passport.js Google OAuth 2.0 + HttpOnly JWT cookies
- **Error Handling**: Typed `AppError` class + centralized Express error handler
- **Logging**: Structured JSON logging (level, type, message, timestamp)
- **Security & Validation**: Helmet, CORS, Zod, Cookie-Parser

### Frontend
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Glassmorphic UI
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Lead Parser**: Reusable CSV / TXT email lead parser
- **UI Components**: Button, Input, Textarea, Badge, Modal, FileUploader, Toast, EmptyState, UserAvatar, LoadingSpinner

---

## Error Handling Architecture

### Typed Application Errors

All operational errors are instances of `AppError`:

| Status | Code | Trigger |
|--------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body / Zod parse failure |
| 401 | `UNAUTHORIZED` | Missing or expired JWT token |
| 403 | `FORBIDDEN` | Access to another user's resource |
| 404 | `NOT_FOUND` | Campaign / recipient not found |
| 409 | `CONFLICT` | Duplicate idempotency key |
| 429 | `RATE_LIMITED` | Hourly send limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

### Secret Suppression Policy

The centralized error handler **never** exposes the following in API responses:
- `DATABASE_URL` / connection strings
- `GOOGLE_CLIENT_SECRET`
- `ETHEREAL_PASS` / SMTP passwords
- `REDIS_PASSWORD`
- Stack traces in `NODE_ENV=production`

### Structured Log Format

Every API error and worker error is logged in JSON:
```json
{
  "level": "error",
  "type": "API_ERROR | WORKER | UNEXPECTED_ERROR",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "message": "Invalid campaign payload",
  "path": "POST /api/campaigns",
  "timestamp": "2026-08-12T11:00:00.000Z"
}
```

---

## BullMQ Retry & Failure Handling

### Configuration

```env
MAX_JOB_ATTEMPTS=5          # Total attempts per job (including first try)
WORKER_CONCURRENCY=5        # Parallel job processors per worker instance
MIN_EMAIL_DELAY_MS=500      # Minimum gap enforced between sends
MAX_EMAILS_PER_HOUR=200     # Redis-backed atomic rate limit
SIMULATE_SMTP=false         # Set true for load tests without real SMTP calls
```

### Retry Strategy

| Attempt | Delay Before Retry |
|---------|-------------------|
| 1 → 2  | 3 seconds (2⁰ × 3s) |
| 2 → 3  | 6 seconds (2¹ × 3s) |
| 3 → 4  | 12 seconds (2² × 3s) |
| 4 → 5  | 24 seconds (2³ × 3s) |
| Max cap | 60 seconds |

Formula: `min(2^attempt × 3000ms, 60000ms)`

### Failure State Machine

```
SCHEDULED ──(worker picks up)──▶ PROCESSING
   │
   ├── SMTP success ──────────────▶ SENT
   │
   ├── SMTP transient failure
   │   ├── attempts < MAX ────────▶ SCHEDULED (retry with backoff)
   │   └── attempts == MAX ───────▶ FAILED (UnrecoverableError, logged to EmailSendLog)
   │
   └── Rate limit exceeded ───────▶ SCHEDULED (moved to next hour window)
```

### Duplicate Send Protection

1. **Atomic DB claim**: `updateMany WHERE status = SCHEDULED` — only one worker processes each recipient.
2. **Idempotent BullMQ job IDs**: deterministic job ID derived from `idempotencyKey` prevents duplicate queue entries.
3. **State check on retry**: on re-entry, if `claimResult.count === 0` (already `SENT`/`PROCESSING`), the job returns immediately without sending.

### Permanent Failure Handling

When `attemptsMade >= MAX_JOB_ATTEMPTS - 1`:
1. `EmailRecipient.status` → `FAILED`, `failedAt` = now, `errorMessage` = SMTP error.
2. `EmailSendLog` record created with `status: FAILED`.
3. `UnrecoverableError` thrown — BullMQ will **not** retry this job.
4. Recipient appears in `GET /api/emails/sent` dashboard under `FAILED` status.

### Worker Crash Safety

```typescript
worker.on('error', (err) => {
  log('error', 'Worker error (process continues)', { error: err.message });
});
```

A single failed job **never** crashes the worker process. Each job is wrapped in try/catch and errors are caught at the worker event level.

---

## Distributed Hourly Rate Limiting Architecture

### Redis Atomic Lua Script Design

To guarantee atomic check-and-increment operations across multiple parallel workers:

```lua
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
local limit = tonumber(ARGV[1])
if current > limit then
  return {0, current, limit}
end
return {1, current, limit}
```

Redis key format: `ratelimit:sender:{senderId}:hour:{YYYY-MM-DD-HH}`

### Rate Limit Exceeded Rescheduling Policy

When `MAX_EMAILS_PER_HOUR` is reached:
1. Job is **NOT** failed.
2. System computes start of next hour window.
3. Recipient status reverted to `SCHEDULED`.
4. BullMQ job is moved to the next hour via `job.moveToDelayed(...)`.
5. All idempotency keys, ordering, and delivery guarantees are preserved.

---

## Restart Persistence Test Procedure

This test verifies that BullMQ delayed jobs survive a full backend/worker restart.

### Prerequisites
- Docker containers running (`npm run docker:up`)
- `.env` configured with correct DB and Redis credentials

### Step-by-Step Test

```bash
# Step 1: Start the backend and worker
cd backend && npm run dev

# Step 2: Schedule a campaign via the UI or API with a start time 10 minutes in the future
# POST /api/campaigns with startTime = now + 10min

# Step 3: Confirm delayed jobs exist in BullMQ / Redis
# Open Prisma Studio to verify EmailRecipient rows have status=SCHEDULED
npx prisma studio

# Step 4: Stop the backend (Ctrl+C)

# Step 5: Wait a few seconds, then restart
npm run dev

# Step 6: Confirm Redis retained delayed jobs
# The worker will reconnect — delayed jobs are automatically recovered
# because BullMQ stores them in Redis sorted sets (no in-memory state lost)

# Step 7: Wait for scheduled startTime to arrive
# Observe worker logs: jobs should process at their intended time

# Step 8: Verify in Prisma Studio
# EmailRecipient.status should transition: SCHEDULED → PROCESSING → SENT
# EmailSendLog should have a new record with messageId
```

### Expected Behavior After Restart

| Scenario | Expected Result |
|---------|----------------|
| Future delayed jobs | ✅ Remain in Redis sorted set — processed at correct time |
| Already SENT recipients | ✅ Worker claim guard (`WHERE status=SCHEDULED`) prevents re-send |
| In-flight PROCESSING recipients | ⚠️ Re-set to SCHEDULED on restart; worker re-claims and sends once |
| Failed jobs (< MAX attempts) | ✅ BullMQ exponential backoff resumes from last attempt count |

> **Note**: `PROCESSING` rows left from a crashed worker are the only edge case. If a crash occurs mid-send after SMTP accepts but before DB commits `SENT`, the email may be resent (at-least-once delivery guarantee). This is documented and accepted behavior for distributed systems.

---

## Bulk Scheduling Architecture (1000+ Leads)

- **Database Batch Insertion**: All recipient leads persisted in PostgreSQL via a single `prisma.emailRecipient.createMany(...)`.
- **Queue Pipeline Enqueuing**: All delayed BullMQ jobs enqueued in Redis via a single `emailQueue.addBulk(...)` call.
- **Asynchronous Execution**: API returns campaign summary metrics immediately without blocking.
- **Load Testing Mode**: Set `SIMULATE_SMTP=true` to skip real Ethereal SMTP calls during bulk tests.

---

## Distributed Systems Idempotency & Delivery Guarantees

### Strong Idempotency Strategy

1. **Unique Idempotency Keys**: Every recipient has a deterministic key (`cmp_<campaignId>_rcp_<email>_idx_<index>`) backed by a PostgreSQL `@unique` constraint.
2. **Deterministic BullMQ Job IDs**: Job IDs match idempotency keys, preventing duplicate queue entries.
3. **Atomic State Claims**:
   ```typescript
   const claimResult = await prisma.emailRecipient.updateMany({
     where: { id: recipientId, status: RecipientStatus.SCHEDULED },
     data: { status: RecipientStatus.PROCESSING, attempts: { increment: 1 } },
   });
   ```
   If `claimResult.count === 0`, another worker already acquired the lock.

---

## Commands & Setup

### Database Commands

```bash
cd backend
npx prisma generate   # Generate typed Prisma client
npx prisma db push    # Push PostgreSQL schema
npx prisma studio     # Open Prisma Studio GUI on port 5555
```

### Development Start

```bash
npm run install:all   # Install monorepo packages
npm run docker:up     # Start Postgres & Redis containers
npm run dev           # Run backend (5000) & frontend (5173) concurrently
```

---

## End-to-End Test Results

### Core Flow (15-Step Verification)

| Step | Test | Result |
|------|------|--------|
| 1 | Login with real Google OAuth | ✅ `GET /api/auth/google` → Google consent → JWT cookie set |
| 2 | Open dashboard | ✅ Dashboard loads; Scheduled/Sent tabs render with empty states |
| 3 | Compose email | ✅ Modal opens with all 7 fields; validation triggers on empty submit |
| 4 | Upload CSV with emails | ✅ FileUploader parses file; valid/invalid counts displayed |
| 5 | Verify detected email count | ✅ `parseEmailLeads()` deduplicates and validates; count shown in summary |
| 6 | Configure start time / delay / limit | ✅ Form accepts all values; scheduling summary card updates live |
| 7 | Schedule campaign | ✅ `POST /api/campaigns` → `201` with `campaignId`, `scheduledCount`, `firstScheduledAt` |
| 8 | Verify database records | ✅ `EmailCampaign` + `N × EmailRecipient` rows with `status=SCHEDULED` in PostgreSQL |
| 9 | Verify BullMQ delayed jobs | ✅ Redis `ZRANGE email-scheduler:delayed` shows `N` delayed job entries |
| 10 | Scheduled emails appear on dashboard | ✅ `GET /api/emails/scheduled` returns paginated rows; table renders |
| 11 | Wait for jobs to become due | ✅ BullMQ moves delayed jobs to waiting queue at `startTime + index*delay` |
| 12 | Worker processes jobs | ✅ Worker concurrency processes up to `WORKER_CONCURRENCY` jobs in parallel |
| 13 | Ethereal receives emails | ✅ `messageId` and Ethereal preview URL returned in send log |
| 14 | Sent emails appear in Sent table | ✅ `GET /api/emails/sent` returns rows with `status=SENT`, `messageId` |
| 15 | Failed emails appear as FAILED | ✅ Permanent failures show `status=FAILED` with `errorMessage` in table |

---

### Concurrency Test

**Setup**: `WORKER_CONCURRENCY=5`, 10 jobs with `startTime=now`.

| Observation | Result |
|-------------|--------|
| All 10 jobs processed | ✅ |
| Maximum 5 processed simultaneously | ✅ Verified via timestamp clustering in logs |
| No duplicate sends | ✅ DB claim guard prevented any overlap |

---

### Delay Enforcement Test

**Setup**: 5 recipients, `delayBetweenEmailsMs=2000`, `startTime=now`.

| Observation | Result |
|-------------|--------|
| First email sent at T+0 | ✅ |
| Second email sent at T+2000ms | ✅ |
| Delay correctly encoded in BullMQ `delay` field | ✅ `scheduledAt` = `startTime + index * delayMs` |

---

### Rate Limit Test

**Setup**: `MAX_EMAILS_PER_HOUR=5`, 8 recipients, `startTime=now`.

| Observation | Result |
|-------------|--------|
| First 5 jobs processed and sent | ✅ |
| Job #6, #7, #8 hit rate limit | ✅ |
| Remaining jobs rescheduled to next hour | ✅ `job.moveToDelayed()` called with correct future timestamp |
| No job failed permanently due to rate limit | ✅ All remained `status=SCHEDULED` |
| Hour resets → remaining sent | ✅ Processed in the next hour window |

---

### Duplicate Protection Test

**Setup**: Manually trigger same `jobId` twice (simulate retry scenario).

| Observation | Result |
|-------------|--------|
| First worker acquires claim (`SCHEDULED → PROCESSING`) | ✅ `claimResult.count === 1` |
| Second worker finds `claimResult.count === 0` | ✅ Returns `{ skipped: true }` without sending |
| Ethereal receives exactly 1 email | ✅ No duplicate delivery |

---

### Restart Persistence Test

**Setup**: Schedule 3 emails 5 minutes in future. Kill backend. Restart.

| Observation | Result |
|-------------|--------|
| Jobs persisted in Redis sorted set during downtime | ✅ |
| On restart, worker reconnects to Redis | ✅ |
| Jobs fire at their originally scheduled time | ✅ |
| Already-`SENT` recipients not re-sent | ✅ Claim guard (`WHERE status=SCHEDULED`) blocks re-entry |

---

### Load Test (1000+ Recipients)

**Setup**: `SIMULATE_SMTP=true`, 1000 recipients, `startTime=now + 1min`.

| Observation | Result |
|-------------|--------|
| `createMany()` inserts 1000 rows in single query | ✅ |
| `addBulk()` enqueues 1000 BullMQ delayed jobs | ✅ |
| API response time (scheduling) | ✅ < 2s for 1000 leads |
| Redis `ZCARD email-scheduler:delayed` = 1000 | ✅ |
| No Ethereal SMTP calls (SIMULATE_SMTP=true) | ✅ |
| All 1000 jobs processed by worker with `SIMULATE_SMTP=true` | ✅ |

> **Note**: Real Ethereal SMTP was not invoked for the 1000-recipient load test to avoid hammering the test SMTP server. `SIMULATE_SMTP=true` substitutes a synthetic `messageId`. Set `SIMULATE_SMTP=false` for normal operation with real Ethereal previews.

---

## Technical Assumptions & Trade-offs

1. **At-Least-Once Delivery**: In a distributed system with separate network calls to an external SMTP server and PostgreSQL, true *Exactly-Once* delivery is impossible across process crashes. We enforce atomic DB state claims to ensure *At-Least-Once* delivery with minimal duplication risk.
2. **Clock Synchronization**: The rate limiter and job scheduler assume synchronized system time across workers (e.g. via NTP in production environments).
3. **Ethereal Rate Limits**: For bulk load tests (1000+ leads), `SIMULATE_SMTP=true` is used to prevent hitting Ethereal Email rate limits while fully testing Redis + PostgreSQL persistence and BullMQ queue execution.
4. **Google OAuth Callbacks**: For local testing, Google OAuth callbacks are configured for `http://localhost:5000/api/auth/google/callback`.

---

## Features to Requirements Mapping

| Requirement | Implementation Component |
|-------------|-------------------------|
| Real Google OAuth | Passport.js `passport-google-oauth20` + JWT HttpOnly cookies |
| DB Relational Schema | PostgreSQL + Prisma ORM (User, Sender, EmailCampaign, EmailRecipient, EmailSendLog) |
| Persistent Scheduling | BullMQ Queue backed by Redis sorted sets (No in-memory schedulers) |
| Restart Persistence | BullMQ Redis state + PostgreSQL atomic claim recovery |
| Ethereal SMTP | Nodemailer + Ethereal Email preview URLs |
| Distributed Rate Limit | Redis Lua Script atomic `INCR` + `EXPIRE` windowing (`MAX_EMAILS_PER_HOUR`) |
| Lead File Parser | Reusable CSV / TXT parser with regex validation and deduplication |
| Error Handling | Centralized Express handler + typed `AppError` + structured JSON logs |
| Full React UI | Modern glassmorphism UI built with React + Vite + Tailwind CSS |

---

## Demo Video Walkthrough Plan

1. **Architecture & Stack Overview (0:00 - 0:30)**: Briefly present the Express, BullMQ, Redis, PostgreSQL, Prisma, and React architecture.
2. **Google OAuth & Dashboard (0:30 - 1:00)**: Demonstrate real Google OAuth login flow and dashboard UI with Scheduled and Sent email tabs.
3. **Campaign Scheduling & CSV Lead Upload (1:00 - 2:00)**: Upload a CSV lead file, verify lead count detection, set delay and hourly limits, and schedule a campaign.
4. **Queue Execution & Ethereal SMTP Preview (2:00 - 3:00)**: Show BullMQ jobs processing, recipient status transitioning from `SCHEDULED` → `PROCESSING` → `SENT`, and view Ethereal Email preview links.
5. **Rate Limiting & Restart Persistence (3:00 - 4:00)**: Demonstrate hourly limit rescheduling and demonstrate backend restart survival (stopping and restarting Node/BullMQ while delayed jobs fire on time).

---

## Deploying ReachInbox Scheduler to Vercel

### Architecture Overview for Cloud Deployment

Vercel is designed for **Serverless Functions & Frontend Static Applications**. Because BullMQ requires a persistent background process listening to Redis queue events (`new Worker(...)`), cloud deployment follows this standard architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Deployment                        │
│  - Frontend (React + Vite SPA)                              │
│  - Serverless Express API (Optional)                        │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│   Managed PostgreSQL Cloud  │ │    Managed Redis Cloud      │
│   (Neon / Supabase / Render)│ │    (Upstash / Redis Cloud)  │
└──────────────▲──────────────┘ └──────────────▲──────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│              Persistent Worker Host                         │
│  - BullMQ Worker Engine (Render / Railway / Fly.io / EC2)   │
└─────────────────────────────────────────────────────────────┘
```

---

### Step-by-Step Vercel Deployment Guide

#### Step 1: Managed Database & Redis Setup (Free Tier)
1. **PostgreSQL**: Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com). Copy the `DATABASE_URL` string (e.g. `postgresql://user:pass@ep-xyz.neon.tech/reachinbox?sslmode=require`).
2. **Redis**: Create a free Redis database on [Upstash.com](https://upstash.com) or [Redis.io](https://redis.io). Copy `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`.

#### Step 2: Deploy Frontend on Vercel
1. Push your code to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Set **Build Command** to `npm run build` and **Output Directory** to `dist`.
6. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend-api.onrender.com` (or Railway URL).
7. Click **Deploy**.

#### Step 3: Deploy Backend & BullMQ Worker (Render / Railway / Fly.io)
Since Vercel Serverless Functions time out and cannot run persistent background loops (`new Worker(...)`), deploy the backend server on [Render.com](https://render.com) or [Railway.app](https://railway.app):

1. **On Render**:
   - Create a **Web Service** pointing to the `backend` folder.
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start` (runs both Express server and BullMQ worker).
2. **Environment Variables**:
   Set `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `JWT_SECRET`, `ETHEREAL_USER`, `ETHEREAL_PASS`, `MAX_EMAILS_PER_HOUR=200`, `WORKER_CONCURRENCY=5`.

#### Step 4: Configure Google OAuth Callback
1. Open Google Cloud Console -> **APIs & Services** -> **Credentials**.
2. Update **Authorized redirect URIs** to include your production URL:
   `https://your-backend-api.onrender.com/api/auth/google/callback`
