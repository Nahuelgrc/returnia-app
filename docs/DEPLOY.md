# Deployment

Vercel (Git integration) + a single production Neon database. `vercel.json` is not used: `postinstall` already runs `prisma generate` and the default build (`next build`) is enough. Migrations never run in the Vercel build.

## Vercel variables

Settings > Environment Variables, per environment (Production / Preview / Development):

| Variable | Value |
|---|---|
| `CONNECTION_STRING` | **Pooled** Neon URL (host with `-pooler`) |
| `AUTH_SECRET` | `npx auth secret`, different per environment |
| `AUTH_URL` | Public URL of the environment (e.g. `https://your-app.vercel.app`) |
| `FINNHUB_API_KEY` | Finnhub key |

With a single database, Preview must not point to the production database: leave Preview without `CONNECTION_STRING` (previews will not work with data), disable previews, or create a separate Neon branch for that environment.

## GitHub secret

1. Settings > Environments > New environment: `production`.
2. In the environment, enable Required reviewers (manual approval) and restrict it to the `main` branch under Deployment branches.
3. Add the `CONNECTION_STRING` secret inside the environment (not as a repository secret). Use the **direct** Neon URL (without `-pooler`): the pooler (pgbouncer) can fail with the `prisma migrate` locks.

## Recommended flow

1. Merge to `main` with green CI.
2. If there are new migrations: Actions > "DB migrate" > Run workflow, approve the `production` environment. Review the `migrate status` step and then `migrate deploy`.
3. Let Vercel deploy (or deploy manually).

Write migrations to be backward compatible (add before removing), because the migration runs before the new code. Before destructive migrations, create a backup branch in Neon.

## Disabling automatic deploys

To always migrate before deploying: Vercel > Settings > Git > Ignored Build Step with `exit 0` for Production (or disconnect the repo) and deploy manually from the dashboard once the migration is applied. Re-enable by removing the command.

## Extra layer

Vercel Firewall (Security > Firewall): enable rate limiting rules on `/api/*` and `/login`. The app's in-memory rate limiting is not shared across serverless instances, so this layer is what makes it effective.

## Notices

- Vercel: always use the pooled URL in `CONNECTION_STRING`; in serverless the direct one exhausts Neon connections.
- Migrations: direct URL. If `migrate deploy` fails with the pooler (timeouts, advisory lock errors), switch the secret to the direct one.
