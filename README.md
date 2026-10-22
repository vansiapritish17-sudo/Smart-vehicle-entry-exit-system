# Barbican — Smart Vehicle Entry/Exit Monitoring System (SVEMS)

[![CI](https://github.com/vansiapritish17-sudo/Smart-vehicle-entry-exit-system/actions/workflows/ci.yml/badge.svg)](https://github.com/vansiapritish17-sudo/Smart-vehicle-entry-exit-system/actions/workflows/ci.yml)

Gate access control for a parking facility or campus: register vehicles, record entries and
exits at configured gates, enforce capacity, raise alerts on refused movements, and monitor
occupancy live.

**Stack:** React 19 + Vite + Tailwind (frontend) · Spring Boot 3 / Java 17 (API) ·
Firebase Authentication (sign-in, JWT) · Cloud Firestore (database, real-time updates).

## Architecture

```
Browser (React) ──reads (real-time listeners)──▶ Firestore
       │                                            ▲
       └──writes: REST /api + Firebase ID token ──▶ Spring Boot ──Admin SDK──┘
```

- **Sign-in** happens directly against Firebase Authentication. The ID token (a signed JWT)
  carries the user's role as a custom claim.
- **Every write** goes through the Spring Boot API, which verifies the token
  (`FirebaseTokenFilter`), enforces roles, validates input and applies the business rules.
- **Reads** are Firestore `onSnapshot` listeners, so every open screen updates instantly.
  Firestore rules (`firestore.rules`) allow signed-in reads only and deny all client writes.

## Roles

| Feature | Administrator | Security Operator |
|---|:-:|:-:|
| Dashboard, monitoring, alerts, history, vehicle search | ✓ | ✓ |
| Record entry / exit | ✓ | ✓ |
| Register / edit / deactivate vehicles | ✓ | |
| Manage users (create, edit role, reset password, deactivate) | ✓ | |
| System configuration (capacity, threshold, gates) | ✓ | |

## Business rules (enforced server-side in `MovementService`)

An entry is **refused, and an alert is raised**, when the vehicle is:
- not registered → `UNAUTHORIZED_VEHICLE` (HIGH)
- registered but INACTIVE → `INACTIVE_VEHICLE` (HIGH)
- already inside → `DUPLICATE_ENTRY` (MEDIUM)
- arriving while the facility is full → `CAPACITY_FULL` (HIGH)

An exit for a vehicle not recorded inside is refused → `INVALID_EXIT` (MEDIUM).
When occupancy rises across the configured threshold a `CAPACITY_WARNING` alert is raised once.
Movements are accepted only at gates whose status is ACTIVE. Stay duration is calculated on exit.

Each entry or exit is **one Firestore transaction**: the checks above and the writes they lead to
(the movement record, the vehicle's inside/outside status, and the entry an exit closes) commit
together or not at all. A failure part-way can never leave a movement without its status change,
and Firestore re-validates the reads at commit, so the rules hold across several server instances.
An exit finds the entry it closes by vehicle id, so correcting a plate while the vehicle is inside
does not lose the visit.

## Running it

**Prerequisites:** Node.js 20+, Java 17+ (Maven is not needed — the project includes the
Maven wrapper). Firebase credentials go in `backend/.env` (see `backend/.env.example`).

### Production (single server)

```bash
cd frontend
npm install
npm run package     # builds the React app and bundles it into the Spring Boot jar
npm start           # serves UI + API on http://localhost:8081
```

### Development (hot reload)

```bash
cd backend  && ./mvnw spring-boot:run     # API on :8081   (Windows: mvnw.cmd spring-boot:run)
cd frontend && npm install && npm run dev  # UI on :5173, /api proxied to :8081
```

### First sign-in

On an empty database the backend creates two accounts and a default configuration
(capacity 100, threshold 80 %, one "Main Gate"):

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | Administrator |
| `operator` | `Operator@123` | Security Operator |

Override these with `SVEMS_ADMIN_PASSWORD` / `SVEMS_OPERATOR_PASSWORD`, and change them from
the Profile page after signing in. New users get a random temporary password shown once to
the administrator.

### Tests

```bash
cd backend && ./mvnw test      # Windows: mvnw.cmd test
```

42 tests cover every gate rule above, plate and contact validation, gate configuration, stay
durations (with a controllable clock), the corrected-plate case, clearing history without losing open
visits, and atomicity: a transaction made to fail at commit must leave no movement, status change
or alert behind. They run the real services against an in-memory store that enforces Firestore's
transaction rules, so they need no Firebase project. CI runs them, and a production build of the
frontend, on every push.

### End-to-end test

With the server running, from `frontend/`: `npm run test:e2e` (Playwright). It signs in as both roles and drives
a test vehicle (`TS09ZZ9901`) through registration, entry, exit and every refusal path.

## Deploying (Render + Vercel)

The API runs on Render (Docker), the React app on Vercel.

1. **API on Render** — *New → Blueprint*, select this repo (it reads `render.yaml`). Set:
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` — the value from your local `backend/.env`
   - `SVEMS_CORS_ORIGINS` — your Vercel URL, e.g. `https://your-app.vercel.app`

   Check `https://<service>.onrender.com/api/health` returns `"status" : "UP"`.
2. **Frontend on Vercel** — *Add New → Project*, import this repo and set **Root Directory** to
   `frontend` (Vite is then auto-detected). Add the environment variable `VITE_API_BASE_URL = https://<service>.onrender.com/api`
   and deploy. `vercel.json` makes deep links such as `/dashboard` work.
3. **Firebase Console** → Authentication → Settings → *Authorized domains* → add the
   Vercel domain.
4. **Firestore rules** — from `firebase/`: `firebase deploy --only firestore`.

Render's free plan sleeps after ~15 minutes idle; the first request then takes 30–60 s.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | — | Base64 of the Firebase service account JSON |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Alternative: path to the JSON file |
| `PORT` | `8081` | HTTP port |
| `SVEMS_TIMEZONE` | `Asia/Kolkata` | Zone for recorded timestamps |
| `SVEMS_CORS_ORIGINS` | `http://localhost:*,http://127.0.0.1:*` | Only if the UI is on another origin |
| `VITE_API_BASE_URL` (build time) | `/api` | Only if the API is on another origin |

## Project layout

```
backend/                         Spring Boot API (Java 17, Maven wrapper)
  src/main/java/com/svems/
    controller/                  REST endpoints
    service/                     business rules, validation, entry/exit transactions
    repository/                  DocumentStore interface and its Firestore implementation
    security/                    Firebase token verification and role checks
    config/                      Firebase, CORS, SPA hosting, clock, error handling, seeding
  src/test/java/com/svems/       unit tests and the in-memory store they run against
  Dockerfile                     API image used by Render
frontend/                        React app (Vite, Tailwind)
  src/
    pages/                       one file per screen
    components/                  shared UI, layout and dashboard widgets
    state/                       session, Firestore listeners, API actions, theme
    services/                    API client, Firebase auth, derived statistics, CSV export
  tests/smoke.mjs                end-to-end test (Playwright)
  scripts/package-backend.mjs    builds the single-server jar
  vercel.json                    Vercel config (deep links)
firebase/                        Firestore security rules and indexes (Firebase CLI)
render.yaml                      Render blueprint for the API
.github/workflows/ci.yml         CI: backend tests and frontend build
```
