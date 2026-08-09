# WebAR Technology Lab

## 1. Project Purpose

This repository is a **technical experimentation laboratory for browser-based Augmented Reality (WebAR)**.

The objective is **not** to build a production application yet.

The objective is to experimentally validate whether WebAR provides enough:

- tracking quality,
- stability,
- performance,
- 3D rendering capability,
- animation capability,
- touch interaction,
- game mechanics,
- configurability,
- multi-target capability,
- and mobile-browser compatibility

to later consider building a commercial product for physical businesses such as:

- restaurants,
- cafés,
- retail stores,
- entertainment venues,
- events,
- and other customer-facing physical locations.

The central hypothesis is:

> A configurable WebAR engine can provide an interactive and sufficiently stable augmented-reality experience on consumer smartphones, without requiring a native mobile application.

---

# 2. Current Project Stage

This project is currently in the:

**TECHNOLOGY VALIDATION / PROOF OF CONCEPT stage.**

Do not prematurely design this project as a SaaS platform.

Do not optimize for production scale yet.

The priority is:

1. experimentation,
2. observability,
3. learning,
4. technical validation,
5. identifying limitations.

A failed experiment is considered a valid result if it clearly identifies a technological limitation.

---

# 3. Technology Stack

Use the following stack unless an experiment explicitly requires otherwise:

- Vite
- TypeScript
- HTML
- CSS
- MindAR
- A-Frame
- GLB / glTF assets

Three.js may be used indirectly through A-Frame.

Direct Three.js integration may be evaluated later as a separate experiment if A-Frame becomes a limitation.

---

# 4. Technologies Explicitly Out of Scope

Do NOT introduce the following unless explicitly requested:

- React
- Next.js
- Angular
- Vue
- backend services
- databases
- authentication
- AWS
- Azure
- Firebase
- PWA features
- service workers
- POS integrations
- payment integrations
- NFC integrations
- loyalty systems
- real customer accounts
- production analytics platforms
- microservices
- Kubernetes
- server-side rendering

The project must remain intentionally simple during the experimentation stage.

---

# 5. Engineering Principles

## 5.1 Experiments must be incremental

Each demo builds on validated capabilities from previous demos.

Do not implement all seven demos at once.

Implement one experiment at a time.

Expected workflow:

```text
Architecture
    ↓
Demo 01
    ↓
Test physically
    ↓
Record findings
    ↓
Commit
    ↓
Demo 02
    ↓
Test physically
    ↓
Record findings
    ↓
...
```

---

## 5.2 Avoid duplicated implementations

The seven demos are not seven independent applications.

Shared functionality should progressively move into reusable modules.

Examples:

```text
CameraService
TrackingService
ARScene
MetricsService
InteractionService
AssetLoader
GameEngine
ExperienceLoader
```

However, do not over-engineer abstractions before they are necessary.

Prefer extracting reusable functionality after it appears in at least two experiments.

---

## 5.3 Experiments over visual polish

Prioritize:

- stability,
- observability,
- metrics,
- debugging,
- reproducibility.

Visual polish is secondary.

A primitive cube with good instrumentation is more valuable than a beautiful character without measurable behavior.

---

## 5.4 Preserve previous experiments

Adding a new experiment must not break previous demos.

All completed demos should remain accessible from the launcher.

---

# 6. Repository Structure

Target structure:

```text
webar-lab/
│
├── CLAUDE.md
├── README.md
├── EXPERIMENTS.md
│
├── src/
│   │
│   ├── core/
│   │   ├── camera/
│   │   ├── tracking/
│   │   ├── rendering/
│   │   ├── interaction/
│   │   └── metrics/
│   │
│   ├── games/
│   │   └── catch/
│   │
│   ├── demos/
│   │   ├── demo-01-camera/
│   │   ├── demo-02-tracking/
│   │   ├── demo-03-character/
│   │   ├── demo-04-interaction/
│   │   ├── demo-05-game/
│   │   ├── demo-06-business/
│   │   └── demo-07-multitarget/
│   │
│   └── shared/
│
├── public/
│   ├── models/
│   ├── targets/
│   ├── textures/
│   ├── sounds/
│   └── businesses/
│
└── experiment-results/
```

