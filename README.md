# F1 Team Onboarding Arena

Volunteer-controlled Next.js event website with:
- Public team onboarding (6 teams max, 1-5 players each)
- F1 livery customization per team
- Volunteer dashboard (no login; use only on trusted networks)
- Shared event timer (admin + legacy public timer API routes)
- Circuit map modal on public + admin pages
- Prompt generator slot machine

## Data layer

Persistent state lives in **Google Cloud Firestore**, accessed from Next.js Route Handlers via the **Firebase Admin SDK**.

## Setup

1. Ensure Node.js 22+ is installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Firebase project, enable **Firestore** (Native mode), and create a **service account** with permission to read/write Firestore.
4. Copy env file and add credentials:
   ```bash
   cp .env.example .env
   ```
   For **local dev**, set `GOOGLE_APPLICATION_CREDENTIALS` to the **absolute path** of your downloaded service account JSON. For **Vercel**, add `FIREBASE_SERVICE_ACCOUNT_JSON` in the project’s environment settings (full JSON as one line), not a file path.
5. For local development with the **Firestore emulator**:
   - Set `FIRESTORE_EMULATOR_HOST` (e.g. `127.0.0.1:8080`) and `FIREBASE_PROJECT_ID` (any string, e.g. `demo-hack`).
6. Start dev server:
   ```bash
   npm run dev
   ```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to service account JSON (**local dev**) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service account JSON as one string (**Vercel / CI**) |
| `FIRESTORE_EMULATOR_HOST` | If set, talk to the Firestore emulator |
| `FIREBASE_PROJECT_ID` | Project ID (required with emulator if not using a JSON key) |

## Security note

The volunteer console (`/admin`) and `/api/admin/*` routes are **not** protected by a server-side login. Run behind a trusted network, or add your own protection (hosting password, VPN, etc.) before exposing publicly.

## API endpoints

- `POST /api/teams/register`
- `GET /api/state`
- `POST /api/admin/timer/start`
- `POST /api/admin/timer/extend` with `{ "minutes": 5 | 10 }`
- `POST /api/admin/timer/reset`
- `POST /api/admin/team-progress` with `{ teamId, delta: 1 | -1, message }`
- Legacy public timer routes: `POST /api/timer/start`, `pause`, `resume`, `extend`

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` / `npm start` — production
- `npm run lint` / `npm test` — quality checks
- `npm run migrate:sqlite -- path/to/dev.db` — one-time copy from a legacy Prisma SQLite file into Firestore (requires Firebase env; overwrites matching docs)
