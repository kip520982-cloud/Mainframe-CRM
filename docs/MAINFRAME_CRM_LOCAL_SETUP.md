# Mainframe CRM — Local Setup

Verified local foundation on macOS (Apple Silicon) against Twenty `main` (`972bb045`).

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node | **26.12.1** (from `.nvmrc`) via nvm |
| Yarn | **4.18.1** via Corepack (`corepack enable`) |
| PostgreSQL | **16** (Homebrew `postgresql@16`) |
| Redis | Homebrew `redis` |
| Docker / Colima | Optional; used as fallback. Colima was recreated with 4 CPU / 6 GB RAM / 60 GB disk |

## One-time setup

```bash
cd /Users/ben/mainframe-crm

# Node
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm install   # reads .nvmrc
nvm use

# Yarn
npm install -g corepack
corepack enable

# Native services
brew install postgresql@16 redis
brew services start postgresql@16
brew services start redis
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Postgres role + databases (Twenty defaults)
psql -d postgres -c "DO \$\$ BEGIN CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres'; EXCEPTION WHEN duplicate_object THEN ALTER ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres'; END \$\$;"
psql -d postgres -c 'CREATE DATABASE "default";'
psql -d postgres -c 'CREATE DATABASE test;'

# Env (never commit)
cp packages/twenty-front/.env.example packages/twenty-front/.env
cp packages/twenty-server/.env.example packages/twenty-server/.env
# Set APP_SECRET to a random value (openssl rand -base64 32)

# Dependencies
# Upstream .yarnrc.yml ships enableScripts: false. For local native modules
# (esbuild, bcrypt, …) set enableScripts: true then:
yarn install
yarn rebuild

# Schema + seed (destructive to local Twenty DBs only)
npx nx database:reset twenty-server
```

## Daily start / stop

```bash
# Ensure services
brew services start postgresql@16
brew services start redis

# All processes (front + server + worker)
npx nx start

# Or separately:
npx nx start twenty-server
npx nx worker twenty-server
npx nx start twenty-front
```

Stop with Ctrl+C in the terminal running `nx start`.

```bash
# Optional: stop infra
brew services stop postgresql@16
brew services stop redis
```

## Official helper script

```bash
bash packages/twenty-utils/setup-dev-env.sh          # start + configure
bash packages/twenty-utils/setup-dev-env.sh --down
bash packages/twenty-utils/setup-dev-env.sh --docker # force Docker Compose
bash packages/twenty-utils/setup-dev-env.sh --reset  # wipe + restart (destructive)
```

On macOS Homebrew, `has_local_pg` in that script looks for Debian `pg_ctlcluster`, so prefer brew services (as above) or `--docker` once Colima/Docker is running.

## Local URLs & credentials

| Service | URL / connection |
|---------|------------------|
| Frontend | http://localhost:3001 |
| API / GraphQL | http://localhost:3000/graphql |
| REST | http://localhost:3000/rest |
| Demo login | `tim@apple.dev` / `tim@apple.dev` (when `SIGN_IN_PREFILLED=true`) |
| Postgres | `postgres://postgres:postgres@localhost:5432/default` |
| Redis | `redis://localhost:6379` |

## Environment variables

Active local files (gitignored via `**/**/.env`):

- `packages/twenty-server/.env`
- `packages/twenty-front/.env`

Placeholders prepared (commented in server `.env.example` — fill when ready, do not invent secrets):

- `MESSAGING_PROVIDER_GMAIL_ENABLED`
- `CALENDAR_PROVIDER_GOOGLE_ENABLED`
- `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_CLIENT_SECRET`
- `AUTH_GOOGLE_CALLBACK_URL` / `AUTH_GOOGLE_APIS_CALLBACK_URL`
- `IS_MULTIWORKSPACE_ENABLED` (default `false` for first Mainframe workspace)

## Service status checks

```bash
redis-cli ping                                          # PONG
pg_isready -h localhost -p 5432                         # accepting connections
PGPASSWORD=postgres psql -h localhost -U postgres -d default -c '\dn'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/healthz
```

## Database backup (local)

```bash
PGPASSWORD=postgres pg_dump -h localhost -U postgres default \
  > ~/backups/mainframe-crm-$(date +%Y%m%d).sql
```

Do **not** drop volumes or run `database:reset` against a DB you care about without approval.

## Gmail (prepare only)

1. Google Cloud project → enable Gmail API, Google Calendar API, People API
2. OAuth client; redirect URIs:
   - `http://localhost:3000/auth/google/redirect`
   - `http://localhost:3000/auth/google-apis/get-access-token`
3. Set the Google/Gmail env vars above; restart server + worker
4. Messaging sync needs the worker process running

## Website enquiry integration (later)

Use workspace REST/GraphQL with a **server-side** API key (`Authorization: Bearer …`). Never embed the key in browser code. Prefer a website backend or edge proxy that creates Person / Company / Note (or a custom Enquiry object).

## Destructive commands (ask first)

- `npx nx database:reset twenty-server`
- `bash packages/twenty-utils/setup-dev-env.sh --reset`
- `docker compose … down -v` / volume deletes
- Dropping Postgres databases or Redis `FLUSHALL`
