# Barbican — Smart Vehicle Entry/Exit Monitoring System (SVEMS)

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

## Running it

**Prerequisites:** Node.js 20+, Java 17+ (Maven is not needed — the project includes the
Maven wrapper). Firebase credentials go in `backend/.env` (see `backend/.env.example`).

### Production (single server)

```bash
npm install
npm run package     # builds the React app and bundles it into the Spring Boot jar
npm start           # serves UI + API on http://localhost:8081
```

### Development (hot reload)

```bash
cd backend && ./mvnw spring-boot:run      # API on :8081   (Windows: mvnw.cmd spring-boot:run)
npm run dev                               # UI on :5173, /api proxied to :8081
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

### End-to-end test

With the server running: `npm run test:e2e` (Playwright). It signs in as both roles and drives
a test vehicle (`TS09ZZ9901`) through registration, entry, exit and every refusal path.

## Deploying (Render + Vercel)

The API runs on Render (Docker), the React app on Vercel.

1. **API on Render** — *New → Blueprint*, select this repo (it reads `render.yaml`). Set:
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` — the value from your local `backend/.env`
   - `SVEMS_CORS_ORIGINS` — your Vercel URL, e.g. `https://your-app.vercel.app`

   Check `https://<service>.onrender.com/api/health` returns `"status" : "UP"`.
2. **Frontend on Vercel** — *Add New → Project*, import this repo (Vite is auto-detected).
   Add the environment variable `VITE_API_BASE_URL = https://<service>.onrender.com/api`
   and deploy. `vercel.json` makes deep links such as `/dashboard` work.
3. **Firebase Console** → Authentication → Settings → *Authorized domains* → add the
   Vercel domain.

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
src/                     React app
  pages/                 one file per screen
  state/AppContext.jsx   session, Firestore listeners, API actions
  services/              API client, Firebase auth, derived statistics
backend/src/main/java/com/svems/
  controller/            REST endpoints
  service/               business rules and validation
  security/              Firebase token verification and role checks
  config/                Firebase, CORS, SPA hosting, error handling, first-run seeding
firestore.rules          database security rules
tests/smoke.mjs          end-to-end test
```
