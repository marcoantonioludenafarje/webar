# Experiment 01 — Camera Lab

## Hypothesis

The browser can reliably request rear-camera access, maintain a stable
video stream for several minutes, and expose enough information
(resolution, facing mode, start latency, FPS) to judge whether the camera
layer is a solid foundation for later WebAR tracking demos.

## Test Environment

Device:

Browser:

Operating System:

Lighting:

Target size: n/a (no tracking target in this demo)

Other conditions:

## Test Procedure

1. Open the WebAR Lab launcher and go to `01 Camera`.
2. Tap **Start** and grant camera permission when prompted.
3. Confirm the rear/environment camera is used (not front-facing).
4. Read the on-screen stats (FPS, Resolution, Facing) and the debug
   overlay (bottom-left) for the full metrics set.
5. Leave the stream running for several minutes; watch for FPS drops,
   freezes, or the browser killing the stream in the background.
6. Tap **Stop**, confirm the stream stops and the preview disappears.
7. Repeat Start/Stop a few times.
8. Optionally deny camera permission once to confirm the error path is
   understandable.
9. Use **Export metrics JSON** to save a snapshot for the record.

## Measurements

<!-- Fill in from the on-screen stats / exported JSON. -->

- Start latency:
- Camera resolution:
- Facing mode:
- Estimated FPS (steady state):
- Session duration tested:
- Camera errors encountered:

## Results

## Unexpected Behavior

## Limitations

## Observations

## Decision

- [ ] Continue
- [ ] Adjust implementation
- [ ] Repeat experiment
- [ ] Evaluate alternative technology
