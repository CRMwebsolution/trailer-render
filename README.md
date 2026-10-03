# Pro-Trailer 3D

An interactive trailer design studio built with Three.js, vanilla JavaScript and Vite.

## What works

- Flatbed, hydraulic dump and enclosed cargo configurations.
- Adjustable deck length and width, axle class, hitch, materials, finish and signage.
- Matte, satin and gloss finishes, textured rubber and metal, safety-chain links, wiring and fasteners.
- Continuous dump tilt, cargo-door opening, ramp deployment and telescoping jack controls.
- Undo/redo, grouped slider edits, named example presets, saved thumbnails and recovery of the last design.
- Tap or select trailer components to highlight assemblies, read explanations and open their settings.
- Studio, dark and showroom lighting, plus camera presets that frame the actual model bounds.
- Selectable deck, overall, hitch-to-axle and cargo-opening measurements in imperial or metric units.
- Sized cargo envelopes with rotation, position, modeled clearance gaps and an enclosure cutaway.
- Desktop layout with separate controls, preview and specifications; phone layout with a visible 3D preview and Customize/Specifications panels.
- Save/load configuration JSON, shareable design addresses, PNG snapshots and binary GLB model export.
- Local GLB and self-contained GLTF truck imports with scale, direction and longitudinal alignment controls.
- Automatic quality adapts to device hints and sustained slow motion; high detail and battery saver retain the selected level. Import/export modules load on demand. The renderer stops drawing when the view is idle and pauses in hidden tabs.
- Keyboard focus, labeled controls, pressed states and reduced-motion support.

## Run locally

Node.js 20.19+ or 22.12+ is recommended for the current lockfile and native Vite config loader.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
npm test
```

`npm test` checks configuration normalization, saved/shared designs, metric invariants and camera fitting. It does not validate real trailer engineering.

## Important model limits

This is a visualization tool. Estimated weights use approximate material allowances; the axle-group location is a fixed 60% of deck length. Empty hitch weight assumes 12.5% for bumper pull and 22% for gooseneck. The application does not calculate loaded weight distribution, vehicle capacity, turning collision, structural strength or vehicle breakover clearance. Use manufacturer ratings and measured dimensions for real equipment.

The weight class describes the chosen modeled rating, not a certification of the generated design. Cargo configurations use an A-frame bumper-pull hitch. Dual-wheel classes require the raised 102-inch deck-over platform. Exported GLB files contain visualization meshes, not fabrication-ready CAD drawings.

## Truck models

The built-in truck is a simplified visual reference. Import a `.glb` with embedded textures through **Tow vehicle & display**. A `.gltf` is supported when its buffers and images are embedded; multi-file GLTF packages should be exported as GLB first.

The source GMC model is in `assets/1999 GMC Sierra 1500 truck/truck.blend`. It is not a browser-ready model. Open it in Blender, verify/relink its textures, and export as **glTF Binary (.glb)**. The export can then be loaded through the viewer. The application no longer probes a missing truck URL during startup.

Uploaded trucks are roughly aligned from their bounding box. Use the scale, hitch-alignment and reverse-direction controls to refine their position. This is visual alignment and does not verify towing compatibility. Custom truck data stays in the browser and is not embedded in saved/shared configurations or the trailer-only GLB export.

## Project structure

- `src/core/`: configuration rules, state and illustrative metrics.
- `src/trailers/`: reusable trailer assemblies and moving parts.
- `src/scene/`: renderer, camera, materials, dimensions and truck imports.
- `src/ui/`: controls, design actions and specifications.
- `src/export/`: binary GLB export.
- `src/tests/`: regression checks.