This structure is a guideline.

If implementation evidence suggests a simpler structure, propose the change before performing a large refactor.

---

# 7. Application Launcher

The root page should eventually work as a laboratory launcher.

Example:

```text
WebAR LAB

01 Camera
[ Launch ]

02 Image Tracking
[ Launch ]

03 3D Character
[ Launch ]

04 Interaction
[ Launch ]

05 AR Game
[ Launch ]

06 Business Configuration
[ Launch ]

07 Multi Target
[ Launch ]
```

Completed experiments should remain accessible.

Experiments not implemented yet may appear as:

```text
NOT IMPLEMENTED
```

Do not create fake implementations.

---

# 8. Debug and Metrics Overlay

Observability is a core project requirement.

Create a reusable debug overlay progressively.

Potential metrics include:

```text
FPS
camera resolution
camera facing mode
tracking status
target found count
target lost count
session duration
model load time
target acquisition time
interaction latency
current demo
device/browser information
```

Example:

```text
DEBUG

FPS                  57
Camera               1280x720
Target               FOUND
Target Found         7
Target Lost          6
Model Load           421 ms
Session              02:34
```

Metrics should not require a backend.

Where useful, support exporting experiment results locally as JSON.

---

# 9. Experiment Result Documentation

Every experiment should have an associated Markdown result file.

Example:

```text
experiment-results/
  01-camera.md
  02-image-tracking.md
```

Use approximately this template:

```markdown
# Experiment XX — Name

## Hypothesis

## Test Environment

Device:

Browser:

Operating System:

Lighting:

Target size:

Other conditions:

## Test Procedure

## Measurements

## Results

## Unexpected Behavior

## Limitations

## Observations

## Decision

- [ ] Continue
- [ ] Adjust implementation
- [ ] Repeat experiment
- [ ] Evaluate alternative technology
```

Do not invent physical test results.

Claude may prepare the template and instrumentation, but actual physical observations must be supplied by the human tester.

---

# 10. Demo 01 — Camera Lab

## Objective

Validate browser camera access and basic mobile compatibility.

## Question

> Can the browser reliably access and maintain a rear-camera stream for an AR experience?

## Required capabilities

- request camera permission,
- start camera,
- stop camera,
- prefer rear/environment camera,
- handle permission errors,
- display useful camera information,
- estimate FPS,
- support portrait mobile layout.

## Desired UI

```text
WebAR Lab / Camera

CAMERA STREAM

FPS: 58
Resolution: 1280 x 720
Facing: environment

[ Start ]
[ Stop ]
```

## Measurements

Capture when technically possible:

- start latency,
- camera resolution,
- facing mode,
- estimated FPS,
- camera errors,
- session duration.

## Acceptance criteria

- Camera starts successfully.
- Camera can remain active for several minutes.
- Start/stop works correctly.
- Errors are visible and understandable.
- Debug metrics are visible.
- Demo works independently from future AR functionality.

---

# 11. Demo 02 — Image Tracking Lab

## Objective

Validate MindAR image-target detection and tracking stability.

## Question

> How reliably can a physical printed image be recognized and tracked under realistic conditions?

## Initial AR content

Use a primitive object such as:

- cube,
- plane,
- simple text indicator.

Do not start with a complex character.

## Tracking states

Expose states such as:

```text
SEARCHING
TARGET FOUND
TARGET LOST
```

## Useful measurements

- target acquisition time,
- target found count,
- target lost count,
- recovery time when possible,
- approximate FPS.

## Physical test matrix

The human tester should evaluate:

| Condition | Result |
|---|---|
| 20 cm | |
| 50 cm | |
| 1 meter | |
| frontal | |
| 30° angle | |
| 60° angle | |
| low light | |
| strong light | |
| partial occlusion | |
| moving camera | |
| moving target | |

## Important

Do not fabricate results.

