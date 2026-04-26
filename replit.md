# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- `artifacts/namma-vyapara` — Bengaluru hyperlocal vendor + customer marketplace (React + Vite, wouter, leaflet, shadcn/ui, framer-motion). Mounted at `/`.
  - Auth: Firebase Email/Password, with phone numbers mapped to synthetic emails (`<phone>@nv.users.local`).
  - Data: Firestore `kv` collection holds JSON blobs for shared state (customers, vendors, vendor codes, ratings, live locations, per-vendor freshness + orders). Reads stay synchronous via an in-memory + localStorage cache fed by an `onSnapshot` listener.
  - Required Firebase console setup (one-time): enable **Email/Password** sign-in in Authentication, and start Firestore in test mode (or apply rules permitting reads/writes for authenticated users on the `kv` collection).
  - Required env vars (already wired): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
- `artifacts/api-server` — legacy Express health-check service (no longer used by the marketplace).
- `artifacts/mockup-sandbox` — design canvas sandbox.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
