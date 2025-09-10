# TripMD (itinerary-md)

Tools for writing and previewing travel itineraries in Markdown. This repository is a monorepo managed with npm workspaces. It contains:

- remark plugins published to npm (e.g. `remark-itinerary`, `remark-itinerary-alert`)
- a reusable editor bundle (`@itinerary-md/editor`)
- a demo application (`apps/studio`) showcasing authoring and preview
– Demo site: [tripmd.dev](https://tripmd.dev)

For overall structure and high-level notes, see DeepWiki (AI-generated; may be incomplete or outdated): [deepwiki.com/cumuloworks/itinerary-md](https://deepwiki.com/cumuloworks/itinerary-md).

## Packages

- `packages/core` — `remark-itinerary`: remark plugin that converts itinerary-style Markdown into custom MDAST nodes (`itmdEvent`, `itmdHeading`) and injects normalized metadata (e.g., `itmdDate`, `itmdPrice`)
- `packages/alert` — `remark-itinerary-alert`: convert GitHub-style blockquote alerts (e.g. `> [!NOTE]`) into `itmdAlert` nodes
- `packages/editor` — `@itinerary-md/editor`: prebuilt editor UI assets used by the demo app

## Apps

- `apps/studio` — Demo editor/preview app built with Astro and React

## Monorepo at a glance

This repo uses npm workspaces to manage multiple packages and an app in a single codebase.

- Root `package.json` defines shared scripts that invoke each workspace
- Each workspace has its own `package.json` and build/test config
- Development often runs concurrently across workspaces via `npm run dev`

Published packages:

- `remark-itinerary` — parse itinerary-like Markdown into custom MDAST nodes
- `remark-itinerary-alert` — support GitHub-style blockquote alerts
- `@itinerary-md/editor` — prebuilt editor assets for integrations

## Quick start

Clone and install:

```bash
git clone <this-repo-url>
cd itinerary-md
npm install
```

Start everything for local development (plugins + editor bundle + demo app):

```bash
npm run dev
```

This runs the following concurrently:

- `packages/core` dev build
- `packages/editor` pack/watch
- `apps/studio` dev server (Astro, default at `http://localhost:4321`)

Build all packages and the demo app:

```bash
npm run build
```

Run tests across workspaces (if present):

```bash
npm test
```

## Using the remark plugins

Install from npm:

```bash
npm i remark-itinerary remark-itinerary-alert
```

Basic usage:

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkItineraryAlert from 'remark-itinerary-alert';
import remarkItinerary from 'remark-itinerary';

const processor = unified()
  .use(remarkParse)
  // IMPORTANT: run alert BEFORE remark-itinerary
  .use(remarkItineraryAlert)
  .use(remarkItinerary);
```

See per-package READMEs for details:

- [`packages/core/README.md`](packages/core/README.md)
- [`packages/alert/README.md`](packages/alert/README.md)

## Development

Common scripts at repo root:

```bash
# Run dev for core, editor, studio together
npm run dev

# Lint and format (Biome)
npm run lint
npm run lint:fix
npm run format
npm run format:check

# Build all packages first, then the demo app
npm run build

# Run tests (Vitest)
npm test
npm run test:watch

# Clean generated files except node_modules
npm run clean
```

Workspace tips:

- Run a script in a specific workspace: `npm -w packages/core run build`
- Run a script across all workspaces (if present): `npm -ws run test --if-present`
- Add a dependency to a workspace: `npm -w packages/core i <pkg>`

## Monorepo structure

```text
/
├── apps/
│   └── studio/              # Demo editor/preview app (Astro)
├── packages/
│   ├── core/                # remark-itinerary (plugin + helpers)
│   ├── alert/               # remark-itinerary-alert (blockquote alerts)
│   └── editor/              # @itinerary-md/editor (editor bundle)
├── README.md
└── package.json
```

## License

- `remark-itinerary` (packages/core): MIT (see `packages/core/LICENSE`)
- `remark-itinerary-alert` (packages/alert): MIT (see `packages/alert/LICENSE`)
- Others: UNLICENSED
