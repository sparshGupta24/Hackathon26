# F1 Team Onboarding Arena

Volunteer-controlled Next.js event website with:
- Public team onboarding (6 teams max, 1-5 players each)
- F1 livery customization per team
- Volunteer dashboard with shared passcode auth
- Global timer (manual start, +5/+10 extensions, reset)
- Circuit map modal available from public + admin pages

## Setup

1. Ensure Node.js 22+ is installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy env file:
   ```bash
   cp .env.example .env
   ```
4. Initialize SQLite tables:
   ```bash
   npm run db:init
   ```
5. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
6. Start dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `DATABASE_URL` default: `file:./dev.db` (Prisma resolves this to `prisma/dev.db`)
- `VOLUNTEER_PASSCODE` default: `pitcrew`
- `ADMIN_SESSION_SECRET` default fallback exists, but set your own in production

## API Endpoints

- `POST /api/teams/register`
- `GET /api/state`
- `POST /api/admin/login`
- `GET /api/admin/me`
- `POST /api/admin/timer/start`
- `POST /api/admin/timer/extend` with `{ "minutes": 5 | 10 }`
- `POST /api/admin/timer/reset`
