# Tarangini

Planning notes, product specs, and an MVP prototype for a geometry-to-CFD desktop tool built around OpenFOAM.

## Current contents

* `index.html` - dependency-free Tarangini MVP prototype
* `styles.css` - MVP application styling
* `app.js` - local workflow, validation, run monitor, results, and provenance logic
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

The MVP is a local Rust-served prototype. It implements the product workflow, validation gates, staged run monitor, synthetic results, and provenance export surface. It does not yet invoke a real OpenFOAM runtime.

## Near-term goal

Replace the simulated runtime adapter with the Tauri/Rust exchange layer described in `architecture_v1.md`.
