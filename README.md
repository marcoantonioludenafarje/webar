# WebAR Lab

A technical experimentation laboratory for browser-based Augmented Reality
(WebAR). See [CLAUDE.md](./CLAUDE.md) for the full project brief, stage,
scope, and per-demo requirements — this README only covers running the code.

This project is in the **technology validation / proof-of-concept** stage.
It is not a product. See [EXPERIMENTS.md](./EXPERIMENTS.md) for experiment
status and [experiment-results/](./experiment-results/) for physical test
evidence.

## Requirements

- Node.js 18+ and npm
- A mobile browser for physical testing (camera demos cannot be meaningfully
  validated on desktop alone)
- HTTPS or `localhost` — browsers only grant camera access in secure
  contexts

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. On a phone, use Vite's `--host` flag or the
network URL Vite prints, and make sure the phone is on the same network:

```bash
npm run dev -- --host
```

Camera access over a plain `http://<lan-ip>` origin will be blocked by most
mobile browsers unless it's `localhost`. If needed, use a tunnel (e.g.
`ngrok`) to get an HTTPS URL for physical device testing.

## Project layout

```text
src/
├── core/          reusable services shared across demos (camera, metrics, ...)
├── demos/         one folder per experiment, each with its own index.html
├── launcher/       root launcher page (src/launcher/main.ts, index.html)
└── shared/        shared CSS layout used by the launcher and every demo

experiment-results/ physical test result docs, one per experiment
```

Each demo is a standalone Vite HTML entry point (see `vite.config.ts`), so
demos remain independently runnable as new ones are added.

## Available experiments

| # | Demo | Status |
|---|---|---|
| 01 | Camera Lab | Implemented |
| 02 | Image Tracking Lab | Not implemented |
| 03 | 3D Character Lab | Not implemented |
| 04 | Interaction Lab | Not implemented |
| 05 | AR Mini Game | Not implemented |
| 06 | Business Configuration Lab | Not implemented |
| 07 | Multi Target Lab | Not implemented |

## Recording results

After physically testing a demo on a real device, fill in the corresponding
file under `experiment-results/` (start from `TEMPLATE.md` for new demos).
Do not fabricate results — code running correctly in a browser is not the
same as validated AR behavior on a phone.

## Build

```bash
npm run build
npm run preview
```
