# Tarangini V1 Product Specification

## Overview

Tarangini v1 is a validated engineering desktop application for **Body Mode**: external aerodynamic analysis of a single rigid body imported from `STEP`/`STP`, using the full `OpenFOAM` runtime as an external backend.

Tarangini is not a general-purpose CFD sandbox. It is an opinionated workflow product built around a narrow validated envelope.

## Product Intent

Tarangini v1 is designed to:

* evaluate rigid bluff and mildly streamlined bodies in external airflow
* provide engineering-grade results within a validated operating envelope
* hide OpenFOAM workflow complexity behind a guided desktop experience
* preserve reproducibility, provenance, and explicit validation status

Tarangini v1 is not intended to:

* expose arbitrary CFD controls by default
* replace ParaView
* support compressible, multiphase, rotating, or free-surface workflows
* claim validated behavior outside its defined envelope

## Validated V1 Scope

The validated v1 workflow supports:

* one rigid external body per run
* `STEP`/`STP` geometry import only
* single-phase air
* incompressible body-mode external aerodynamics
* low-Mach operation within a validated limit
* turbulent-flow modeling using a fixed validated workflow
* a single validated median case-generation preset

The validated v1 workflow does not support:

* `STL`
* blade-mode validation
* moving or deforming bodies
* multiple flow sources
* compressible workflows
* water or multiphase flow
* free-surface problems
* direct editing of solver internals in validated mode

## User Workflow

### Project and Geometry

The user:

* creates a project
* imports one `STEP`/`STP` file through a file browser
* has that source file copied into the project folder

Tarangini then performs geometry review against the **validation standard**, not merely against minimum OpenFOAM solvability.

### Geometry Classification

The user chooses one of two analysis classes:

* `Bluff`
* `Mildly Streamlined`

Tarangini also performs its own internal geometry assessment against the validated envelope. If the internal assessment and the user choice do not match, Tarangini asks the user to confirm the intended choice.

Internally, Tarangini may predict richer shape-family classifications probabilistically and collect user feedback on those predictions. That feedback is for future product improvement only and does not alter the released validated workflow in place.

### Simulation Inputs

The user directly sets:

* body orientation
* body angle relative to flow
* freestream velocity magnitude
* altitude
* pressure
* temperature

Tarangini derives or fixes:

* freestream direction
* body placement inside the computational domain
* reference axes for drag/lift reporting
* air density
* air viscosity
* Mach number
* Reynolds number
* characteristic length
* reference area
* pressure reference

Tarangini uses:

* streamwise overall body length/span as the characteristic-length rule
* projected frontal area normal to freestream as the reference-area rule

## Physics and Numerical Model

Validated v1 runs use:

* incompressible flow only
* steady simulation only in the validated path
* `k-omega SST` as the sole validated turbulence model
* a fixed wall-function-based near-wall treatment
* a computationally conservative workflow suitable for laptop-class execution

Transient simulation, alternate turbulence models, and similar departures from the validated workflow may exist only in advanced mode and must be marked as non-validated.

Tarangini treats the validated v1 workflow as a turbulent-flow workflow. Cases outside the turbulent validated envelope do not earn validated status.

## Case Generation

Tarangini uses preset-based case generation.

Validated v1 includes exactly one validated **median** preset. In validated mode, Tarangini owns:

* domain sizing
* mesh density
* wake refinement
* near-wall layering
* solver-case construction

Non-default presets may exist only as advanced non-validated options until separately validated.

## Validation Model

Tarangini uses three visible validation states:

* `Validated`
* `Non-validated`
* `Blocked`

### Meaning of `Validated`

When Tarangini marks a run as `Validated`, it means the run stayed within a tested, theoretically supported parameter regime that is expected to produce outcomes within defined bounds.

### Product-Level Validation Basis

The validated workflow must be justified by:

