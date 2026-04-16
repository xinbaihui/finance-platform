# finance-platform

Monorepo scaffold for a finance agent product:

- `apps/mobile`: Expo-based React Native app
- `apps/admin`: React admin app
- `apps/server`: Python FastAPI server
- `packages/db`: Prisma schema and local Postgres setup

## Workspace

This repo uses `Nx` for task orchestration and `pnpm` workspaces for package management.

## Dependency Strategy

Each app keeps its own dependencies in its local `package.json`, which makes app
boundaries clearer and avoids mixing mobile-only, web-only, and backend-specific
packages together.

At the same time, you still install dependencies from the repo root with
`pnpm install`.

That works well because `pnpm` does two things:

1. It stores packages in a shared global content-addressable store.
2. It links workspace dependencies into each app instead of copying full
   duplicate installations everywhere.

So the practical model is:

- dependency declarations stay close to each app
- installation is still managed once from the monorepo root
- shared packages are reused efficiently by `pnpm`

This means we get both:

- clear app ownership
- efficient dependency reuse

For this repo specifically:

- `apps/mobile` owns React Native and Expo dependencies
- `apps/admin` owns React DOM and Vite dependencies
- `apps/server` owns Python dependencies through `pyproject.toml`
- `packages/db` owns Prisma and local database tooling

## Suggested next steps

1. Install JS dependencies with `pnpm install`
2. Create a Python virtualenv inside `apps/server`
3. Start Postgres with `docker compose -f packages/db/docker-compose.yml up -d`
4. Run apps with `pnpm dev:mobile`, `pnpm dev:admin`, `pnpm dev:server`
