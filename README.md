# Nexachain - Investment & Referral Platform (MERN)

Backend API, business logic, daily ROI scheduler and a React dashboard for an
investment + multi-level referral platform. Built for the Nexachain AI MERN
Stack Developer Technical Assessment.

```
.
├── backend/     Node.js + Express + Mongoose API, ROI/level-income services, node-cron scheduler
│   ├── src/models        Task 1 - Mongoose schemas (User, Investment, LevelIncome, RoiHistory, JobRun)
│   ├── src/routes|controllers|validations   Task 2 - REST API (JWT protected)
│   ├── src/services      Task 3 - business logic (roi.service.js, levelIncome.service.js, ...)
│   ├── src/cron          Task 5 - node-cron scheduler (idempotent daily ROI)
│   ├── src/scripts       seed.js, runRoi.js, testIdempotency.js
│   └── postman/          Postman collection with sample requests/responses
└── frontend/    Task 4 - React (Vite) dashboard
```

## Submission checklist

| # | Deliverable | Where |
|---|-------------|-------|
| 1 | GitHub repository link | https://github.com/PatilIsha/NEXACHAINAI |
| 2 | Database schema files | [backend/src/models/](backend/src/models/) - User, Investment, LevelIncome, RoiHistory, JobRun |
| 3 | API source code | [backend/src/routes/](backend/src/routes/), [controllers/](backend/src/controllers/), [validations/](backend/src/validations/), [middleware/](backend/src/middleware/), [app.js](backend/src/app.js) |
| 4 | Business logic implementation | [backend/src/services/](backend/src/services/) - roi.service.js, levelIncome.service.js, investment.service.js, dashboard.service.js, referral.service.js |
| 5 | React dashboard | [frontend/](frontend/) (Vite + React) |
| 6 | Cron job implementation | [backend/src/cron/roiScheduler.js](backend/src/cron/roiScheduler.js) + idempotent job in [roi.service.js](backend/src/services/roi.service.js) |
| 7 | README | this file: [setup](#1-project-setup), [environment variables](#2-environment-variables), [API documentation](#3-api-documentation), [assumptions](#9-assumptions-made-during-development) |

Extras: Postman collection ([backend/postman/](backend/postman/)), demo seeder and an idempotency test script ([backend/src/scripts/](backend/src/scripts/)).

## 1. Project setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ (tested on 24) |
| MongoDB | 6+ (tested on 8.2). Standalone works; a replica set enables multi-document transactions (see Assumptions) |
| npm | 9+ |

### Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit JWT_SECRET / MONGO_URI / CRON_SECRET
npm run seed -- --reset      # optional: demo users, investments and 10 days of ROI history
npm run dev                  # http://localhost:5000  (nodemon)  |  npm start for production
```

Useful scripts:

| Command | What it does |
|---------|--------------|
| `npm run seed -- --reset` | Wipes the DB and creates a 6-level referral chain, backdated investments and ROI history (credentials printed at the end, password `Password@123`) |
| `npm run roi:run [YYYY-MM-DD]` | Runs the daily ROI job manually (today, or back-fills a given day) |
| `npm run test:idempotency` | Proves ROI is never credited twice (sequential re-run, concurrent runs, direct double credit) against a throw-away database |

### Frontend

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173 - /api is proxied to http://localhost:5000
npm run build                # production build in frontend/dist
```

Demo login after seeding: `aarav@example.com` / `Password@123` (top of the referral tree).

### From the repository root

`npm run install:all`, `npm run dev:backend`, `npm run dev:frontend`, `npm run seed`, `npm run test:idempotency`.

## 2. Environment variables

### backend/.env

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` hides stack traces and uses combined access logs |
| `PORT` | `5000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/nexachain` | MongoDB connection string |
| `USE_TRANSACTIONS` | `true` | Try multi-document transactions; auto-falls back on a standalone server. `false` forces non-transactional mode |
| `JWT_SECRET` | - (required) | Secret used to sign JWTs |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `BCRYPT_SALT_ROUNDS` | `10` | Password hashing cost |
| `CRON_ENABLED` | `true` | Start the node-cron scheduler with the API process |
| `ROI_CRON_SCHEDULE` | `0 0 * * *` | Cron expression - every day at 12:00 AM |
| `CRON_TIMEZONE` | `Asia/Kolkata` | Timezone for the schedule **and** for the ROI "business day" |
| `CRON_SECRET` | - | Shared secret for the manual trigger endpoint (`x-cron-secret` header). Empty = endpoint disabled |
| `LEVEL_INCOME_PERCENTAGES` | `10,5,3,2,1` | Referral income % per level (level 1 first); the list length = number of levels |
| `LEVEL_INCOME_REQUIRE_ACTIVE_INVESTMENT` | `false` | If `true`, an upline user must hold an active investment to receive level income |

### frontend/.env

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(empty)* | API origin for production builds. Leave empty in dev to use the Vite proxy |

## 3. API documentation

Base URL: `http://localhost:5000`. All responses use one envelope:

```json
{ "success": true,  "message": "OK", "data": { ... }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
{ "success": false, "message": "Validation failed", "errors": [ { "field": "email", "message": "email must be a valid email" } ] }
```

Private routes require `Authorization: Bearer <JWT>`. The full Postman collection
with sample requests **and** responses is at
[`backend/postman/Nexachain.postman_collection.json`](backend/postman/Nexachain.postman_collection.json)
(import it, run *Login*, and the token is stored automatically).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | - | Liveness check |
| POST | `/api/auth/register` | - | Register `{ fullName, email, mobile, password, referralCode? }` -> `{ user, token }` |
| POST | `/api/auth/login` | - | Login `{ email \| mobile, password }` -> `{ user, token }` |
| GET | `/api/auth/me` | JWT | Current user profile (with sponsor) |
| GET | `/api/investments/plans` | - | Available plans (code, ROI %, duration, min/max) |
| POST | `/api/investments` | JWT | Create investment `{ planCode, amount }`; distributes level income to upline |
| GET | `/api/investments?page&limit&status` | JWT | Paginated investment history |
| GET | `/api/investments/:id` | JWT | Single investment (own only) |
| GET | `/api/dashboard` | JWT | Total investments, daily ROI, total ROI earned, total level income, wallet balance, 30-day earnings series, income breakdown |
| GET | `/api/roi/history?page&limit` | JWT | Daily ROI ledger (newest first) |
| GET | `/api/referrals/direct?page&limit` | JWT | Direct referrals |
| GET | `/api/referrals/tree?depth=5` | JWT | Complete referral tree, nested (`depth` 1-10) |
| GET | `/api/referrals/income?page&limit` | JWT | Level income ledger |
| POST | `/api/cron/roi/run` | `x-cron-secret` | Manually run the daily ROI job `{ date?: "YYYY-MM-DD" }` (idempotent) |
| GET | `/api/cron/roi/runs` | `x-cron-secret` | Recent ROI job runs with stats |

HTTP status codes: `200/201` success, `400` bad input / business rule, `401` missing or invalid token,
`403` inactive account or disabled endpoint, `404` not found, `409` duplicate (email, mobile),
`422` validation errors, `429` rate limited, `500` unexpected.

### Example - create investment

```http
POST /api/investments
Authorization: Bearer <token>
Content-Type: application/json

{ "planCode": "GROWTH", "amount": 1000 }
```

```json
{
  "success": true,
  "message": "Investment created",
  "data": {
    "investment": { "_id": "6ae9a7aa...", "amount": 1000, "plan": { "code": "GROWTH", "name": "Growth", "dailyRoiPercent": 1.5, "durationDays": 60 },
                    "startDate": "2026-11-03T09:21:46.284Z", "endDate": "2027-01-02T09:21:46.284Z", "status": "Active", "dailyRoiAmount": 15 },
    "levelIncomeDistributed": [ { "user": "6ae9a6b0...", "level": 1, "amount": 100 }, { "user": "6ae9a6b0...", "level": 2, "amount": 50 } ]
  }
}
```

### Example - dashboard

```json
{
  "success": true, "message": "OK",
  "data": {
    "cards": { "totalInvestments": { "count": 2, "amount": 10400 }, "dailyRoi": { "expected": 204, "creditedToday": 200, "date": "2026-11-03" },
               "totalRoiEarned": 1800, "totalLevelIncome": 613, "walletBalance": 2413 },
    "investments": { "active": { "count": 2, "amount": 10400 }, "completed": { "count": 0, "amount": 0 }, "cancelled": { "count": 0, "amount": 0 } },
    "referrals": { "direct": 2 },
    "incomeBreakdown": [ { "key": "roi", "label": "Daily ROI", "value": 1800 }, { "key": "levelIncome", "label": "Level income", "value": 613 } ],
    "earningsSeries": [ { "date": "2026-11-03", "roi": 200, "levelIncome": 0, "total": 200 } ]
  }
}
```

## 4. Database design (Task 1)

| Model | Purpose | Key indexes |
|-------|---------|-------------|
| `User` | Profile, bcrypt password (`select: false`), own `referralCode`, `referredBy` (parent), denormalised `walletBalance`, `totalInvested`, `totalRoiEarned`, `totalLevelIncomeEarned`, `status` | unique `email`, `mobile`, `referralCode`; `{referredBy, createdAt}` for direct referrals and `$graphLookup` |
| `Investment` | Amount, plan snapshot, `dailyRoiPercent`, `durationDays`, `startDate`, `endDate`, status Active/Completed/Cancelled, ROI progress (`totalRoiPaid`, `roiDaysPaid`, `lastRoiDate`) | `{user, createdAt}`, `{user, status}`, `{status, startDate}` (cron scan) |
| `LevelIncome` | Referral earnings ledger: receiver `user`, generator `fromUser`, `investment`, `level`, `percentage`, `amount`, `date` | `{user, date}`; **unique** `{investment, user, level}` (no double payout) |
| `RoiHistory` | Daily ROI ledger: `user`, `investment`, `amount`, `roiDate` (business day), `date` (credited at), `status` | **unique** `{investment, roiDate}` (no double credit); `{user, roiDate}` |
| `JobRun` | Scheduler lock + audit: `jobName`, `runKey` (YYYY-MM-DD), status, trigger, stats | **unique** `{jobName, runKey}` |

Balances on `User` are updated with atomic `$inc`, so dashboard headline numbers are O(1) reads;
the ledgers (`RoiHistory`, `LevelIncome`) remain the source of truth for history and charts.

## 5. Business logic (Task 3) and scheduler (Task 5)

### Daily ROI - `backend/src/services/roi.service.js`

For each **Active** investment, once per business calendar day (`CRON_TIMEZONE`):

1. `roi = amount * dailyRoiPercent / 100`
2. insert `RoiHistory { investment, roiDate }` (status `pending`) - the unique index rejects a second insert for the same day
3. advance the investment (`roiDaysPaid`, `totalRoiPaid`); on the last day of the term mark it `Completed`
4. `$inc` the user's `walletBalance` and `totalRoiEarned`
5. mark the ledger row `credited`

Steps 2-5 run inside one MongoDB transaction per investment (`withTransaction`). Investments are streamed with a
cursor and processed in batches of 25, so memory stays flat regardless of volume.

### Referral / level income - `backend/src/services/levelIncome.service.js`

When an investment is created:

1. the upline is fetched with a single `$graphLookup` (`maxDepth` = number of configured levels)
2. each eligible sponsor (account `active`; optionally must hold an active investment) earns
   `amount * LEVEL_INCOME_PERCENTAGES[level-1] / 100` - default **10% / 5% / 3% / 2% / 1%** for levels 1-5
3. ledger rows are inserted with `insertMany` and wallets credited with one `bulkWrite`, in the **same transaction**
   as the investment insert, so an investment and its payouts commit or roll back together

### Scheduler - `backend/src/cron/roiScheduler.js`

`node-cron` runs `runDailyRoiJob()` every day at **12:00 AM** (`0 0 * * *`, `Asia/Kolkata`) with `noOverlap`.

Idempotency safeguards (verified by `npm run test:idempotency`):

| Layer | Mechanism | Protects against |
|-------|-----------|------------------|
| Job lock | `JobRun` unique `(jobName, runKey)`; a completed run short-circuits, a stale `running` lock (> 30 min) can be taken over | the cron firing twice, restarts, two API instances, manual re-trigger |
| Ledger guard | `RoiHistory` unique `(investment, roiDate)` -> duplicate insert throws `E11000` before any balance changes | anything that bypasses the job lock |
| Transactions | per-investment transaction; on a standalone server a compensating delete removes the pending ledger row if a later step fails | partial writes |
| Process guard | `noOverlap` in node-cron | long runs overlapping the next tick |

The manual trigger `POST /api/cron/roi/run` (header `x-cron-secret`) accepts a `date` to back-fill a missed day.

## 6. Security practices

- Passwords hashed with bcrypt (configurable cost), never selected or serialised.
- JWT (HS256, issuer-checked, configurable expiry); `protect` middleware re-checks the account status on every request.
- Joi validation on every body/query/param with unknown keys stripped; Mongo `CastError`, duplicate-key and schema errors mapped to clean 4xx responses; stack traces hidden in production.
- `helmet`, explicit CORS allow-list, JSON body limit (20 kB), global rate limit (300 req / 15 min) and a stricter one on login/register (20 / 15 min).
- Same "Invalid credentials" message for unknown email and wrong password (no user enumeration).
- Cron endpoints guarded by a timing-safe shared secret; disabled when `CRON_SECRET` is empty.
- Users can only read their own investments, ledgers and tree (all queries are scoped by the JWT subject).

## 7. Performance and scalability

- All list endpoints are paginated and backed by compound indexes matching their sort.
- Referral tree and upline traversal use one `$graphLookup` each instead of N recursive queries; the tree is nested in memory.
- Dashboard runs its five small aggregations in parallel (`Promise.all`); headline totals come from denormalised counters.
- ROI job: indexed cursor scan + batched concurrent processing; per-investment transactions keep lock scope small. The job
  can safely run on several instances at once (job lock), so horizontally scaling the API does not need a separate worker.
- Frontend: Vite build with route-level code splitting (Recharts only loads with the dashboard) and a stale-response guard in the data hook.

## 8. Frontend (Task 4)

React 19 + Vite, React Router, Axios, Recharts. Pages: Login, Register, Dashboard (4 cards, 30-day earnings chart,
income breakdown, recent ROI / level income), Investments (plan picker with live return preview + paginated history),
ROI history, Referrals (direct referrals, nested referral tree with depth control, level income history).
Every data view handles loading (skeletons), error (retry) and empty states; the layout is responsive with a
collapsible sidebar and light/dark theme.

## 9. Assumptions made during development

1. **Principal is paid externally.** Creating an investment does not debit the wallet (there is no deposit/payment API in scope). The wallet accumulates ROI and level income; withdrawals are out of scope.
2. **ROI starts the day after the investment** and is paid once per business day for `durationDays` days; `endDate = startDate + durationDays`. The investment becomes `Completed` after its last ROI day. Principal is not returned to the wallet (ROI-only plans).
3. **Business day = calendar day in `CRON_TIMEZONE`** (Asia/Kolkata). `roiDate` is stored as that day's UTC midnight so comparisons do not depend on the server timezone.
4. **Missed days are not back-filled automatically** (e.g. the server was down at midnight); an operator back-fills with `npm run roi:run YYYY-MM-DD` or the cron endpoint. A day whose term has already ended is closed without credit.
5. **Level income is a one-time payout on the investment amount**, 5 levels at 10/5/3/2/1 % (configurable). Eligibility: sponsor account must be `active`; requiring an active investment is a config switch (off by default). Deeper levels earn nothing.
6. **Plans are static config** (`backend/src/config/plans.js`) with a snapshot stored on each investment; an admin UI for plans is out of scope.
7. **Transactions** need a replica set. On a standalone MongoDB the service logs a warning and falls back to non-transactional writes that remain idempotent (unique indexes + compensation). Both modes were exercised by the idempotency test.
8. **Money is stored as JS numbers rounded to 2 decimals**; a production ledger would use integer minor units or `Decimal128`.
9. **Currency is INR** in the UI (formatting only; the API is currency-agnostic).
10. **No admin role**: the cron endpoints use a shared secret rather than an admin user, to keep the scope to the assessment.