* theoretical consistency
* benchmark/reference cases
* mesh-sensitivity studies
* solver convergence criteria
* comparison against trusted data

### Automatic Per-Run Validation Gates

A run earns `Validated` status only if all of the following pass:

* supported `OpenFOAM` version/configuration
* no disqualifying advanced overrides
* geometry inside validated envelope
* Mach inside validated envelope
* Reynolds inside validated envelope
* atmospheric conditions inside validated envelope
* solver convergence passes
* mesh-quality checks pass
* `y+` checks pass

### Envelope Handling

Tarangini v1:

* hard-blocks Mach values above the validated limit
* hard-blocks Reynolds values outside the validated turbulent range
* allows geometry-envelope violations only as non-validated runs
* allows atmospheric-condition violations only as non-validated runs

Validation reporting includes the final status plus a gate-by-gate summary table, with the reasons for failure or disqualification emphasized clearly.

## Advanced Mode

Tarangini provides a dedicated **Advanced** area for non-validated controls.

Examples include:

* inlet turbulence quantities
* transient simulation mode
* alternate turbulence models such as `Spalart-Allmaras`
* future non-default case-generation presets

Advanced overrides:

* must show clear warnings
* must visibly switch the run to non-validated status
* must be logged in run provenance
* must support reset back to the validated default workflow

## Run Experience

Tarangini provides:

* a simple run-progress view by default
* an on-demand advanced log view
* named workflow stages such as geometry checks, case generation, meshing, solving, and post-processing
* a simple progress indicator for each stage
* cancel and rerun controls
* no pause/resume in v1

When a run fails, Tarangini should explain the failure in user-meaningful terms, not just expose raw logs.

## Results Experience

Tarangini shows the following directly in-app:

* drag
* lift
* pressure distribution
* wake visualization
* velocity slices
* convergence summary
* mesh-quality summary
* `y+` summary
* validated/non-validated status

Tarangini also provides:

* a limited built-in results viewer
* a limited live view inside the Run Monitor during ongoing simulation where practical
* ParaView-compatible exports
* post-run handoff to ParaView for deeper inspection

## Exports

Tarangini v1 supports export of:

* report document
* CSV metrics
* images/screenshots
* full case bundle
* raw OpenFOAM results
* VTK/ParaView-compatible output

Anything derived from a run must carry that run's validation status.

## System Architecture

Tarangini uses an exchange-layer architecture similar in spirit to Kosha's orchestration pattern.

At runtime:

* Tarangini operates on the Windows side
* the full `OpenFOAM` runtime remains in its own execution domain, such as `WSL2`
* an exchange layer carries geometry, case files, commands, progress events, logs, results, and validation/status metadata across the boundary

Tarangini does not embed OpenFOAM internals directly.

## Runtime and Packaging Policy

Tarangini detects whether `OpenFOAM` is already installed.

* If a supported validated version/configuration is present, Tarangini uses it.
* If `OpenFOAM` is absent, Tarangini guides the user through installation of the validated supported version.
* If another version is present, Tarangini informs the user that validated workflows do not apply to that runtime.

## Workspace and Data Model

Tarangini uses a three-part storage model:

* project folder for durable user-facing artifacts
* local database for authoritative structured project/run state
* OpenFOAM runtime workspace for execution-side working files

The database is the authoritative source for:

* project identity
* geometry records
* simulation setups
* runs
* validation records
* result sets
* export artifacts
* stage history
* overrides
* artifact paths

Each run stores an explicit provenance snapshot, including:

* geometry version
* simulation setup values
* `OpenFOAM` version/configuration
* validation-gate results
* advanced overrides
* produced artifact paths

## UI Information Architecture

Top-level screens/work areas:

* Projects
* Geometry Setup
* Simulation Setup
* Run Monitor
* Results
* Validation Summary
* Exports

Navigation model:

* guided progression for standard use
* persistent navigation for advanced users

Validation status should remain visible throughout the app wherever relevant.
