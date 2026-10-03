# Configurator upgrade checkpoints

All work stays on `codex/configurator-improvements`. Each finished upgrade is tested and published before starting the next.

- [x] Undo, redo, grouped slider/text edits, and an undoable reset.
- [x] Named starter presets, local saved designs, thumbnails, and recovery of the last design.
- [x] Selectable measurements and unit conversion, based on the procedural model and its current pose.
- [x] Continuous dump tilt, cargo doors, ramp deployment, and telescoping jack controls.
- [x] Tap or keyboard-select assemblies, highlight them, read explanations, and open their settings.
- [x] Cargo fit visualization, rotated envelopes, clearance gaps and enclosed-body cutaway.
- [x] Matte/satin/gloss paint, surface texture detail, chains, wiring, fasteners and open stake pockets.
- [x] Device-aware and frame-time-aware automatic quality, stable manual modes and deferred import/export modules.
- [x] Pinned design comparisons, highlighted changes, persisted references and printable comparison exports.
- [x] Four-view printable spec sheets with high-resolution embedded images, optional overlays/vehicle and editable design copies.
- [x] Level-trailer point-load balance, assumed cargo center, and class-rating/reaction warnings.
- [x] Adjustable reference pickup, improved vehicle detail, saved/undoable import alignment and consistent bumper hitch geometry.
- [ ] Turning/backing demonstration.

Physical dimensions, weights, fit checks, and motion remain modeled or explicitly assumed until real measurements and manufacturer data are supplied. Reference designs are examples, not verified products.

Repository checks: GitHub Actions runs unit tests, the production build, and browser/export regressions on every checkpoint. Review screenshots and the printed sheet are saved as workflow artifacts.