Build the tooling required to perform these measurements.

---

# 12. Demo 03 — 3D Character Lab

## Objective

Validate animated GLB/glTF rendering attached to an image target.

## Question

> Can an animated 3D character remain visually stable and performant while tracked in WebAR?

## Required capabilities

- load GLB model,
- anchor model to image target,
- play animation,
- change animation if multiple clips exist,
- adjust scale,
- adjust position,
- adjust rotation.

## Development controls

Provide an AR tuning panel where useful.

Example:

```text
AR LAB

Scale
[------●---------]

Position X
[---------●------]

Position Y
[----●-----------]

Rotation
[----------●-----]

Animation
[ Idle ] [ Dance ] [ Jump ]
```

## Evaluate

- loading time,
- perceived jitter,
- animation smoothness,
- FPS,
- asset size impact,
- tracking stability with animated content.

---

# 13. Demo 04 — Interaction Lab

## Objective

Validate interaction with AR objects.

## Question

> Can augmented objects behave as interactive UI elements rather than passive visualizations?

## Initial interaction

A simple interactive object is enough.

Example:

```text
TREASURE BOX

Tap object
    ↓
play animation
    ↓
visual effect
    ↓
score +1
```

## Capabilities to explore

- touch / tap,
- raycasting,
- visual feedback,
- object state,
- simple particles,
- audio,
- HTML overlay UI,
- animation triggered by interaction.

## Measurements

Where practical:

- tap response latency,
- interaction failures,
- FPS impact.

---

# 14. Demo 05 — AR Mini Game

## Objective

Validate WebAR as a simple gamification platform.

## Initial game

Implement:

**Catch AR**

Example flow:

```text
TIME 20
SCORE 0

      CHARACTER

Tap character
      ↓
+1 point
      ↓
character changes position
```

At timeout:

```text
GAME OVER

SCORE: 23

GOLD LEVEL

Demo Reward:
FREE FRIES

[ PLAY AGAIN ]
```

The reward is purely simulated.

No backend and no real prize system.

## Game requirements

- configurable duration,
- score,
- timer,
- start state,
- playing state,
- game-over state,
- restart,
- AR interaction,
- visual feedback.

## Evaluate

- FPS before game,
- FPS during game,
- interaction latency,
- tracking interruptions,
- game behavior after tracking recovery.

---

# 15. Demo 06 — Business Configuration Lab

## Objective

Validate whether the WebAR experience can become configuration-driven.

## Key question

> Can the same AR engine produce significantly different business experiences without modifying engine source code?

This is one of the most important architecture experiments.

## Example structure

```text
public/businesses/

polleria/
  config.json
  target.mind
  chicken.glb
  logo.png

chifa/
  config.json
  target.mind
  dragon.glb
  logo.png

cafe/
  config.json
  target.mind
  coffee.glb
  logo.png
```

## Example configuration

```json
{
  "businessId": "polleria-marco",
  "branding": {
    "name": "Pollería Marco",
    "primaryColor": "#E31B23"
  },
  "ar": {
    "target": "./target.mind",
    "model": "./chicken.glb",
    "scale": 0.7
  },
  "character": {
    "idleAnimation": "Idle",
    "hitAnimation": "Jump"
  },
  "game": {
    "type": "catch",
    "duration": 20
  },
  "reward": {
    "title": "Papas Gratis"
  }
}
```

## Desired routing concept

Something similar to:

```text
/?experience=polleria
/?experience=chifa
/?experience=cafe
```

Exact routing implementation may vary.

## Acceptance criteria

Switching configuration should be able to change:

- branding,
- target,
- 3D model,
- scale,
- animations,
- game configuration,
- demo reward.

The core AR engine must not require duplicated business-specific implementations.

---

# 16. Demo 07 — Multi Target Lab

## Objective

Validate multiple image targets and spatial gameplay.

## Question

> Can several physical targets participate in one WebAR experience with acceptable stability and performance?

## Initial concept

Use three targets:

```text
Target A → Character
Target B → Treasure
Target C → Trophy
```

