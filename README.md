# RateMyProf

A campus professor review platform (similar to Rate My Professor), built as a
Turborepo monorepo:

- **`apps/server`** — [Elysia](https://elysiajs.com) API on Bun, PostgreSQL via
  [Drizzle ORM](https://orm.drizzle.team), JWT auth, nodemailer for invites.
- **`apps/web`** — Vue 3 + Vite SPA. Talks to the API through
  [Eden Treaty](https://elysiajs.com/eden/overview) for end-to-end type safety.

## Features

- **Invite-only registration**: admins whitelist student emails; only invited
  people can register, and each account is bound to a school. (This sidesteps
  hard "is this person really a student here?" verification — the admin owns
  that decision. The schema reserves a `domain` column on schools for adding
  email-domain or SSO verification later.)
- **First-run setup wizard**: on first visit (no admin exists yet), the app
  routes to `/setup` to create the first administrator and school. The page
  locks once initialized.
- **Reviews with full dimensions**: quality (1–5), difficulty (1–5), would-take-
  again, grade, course code, free-text comment, and tags.
- **Moderation**: reviews are created as `pending` and only appear publicly
  after an admin approves them.
- **Helpfulness votes** on approved reviews.
- **Admin console** at `/admin`: dashboard, moderation queue, professors,
  invites, and users.

All API routes follow RESTful resource conventions (see "API" below).

## Prerequisites

- [Bun](https://bun.com) `>= 1.2`
- [Docker](https://www.docker.com) (for PostgreSQL)

## Getting started

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure the server environment
#    Copy the example and fill in SMTP credentials if you want real emails.
#    (Leave SMTP_HOST empty for local dev — invite links are logged to console.)
cp apps/server/.env.example apps/server/.env

# 4. Push the database schema
cd apps/server && bun run db:push && cd ../..

# 5. Run both apps (web + server) in dev
bun run dev
```

- Web: http://localhost:5173
- API: http://localhost:3000 (proxied under `/api` from the web app)

On first load you'll be redirected to **`/setup`** to create the initial admin.

## Environment variables (`apps/server/.env`)

| Variable        | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `DATABASE_URL`  | Postgres connection string                           |
| `REDIS_URL`     | Redis connection string (default `redis://localhost:6380`) |
| `JWT_SECRET`    | Secret used to sign JWTs (use a long random value)   |
| `PORT`          | API port (default 3000)                              |
| `WEB_ORIGIN`    | Web app origin, used for CORS + invite links         |
| `SMTP_*`        | SMTP credentials for nodemailer (invite emails)      |

> Docker services are published on non-default host ports to avoid clashes:
> - Postgres: **5433** (default 5432)
> - Redis: **6380** (default 6379)

## API (RESTful)

| Method & path                       | Description                          | Access  |
| ----------------------------------- | ------------------------------------ | ------- |
| `GET  /api/setup`                   | Initialization status                | public  |
| `POST /api/setup`                   | Create first admin + school          | once    |
| `POST /api/users`                   | Register via invite token            | public  |
| `GET  /api/users/me`                | Current user                         | auth    |
| `GET  /api/users`                   | List users                           | admin   |
| `PATCH /api/users/:id`              | Enable/disable, change role          | admin   |
| `PATCH /api/users/:id/password`     | Admin: force-change a user's password | admin   |
| `POST /api/sessions`                | Log in (sets HttpOnly cookie)        | public  |
| `DELETE /api/sessions/current`      | Log out                              | auth    |
| `GET  /api/schools`                 | List schools                         | public  |
| `GET  /api/schools/:id`             | School details                       | public  |
| `POST /api/schools`                 | Create school                        | admin   |
| `GET  /api/professors`              | List/search professors               | public  |
| `GET  /api/professors/:id`          | Professor details + aggregate scores | public  |
| `POST /api/professors`              | Create professor                     | admin   |
| `PATCH /api/professors/:id`         | Update professor                     | admin   |
| `DELETE /api/professors/:id`        | Delete professor                     | admin   |
| `GET  /api/professors/:id/reviews`  | Approved reviews for a professor     | public  |
| `GET  /api/professors/:id/reviews/mine` | The current user's own review    | auth    |
| `POST /api/professors/:id/reviews`  | Submit a review (pending)            | auth    |
| `GET  /api/reviews?status=`         | Moderation queue                     | admin   |
| `GET  /api/reviews/deletion-requests` | Reviews pending deletion           | admin   |
| `PATCH /api/reviews/:id`            | Edit own review (returns to pending) | auth    |
| `DELETE /api/reviews/:id`           | Request deletion of own review       | auth    |
| `PATCH /api/reviews/:id/moderation` | Approve/reject a review              | admin   |
| `PATCH /api/reviews/:id/deletion`   | Confirm/reject a deletion request    | admin   |
| `POST /api/reviews/:id/votes`       | Cast a helpfulness vote              | auth    |
| `GET  /api/invites`                 | List invites                         | admin   |
| `POST /api/invites`                 | Create invite + email it             | admin   |
| `DELETE /api/invites/:id`           | Revoke an invite                     | admin   |
| `GET  /api/invites/verify/:token`   | Verify an invite token               | public  |
| `POST /api/password-reset`          | Request password reset (requires CAPTCHA) | public  |
| `POST /api/password-reset/confirm`  | Reset password with token            | public  |
| `POST /api/cap/challenge`           | Create a CAPTCHA PoW challenge       | public  |
| `POST /api/cap/redeem`              | Redeem solved challenge for a token  | public  |

Auth uses an **HttpOnly session cookie** (`rmp_session`) set on login. The
browser sends it automatically; the token is never exposed to JavaScript
(resistant to XSS theft). Send requests with credentials included.

Review rules:
- A user may review a given professor only **once** (edit the existing one).
- Editing a review sends it back to **pending** for re-approval.
- Deleting a review is a **soft request**: it is hidden immediately and queued
  for admin confirmation; the admin can confirm (permanent delete) or reject
  (restore).

## Useful scripts

```bash
bun run dev                       # run all apps (turbo)
bun run build                     # build all apps
bun run check-types               # type-check all apps

# server-only (run inside apps/server)
bun run db:push                   # push schema to the database
bun run db:studio                 # open Drizzle Studio
```
