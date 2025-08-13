<<<<<<< HEAD
# signal-v-noise
Signal vs Noise — Astro + Svelte app
=======
# Signal vs Noise

Astro + Svelte app to keep Signal tight and route everything else to Noise. LocalStorage persistence. Keyboard shortcuts, focus mode, and export.

## Dev

- Copy `.env.example` to `.env` if you want to gate preview access: set `PUBLIC_INVITE_TOKEN=yourtoken`.
- Install deps, run, and build:
  - npm ci
  - npm run dev
  - npm run build

## Shortcuts

- A — Focus composer (when not typing)
- Enter — Add to Signal
- Ctrl+Enter — Add to Noise
- F — Focus Signal toggle
- Esc — Cancel editing
- Drag & Drop — Reorder and move

## Smart composer

- ">" at start routes to Noise
- "!" forces Signal (ignores cap)
- "/meet" template pre-fills context and opens it

## Deploy (free)

### GitHub Pages

Push to `main`. Workflow builds and publishes `dist/`. Optionally add a `PUBLIC_INVITE_TOKEN` repo secret to require `?t=TOKEN`.

### Vercel

Import this repo, use build command `npm run build` and output `dist`. Add environment variable `PUBLIC_INVITE_TOKEN` as needed.
# Signal vs Noise — Astro + Svelte

Clean, glassy, and minimal two-column (80/20) to‑do app separating Signal and Noise. Built with Astro + Svelte + Tailwind.

## Features
- Fluid, transparent header (date + theme toggle)
- Centered composer: big input + Add to Signal / Add to Noise
- 80/20 split: Signal (left) and Noise (right)
- Drag-and-drop between lists and within lists
- Inline edit, complete, delete
- Local persistence (localStorage)

## Run locally
```bash
npm install
npm run dev
# open the printed localhost URL
```

# Signal vs Noise — Astro + Svelte

Astro + Svelte app to keep Signal tight and route everything else to Noise. LocalStorage persistence. Keyboard shortcuts, focus mode, and export.

## Dev

- Copy `.env.example` to `.env` if you want to gate preview access: set `PUBLIC_INVITE_TOKEN=yourtoken`.
- Install deps, run, and build:
  - npm ci
  - npm run dev
  - npm run build

## Shortcuts

- A — Focus composer (when not typing)
- Enter — Add to Signal
- Ctrl+Enter — Add to Noise
- F — Focus Signal toggle
- Esc — Cancel editing
- Drag & Drop — Reorder and move

## Smart composer

- ">" at start routes to Noise
- "!" forces Signal (ignores cap)
- "/meet" template pre-fills context and opens it

## Deploy (free)

### GitHub Pages

Push to `main`. Workflow builds and publishes `dist/`. Optionally add a `PUBLIC_INVITE_TOKEN` repo secret to require `?t=TOKEN`.

### Vercel

Import this repo, use build command `npm run build` and output `dist`. Add environment variable `PUBLIC_INVITE_TOKEN` as needed.

## Build
```bash
npm run build
npm run preview
```

## Stack
- Astro
- Svelte (components)
- Tailwind CSS

All client logic lives in `src/components/TaskBoard.svelte`.