## Example experience

```text
TREASURE HUNT

Find:

[ ] Character
[ ] Treasure
[ ] Trophy

0 / 3
```

When each target is detected:

```text
[x] Character
[x] Treasure
[ ] Trophy

2 / 3
```

Completion:

```text
ALL TARGETS FOUND

EXPERIMENT COMPLETE
```

## Evaluate

- simultaneous tracking capability,
- switching between targets,
- reacquisition,
- FPS,
- asset loading,
- state persistence,
- user movement through physical space.

---

# 17. Experiment Progression

The intended experiment sequence is:

```text
01 Camera
     ↓
02 Image Tracking
     ↓
03 Animated 3D
     ↓
04 Interaction
     ↓
05 Game
     ↓
06 Configurable Businesses
     ↓
07 Multi Target
```

Do not skip directly to Demo 07 unless explicitly instructed.

---

# 18. Stop Conditions

The objective is learning, not blindly completing a roadmap.

If an experiment reveals a major limitation, stop and report it.

Examples:

- unstable tracking,
- unacceptable FPS,
- severe browser incompatibility,
- excessive model-loading times,
- unreliable touch interaction,
- unacceptable jitter,
- memory issues,
- multi-target instability.

When this occurs:

1. document the finding,
2. identify likely cause,
3. propose the smallest experiment to confirm it,
4. optionally propose an alternative technology,
5. do not hide the limitation with unnecessary complexity.

---

# 19. Decision Matrix

Eventually we want evidence for the following matrix:

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

Update this only when supported by actual experiment results.

---

# 20. Coding Conventions

Prefer:

- TypeScript strictness where practical,
- small modules,
- descriptive names,
- minimal dependencies,
- browser-native APIs where reasonable,
- comments explaining AR-specific decisions,
- explicit error handling.

Avoid:

- premature design patterns,
- giant framework abstractions,
- unnecessary dependency injection,
- generic enterprise architecture,
- speculative scalability work.

The simplest implementation that produces trustworthy experimental evidence is preferred.

---

# 21. Git Strategy

Suggested commits:

```text
chore(lab): initialize WebAR laboratory

feat(demo-01): add camera capability

feat(demo-02): add image target tracking

feat(demo-03): add animated GLB character

feat(demo-04): add AR interaction

feat(demo-05): add catch mini game

feat(demo-06): add configuration-driven experiences

feat(demo-07): add multi-target tracking
```

Prefer one coherent experiment per commit.

---

# 22. How Claude Code Should Work

Before implementing a requested experiment:

1. inspect the existing project,
2. identify reusable functionality,
3. state the smallest implementation plan,
4. avoid modifying unrelated experiments,
5. implement,
6. run available checks,
7. report what changed,
8. list what must be physically tested by the user.

Do not claim that a mobile AR capability works unless it has actually been physically validated.

Code correctness and browser execution are not equivalent to successful AR validation.

---

# 23. Current Initial Instruction

Unless another explicit instruction is given, start with:

## Phase A — Project Foundation

Create:

- Vite + TypeScript project,
- initial folder structure,
- launcher,
- shared basic layout,
- experiment-results folder,
- experiment result template,
- initial README.

Then:

## Phase B — Demo 01 only

Implement the Camera Lab.

Do NOT implement demos 02–07 yet.

The architecture should allow them to be added later, but avoid speculative abstractions.

---

# 24. Definition of Success for the Entire Lab

The project is successful if, after completing or intentionally stopping the experiments, we can answer with evidence:

1. How reliable is camera access?
2. How reliable is image tracking?
3. At what angles and distances does tracking degrade?
4. How much visible jitter exists?
5. How well do animated GLB models perform?
6. Can AR objects be touched reliably?
7. Can a simple AR game run smoothly?
8. Can the same engine be customized for different businesses?
9. Can multiple physical targets participate in one experience?
10. What are the practical technological limitations?
11. Is WebAR strong enough to justify building a larger product?

The final output is not merely software.

The final output is:

> **a technical decision supported by experiments and evidence.**
