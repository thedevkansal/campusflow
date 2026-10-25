# CampusFlow

Real-time ride-sharing for campuses: passengers request rides, nearby drivers get matched in seconds, and both sides track the ride live.

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A524-339933?style=flat-square&logo=node.js&logoColor=white)](.nvmrc)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
<!-- TODO: add a license badge once a LICENSE file exists (see License section). -->
<!-- TODO: add a CI/build badge once a CI workflow exists. -->

**[Live demo](https://campusflow-go.vercel.app)** · **[API health](https://campusflow-y2g2.onrender.com/health)**

---

## Overview

Getting around a large campus often means waiting for a shuttle or messaging around for a ride. CampusFlow matches a passenger with the best nearby driver automatically, using live driver locations, ratings and acceptance history. Every ride follows a strict state machine, and both apps get each change over WebSockets as it happens. It is built for students and staff who need short trips, and for students who want to drive.

## Demo

| Landing | Passenger: driver on the way | Driver: waiting for a request |
|---|---|---|
| ![Landing page](assets/redesign/landing-desktop.png) | ![Passenger tracking an accepted ride on the map](assets/redesign/ride-active-desktop.png) | ![Driver online and waiting for a request](assets/redesign/drive-online-desktop.png) |

| Notifications | Profile | Log in |
|---|---|---|
| ![Notifications](assets/redesign/notifications-desktop.png) | ![Driver profile](assets/redesign/profile-driver-desktop.png) | ![Log in](assets/redesign/login-desktop.png) |

On mobile:

| Book a ride | Ride requested | New request (driver) | Driver online |
|---|---|---|---|
| <img src="assets/redesign/ride-idle-mobile.png" alt="Passenger picking From and To stops" width="200"> | <img src="assets/redesign/ride-searching-mobile.png" alt="Passenger waiting for a driver" width="200"> | <img src="assets/redesign/drive-request-mobile.png" alt="Driver with Accept and Decline buttons" width="200"> | <img src="assets/redesign/drive-online-mobile.png" alt="Driver online card" width="200"> |

<!-- TODO: add a short GIF of a full ride (request → match → accept → complete). -->

- Frontend: https://campusflow-go.vercel.app
- Backend: https://campusflow-y2g2.onrender.com/api/v1

> The backend runs on Render's free plan and sleeps after 15 minutes idle. The first request can take about a minute.

## Features

- **Accounts and roles**: passenger and driver sign-up, JWT access and refresh tokens with rotation, logout with token blacklisting.
- **Automatic matching**: Redis GEO search within a set radius, candidates ranked by distance, rating and acceptance rate (weights set in env).
- **Acceptance window**: a driver has 15 s to accept. On timeout or decline, the ride is re-matched or ends as `NO_DRIVER_FOUND`.
- **Ride lifecycle**: one state machine from `SEARCHING` to `COMPLETED`, checked in the service layer.
- **Live updates**: Socket.IO `/passenger` and `/driver` namespaces with JWT auth. Ride events and driver location are pushed as they happen.
- **Live map**: Leaflet + OpenStreetMap with pickup, destination and driver position.
- **Fares**: distance-based estimate (base fare + per-km rate).
- **Ratings**: passengers and drivers rate each other after a completed ride.
- **Notifications**: stored in PostgreSQL and sent in real time.
- **Production basics**: env validated at startup, rate limiting, Helmet, `/health` checks for Postgres and Redis, Docker image, Render Blueprint.

## Getting Started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24 or newer | Version in [`.nvmrc`](.nvmrc) |
| npm | Ships with Node 24 | |
| Docker + Docker Compose | Any recent version | Runs PostgreSQL 16 and Redis 7 locally |
| OpenSSL | Any | Only used to generate JWT secrets |

No Docker? Use your own PostgreSQL 16 and Redis 7. Redis must use `maxmemory-policy noeviction`, which BullMQ requires.

### Installation

**1. Clone and start the databases**

```bash
git clone https://github.com/thedevkansal/CampusFlow.git
```

```bash
cd CampusFlow
```

```bash
docker compose up -d postgres redis
```

**2. Set up the backend**

```bash
cd backend
```

```bash
npm install
```

```bash
cp .env.example .env
```

Generate two secrets (run this twice):

```bash
openssl rand -hex 64
```

Open `backend/.env` and paste one value into `JWT_SECRET` and the other into `JWT_REFRESH_SECRET`. The placeholders in `.env.example` are too short, so the server won't start until you replace them.

Apply the database migrations, then start the API:

```bash
npx prisma migrate dev
```

```bash
npm run start:dev
```

The API runs at `http://localhost:3001/api/v1`.

**3. Set up the frontend** (in a second terminal, starting from the repo root)

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. With no frontend env set, it uses the local backend on port 3001.

### Configuration

#### Backend (`backend/.env`)

All variables are validated at startup in [`env.validation.ts`](backend/src/common/config/env.validation.ts). If one is invalid, the server refuses to start.

| Name | Description | Example |
|---|---|---|
| `NODE_ENV` | `development`, `production` or `test` | `development` |
| `PORT` | HTTP port. Render sets this itself. | `3001` |
| `DATABASE_URL` | PostgreSQL connection string (**required**) | `postgresql://campusflow:campusflow_dev@localhost:5432/campusflow?schema=public` |
| `REDIS_URL` | Redis URL. Use `rediss://` for TLS. (**required**) | `redis://localhost:6379` |
| `JWT_SECRET` | Access-token secret, 64+ characters (**required**) | `<OUTPUT_OF_openssl_rand_-hex_64>` |
| `JWT_REFRESH_SECRET` | Refresh-token secret, 64+ characters, different from `JWT_SECRET` (**required**) | `<ANOTHER_OUTPUT_OF_openssl_rand_-hex_64>` |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `7d` |
| `FARE_BASE_FARE` | Flat fare added to every ride | `50` |
| `FARE_PER_KM_RATE` | Fare per km (charged on road distance) | `12` |
| `ROUTING_URL` | OSRM server for road distance + route line. Empty = straight-line pricing. The public demo has no SLA, so self-host for production. | `https://router.project-osrm.org` |
| `ROUTING_TIMEOUT_MS` | Give up on the router after this long and fall back to straight-line distance | `4000` |
| `MATCHING_RADIUS_KM` | Driver search radius | `5` |
| `MATCHING_MAX_CANDIDATES` | Max drivers fetched from the GEO search | `20` |
| `MATCHING_TOP_N` | Top-ranked drivers tried per match | `3` |
| `MATCHING_ACCEPTANCE_WINDOW_MS` | How long a driver has to accept | `15000` |
| `MATCHING_MAX_RETRY_COUNT` | Re-match attempts after a timeout | `0` |
| `MATCHING_WEIGHT_DISTANCE` | Ranking weight. The three weights must sum to 1.0. | `0.50` |
| `MATCHING_WEIGHT_RATING` | Ranking weight | `0.30` |
| `MATCHING_WEIGHT_ACCEPTANCE` | Ranking weight | `0.20` |
| `THROTTLE_TTL_MS` | Global rate-limit window | `60000` |
| `THROTTLE_LIMIT` | Requests allowed per window | `300` |
| `CORS_ORIGINS` | Allowed frontend origins, comma-separated, no trailing slash | `http://localhost:3000` |
| `SENTRY_DSN` | Optional. Leave unset to turn off Sentry. | `https://<KEY>@<ORG>.ingest.sentry.io/<PROJECT>` |

#### Frontend (`frontend/.env.local`, optional)

| Name | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | REST base URL | `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL | `http://localhost:3001` |

## Usage

### Check the API is up

```bash
curl http://localhost:3001/health
```

```json
{"success":true,"data":{"status":"ok","checks":{"postgres":{"status":"up"},"redis":{"status":"up"}}},"message":"Health check complete"}
```

### Register and log in

```bash
curl -X POST http://localhost:3001/api/v1/auth/register -H "Content-Type: application/json" -d '{"name":"Test Passenger","email":"passenger@example.com","password":"StrongPassword123!","role":"PASSENGER"}'
```

```json
{"success":true,"data":{"userId":"<UUID>","email":"passenger@example.com","name":"Test Passenger","role":"PASSENGER"},"message":"Account created successfully"}
```

```bash
curl -X POST http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"passenger@example.com","password":"StrongPassword123!"}'
```

```json
{"success":true,"data":{"accessToken":"<JWT>","refreshToken":"<JWT>","user":{"id":"<UUID>","email":"passenger@example.com","name":"Test Passenger","role":"PASSENGER"}},"message":"Login successful"}
```

### Request a ride

Replace `<ACCESS_TOKEN>` with the `accessToken` from the login response.

```bash
curl -X POST http://localhost:3001/api/v1/rides -H "Content-Type: application/json" -H "Authorization: Bearer <ACCESS_TOKEN>" -d '{"pickupLat":29.8654,"pickupLng":77.8894,"pickupAddress":"Main Gate","destLat":29.8653,"destLng":77.8948,"destAddress":"Library"}'
```

The ride is returned with `"status": "SEARCHING"`, and matching starts in the background. Online drivers in range get a `ride_assigned` socket event.

### Driver setup

A driver needs a driver profile before they can be matched:

1. Register with `"role": "DRIVER"` and log in.
2. `POST /api/v1/drivers/register` with vehicle details.
3. Log in again. The new access token now includes the `driverId` claim.
4. `POST /api/v1/drivers/online`, then send location updates.

Ready-made requests for every endpoint are in [`backend/api-tests/`](backend/api-tests). Open them with the VS Code REST Client extension or a JetBrains HTTP client.

Full API reference: [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md). All responses use the shape `{ success, data, message }`.

## Project Structure

```text
.
├── backend/                  NestJS API, workers and Socket.IO server
│   ├── src/
│   │   ├── main.ts           Bootstrap: Helmet, CORS, /api/v1 prefix, Redis socket adapter
│   │   ├── common/           Config + env validation, guards, decorators, exception filter
│   │   ├── prisma/           PrismaService
│   │   └── modules/
│   │       ├── auth/         Register, login, refresh, logout, JWT strategies, rate limits
│   │       ├── rides/        Ride lifecycle and state-machine rules
│   │       ├── matching/     BullMQ matching worker, GEO search, driver ranking
│   │       ├── drivers/      Driver profile, online/offline, location
│   │       ├── gateway/      /passenger and /driver Socket.IO namespaces
│   │       ├── location/     Location persistence queue, stale-driver cleanup
│   │       ├── pricing/      Fare engine
│   │       ├── ratings/      Post-ride ratings
│   │       ├── notifications/ Stored + real-time notifications
│   │       └── health/       GET /health (Postgres + Redis)
│   ├── prisma/               schema.prisma and migrations
│   ├── api-tests/            .http request files and a Socket.IO smoke test
│   └── Dockerfile            Multi-stage production image (runs migrations on start)
├── frontend/                 Next.js App Router client
│   └── src/
│       ├── app/              Pages: landing, login, register, dashboard, driver, notifications, profile
│       ├── components/       Map, navbar, UI primitives
│       ├── context/          Auth and socket providers
│       └── lib/              Axios client with token refresh, socket helpers
├── docs/                     Architecture, API contracts, state machine, Redis schema, RBAC
├── assets/                   README screenshots
├── docker-compose.yml        Local PostgreSQL, Redis and (optional) backend
└── render.yaml               Render Blueprint: API + Postgres + Key Value
```

## Tech Stack

- **Backend:** NestJS 10, TypeScript, Prisma 5.22, PostgreSQL 16, Redis (ioredis), BullMQ, Socket.IO 4 + Redis adapter, Passport JWT, bcrypt, Joi, Winston, Sentry
- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Base UI / shadcn, TanStack Query, Axios, Leaflet + React Leaflet, socket.io-client
- **Infra:** Docker, Render (backend), Vercel (frontend)

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/MATCHING_ENGINE.md`](docs/MATCHING_ENGINE.md), [`docs/RIDE_STATE_MACHINE.md`](docs/RIDE_STATE_MACHINE.md), [`docs/SOCKET_PROTOCOL.md`](docs/SOCKET_PROTOCOL.md), [`docs/REDIS_SCHEMA.md`](docs/REDIS_SCHEMA.md).

## Roadmap / Known Issues

**Known issues**

- **Cold starts:** on Render's free plan the API sleeps after 15 minutes idle. The first request, and the first matching job, can be slow. Open `/health` before a demo.
- **Desktop location:** browsers without GPS access fall back to fixed demo coordinates on the driver dashboard.
- **No automated tests yet:** Jest is configured but there are no `*.spec.ts` files.

**Planned**

- ETA prediction and surge pricing
- Push notifications
- Admin dashboard and multi-campus support

<!-- TODO: confirm roadmap priorities; see docs/ROADMAP.md. -->

## Contributing

1. Fork the repo and create a branch from `main` (for example `fix/ride-timeout` or `feat/surge-pricing`).
2. Follow the local setup in [Getting Started](#getting-started).
3. Follow the architecture rules in [`AGENTS.md`](AGENTS.md) and [`docs/ENGINEERING_RULES.md`](docs/ENGINEERING_RULES.md): thin controllers, business logic and RBAC in services, database access only in repositories.
4. If you change `schema.prisma`, add a migration:

   ```bash
   npx prisma migrate dev --name <SHORT_DESCRIPTION>
   ```

5. Run lint and build before you push.

   Backend (from `backend/`):

   ```bash
   npm run lint
   ```

   ```bash
   npm run build
   ```

   Frontend (from `frontend/`):

   ```bash
   npm run lint
   ```

   ```bash
   npm run build
   ```

6. Test your change by hand with the files in `backend/api-tests/`. For socket events, run the smoke test from `backend/` while the API is running:

   ```bash
   PASSENGER_JWT=<PASSENGER_ACCESS_TOKEN> DRIVER_JWT=<DRIVER_ACCESS_TOKEN> npx ts-node api-tests/socket-test.ts
   ```

7. Open a pull request against `main`. Describe what changed and how you tested it. Use [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:` …) to match the existing history.

<!-- TODO: add `npm test` here once unit tests exist. -->

## License

TODO: no license chosen yet. The repo has no `LICENSE` file, and `backend/package.json` says `"UNLICENSED"`. Until a license is added, all rights are reserved.

## Acknowledgements / Contact

- Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Built by **Dev Kansal**: [@thedevkansal](https://github.com/thedevkansal)
- Questions or bugs: [open an issue](https://github.com/thedevkansal/CampusFlow/issues)
