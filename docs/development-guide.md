# Development Guide

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

For this repo specifically:

- `apps/mobile` owns React Native and Expo dependencies
- `apps/admin` owns React DOM and Vite dependencies
- `apps/server` owns Python dependencies through `pyproject.toml`
- `packages/db` owns Prisma and local database tooling

## Suggested Next Steps

1. Install JS dependencies with `pnpm install`
2. Create a Python virtualenv inside `apps/server`
3. Start Postgres with `docker compose -f packages/db/docker-compose.yml up -d`
4. Run apps with `pnpm dev:mobile`, `pnpm dev:admin`, `pnpm dev:server`

## Handy Commands

- `pnpm dev:mobile`: start the Expo dev server for the mobile app
- `pnpm dev:mobile:web`: start the mobile app directly in web mode
- `pnpm dev:admin`: start the admin app
- `pnpm dev:server`: start the Flask server

## Chat API Setup

The chat screen now calls the backend at `POST /api/chat`.

Before using it, create a server env file from:

- `apps/server/.env.example`

Then set:

- `CHAT_PROVIDER=codex` for local Codex CLI demo mode, or `openai` for OpenAI API mode
- `CODEX_CLI_PATH` and `CODEX_WORKDIR` when using Codex mode. On macOS desktop installs, `CODEX_CLI_PATH` is often `/Applications/Codex.app/Contents/Resources/codex`
- `OPENAI_API_KEY`
- optionally `OPENAI_MODEL` if you do not want the default `gpt-5-mini`

Suggested local flow:

1. `cd apps/server`
2. create and activate a Python virtualenv
3. `pip install -e ".[dev]"`
4. copy `.env.example` to `.env` and choose a chat provider
5. from repo root run `pnpm dev:server`
6. in another terminal run `pnpm dev:mobile:web`
