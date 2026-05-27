# Tarangini

Planning notes, product specs, and an MVP prototype for a geometry-to-CFD desktop tool built around OpenFOAM.

## Current contents

* `index.html` - dependency-free Tarangini MVP prototype
* `styles.css` - stylesheet entrypoint
* `css/` - modular style files for base rules, layout, forms, components, viewers, and responsive behavior
* `app.js` - browser entrypoint
* `js/` - modular frontend files for state, validation, rendering, geometry preview, runtime checks, and run orchestration
* `src/` - modular Rust server files for static serving, HTTP helpers, and OpenFOAM discovery
* `initial_discussion_20260422.md` - initial product and technical planning discussion
* `v1_scope.md` - agreed v1 product scope and boundaries
* `design_decisions.md` - numbered design decision log
* `product_spec_v1.md` - consolidated v1 product specification
* `architecture_v1.md` - implementation architecture for v1

## Running the MVP

Run the Rust MVP server:

```sh
cargo run
```

Then open `http://localhost:5173`.

The MVP is a local Rust-served prototype. It implements the product workflow, model preview, orientation setup, validation gates, OpenFOAM runtime detection, staged run monitor, synthetic results, and provenance export surface.

Runtime checks:

* `http://localhost:5173/api/health` - Rust server health
* `http://localhost:5173/api/openfoam` - local OpenFOAM command discovery

The MVP detects OpenFOAM commands on `PATH`, but it does not yet execute a real solver case.

## Near-term goal

Replace the simulated runtime adapter with the Tauri/Rust exchange layer described in `architecture_v1.md`.
