# Experiments Log

Tracks what's implemented and what's been physically validated. See
[CLAUDE.md](./CLAUDE.md) §10–§16 for each demo's full spec, and
[experiment-results/](./experiment-results/) for test evidence.

| # | Demo | Implemented | Physically Tested | Result Doc |
|---|---|---|---|---|
| 01 | Camera Lab | Yes | No | [01-camera.md](./experiment-results/01-camera.md) |
| 02 | Image Tracking Lab | Yes | No | [02-image-tracking.md](./experiment-results/02-image-tracking.md) |
| 03 | 3D Character Lab | No | — | — |
| 04 | Interaction Lab | No | — | — |
| 05 | AR Mini Game | No | — | — |
| 06 | Business Configuration Lab | No | — | — |
| 07 | Multi Target Lab | No | — | — |

## Decision Matrix

Mirrors CLAUDE.md §19. Update only when backed by actual experiment results.

| Capability | Demo | Status |
|---|---:|---|
| Camera | 01 | Pending |
| Rear-camera compatibility | 01 | Pending |
| Image tracking | 02 | Pending |
| Tracking distance | 02 | Pending |
| Tracking angle | 02 | Pending |
| Tracking recovery | 02 | Pending |
| Animated GLB | 03 | Pending |
| 3D performance | 03 | Pending |
| AR touch interaction | 04 | Pending |
| UI + AR | 04 | Pending |
| Game loop | 05 | Pending |
| Gamification | 05 | Pending |
| Configuration-driven engine | 06 | Pending |
| Multi-business customization | 06 | Pending |
| Multi-target | 07 | Pending |
| Spatial experience | 07 | Pending |

## Next step

Physically test Demo 01 (Camera Lab) and Demo 02 (Image Tracking Lab) on a
real mobile device, fill in their `experiment-results/` files, then decide
whether to proceed to Demo 03 per the stop conditions in CLAUDE.md §18.
