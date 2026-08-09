# Experiment 02 — Image Tracking Lab

## Hypothesis

MindAR can reliably detect and track a printed 2D image target from a live
rear-camera feed on a consumer phone, with acquisition/recovery times and
a frame rate low enough in latency and high enough in FPS to support a
usable AR experience — across a range of realistic distances, angles, and
lighting conditions.

## Test Environment

Device:

Browser:

Operating System:

Lighting:

Target size: MindAR sample card (`public/targets/demo-02/card.png`), printed at ___ cm, or your own target at ___ cm

Other conditions:

## Test Procedure

1. Print `public/targets/demo-02/card.png` (or display it on a second
   screen/phone) — or compile your own target image at
   https://hiukim.github.io/mind-ar-js-doc/tools/compile and replace
   `public/targets/demo-02/card.mind`.
2. Open the WebAR Lab launcher and go to `02 Image Tracking`.
3. Tap **Start**, grant camera permission if prompted.
4. Point the camera at the target and confirm the status pill moves
   SEARCHING → TARGET FOUND, and a green cube + "TARGET FOUND" label
   appear anchored to the image.
5. Move the target/camera out of frame and back in; confirm TARGET LOST
   is counted and the cube reappears on reacquisition.
6. Work through the physical test matrix below.
7. Use **Export metrics JSON** to save a snapshot after each condition if
   useful.

## Measurements

<!-- Fill in from the on-screen stats / exported JSON. -->

- Target acquisition time (first SEARCHING → FOUND):
- Target found count:
- Target lost count:
- Recovery time (last LOST → FOUND):
- Estimated FPS (steady state, tracking active):

## Physical Test Matrix

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

## Results

## Unexpected Behavior

## Limitations

## Observations

## Decision

- [ ] Continue
- [ ] Adjust implementation
- [ ] Repeat experiment
- [ ] Evaluate alternative technology
