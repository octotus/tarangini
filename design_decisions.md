# Tarangini Design Decisions

This document records numbered product and system design decisions for Tarangini. Numbering is stable so discussion can pause, detour, and resume without losing context.

## Future Validation Candidates

These items are currently available only through advanced/non-validated controls, or are expected to be handled that way if exposed. They are tracked here as candidates for possible future validation work.

* inlet turbulence quantities (`B.7`)
* transient simulation mode (`D.2`)
* non-default turbulence models, including `Spalart-Allmaras` (`D.3`)
* boundary-condition model choices (`D.6`)
* non-default case-generation presets beyond the validated median preset (`1.4`)

## 1. Product Workflow

### 1.1 Geometry Import Entry

Status: decided

Question:
What is the exact first-step user action for bringing a model into Tarangini?

Decision:
The user creates a project, imports a single `STEP`/`STP` file through a file browser, and Tarangini saves a copy of that source file inside the project folder.

Notes:
This establishes the project folder as the canonical local container for the imported geometry used by the case workflow.

### 1.2 Geometry Review

Status: decided

Question:
How much geometry inspection and cleanup should Tarangini expose before simulation setup?

Decision:
Tarangini v1 uses the **validation standard** as the governing threshold for geometry review, not the lower bar of basic OpenFOAM solvability. Geometry review exists to determine whether an imported `STEP`/`STP` body is suitable for the validated workflow.

Notes:
Meeting Tarangini's validation standard is assumed to automatically satisfy the more basic OpenFOAM sanity/solvability requirement. Tarangini v1 should therefore evaluate geometry against validation readiness rather than merely whether OpenFOAM can be made to run.

### 1.3 Simulation Inputs

Status: in progress

Question:
Which simulation inputs should the user set directly, and which should Tarangini fix automatically?

Decision:
Category A, Geometry Placement:

* `A.1` body orientation is user-defined.
* `A.2` angle relative to flow is user-defined.
* `A.3` body position inside the computational domain is not exposed; Tarangini places the body automatically using the validated domain-construction rules.
* `A.4` symmetry mode is not exposed in v1; Tarangini runs whole-body simulations only.
* `A.5` reference axes for drag/lift reporting are not exposed; Tarangini defines them automatically from the incoming flow and the user-defined body orientation.

Category B, Flow Conditions:

* `B.1` freestream velocity magnitude is user-defined and checked against the validated v1 operating range.
* `B.2` flow direction is not exposed directly; Tarangini keeps a single uniform freestream direction fixed internally and the user defines the body's orientation relative to that flow. V1 does not support multiple flow sources or multiple inflow directions.
* `B.3` air density is not entered directly by the user; Tarangini derives it from higher-level test conditions such as pressure, altitude, and related atmospheric inputs.
* `B.4` air viscosity is not entered directly by the user; Tarangini derives it from the same atmospheric/test-condition model used for density so the fluid properties remain internally consistent.
* `B.5` altitude, pressure, and temperature are user-adjustable high-level atmospheric inputs with defaults. Initial defaults are mean sea level altitude, `1 bar` pressure, and `30 deg C` temperature.
* `B.6` CFD pressure reference is not exposed to the user; Tarangini manages it internally as part of the validated solver setup.
* `B.7` inlet turbulence quantities are software-controlled by default. Tarangini may expose them only through a hidden advanced override path with a strong warning, persistent non-validated/custom-run status, full override logging, and a one-step reset to return control to the validated default workflow.

Category C, Operating-Regime Inputs:

* `C.1` Mach number is not entered directly by the user; Tarangini derives it from the test conditions, displays it, and validates/enforces the v1 operating limit.
* `C.2` Reynolds number is not entered directly by the user; Tarangini derives it from the test conditions and a fixed documented rule for characteristic length.
* `C.3` characteristic length is not user-defined in validated mode. Tarangini derives it automatically from the imported geometry, the user-defined orientation, and the fixed freestream direction, using the maximum overall body length/span in the flow direction as the documented rule.
* `C.4` reference area is not user-defined in validated mode. Tarangini derives it automatically from the oriented geometry and the fixed freestream direction using projected frontal area normal to the freestream as the documented rule.
* `C.5` reference length for coefficient normalization reuses the same characteristic-length rule used for Reynolds number, rather than introducing a separate v1 length convention.

Category D, Physics-Model Inputs:

* `D.1` flow formulation is not user-selectable in v1; Tarangini supports incompressible flow only and excludes compressible workflows from the validated envelope.
* `D.2` steady simulation is the validated v1 path. Transient simulation may be exposed only through an advanced override path with clear warnings and persistent non-validated/custom-run status.
* `D.3` validated v1 runs use a single turbulence model: `k-omega SST`. Other turbulence models, including `Spalart-Allmaras`, may be exposed only through advanced non-validated override controls.
* `D.4` validated v1 runs use a fixed, computationally conservative wall-treatment strategy paired with `k-omega SST`. Tarangini uses a wall-function-based near-wall workflow and does not expose wall-treatment selection in validated mode.
* `D.5` validated mode assumes a turbulent-flow modeling workflow. Tarangini does not treat laminar or transition-sensitive cases as part of the validated v1 path; cases outside the turbulent validated envelope are explicitly flagged and stamped as non-validated/outside-envelope.
* `D.6` boundary-condition model choices are not exposed in validated mode; Tarangini owns them as part of the fixed validated workflow.

Notes:
Symmetry may be exposed later only after Tarangini can test and validate symmetric-case assumptions rigorously. Until then, full-domain simulation is the default for v1.

### 1.4 Case Generation

Status: decided

Question:
How opinionated should automatic domain, meshing, and solver-case generation be in v1?

Decision:
Tarangini v1 uses preset-based case generation. The validated v1 workflow supports a single **median** preset. Other case-generation presets may exist only as advanced/non-validated options until they are separately validated.

Notes:
Tarangini owns the underlying domain, meshing, and solver-case construction logic. Non-default presets are tracked as future validation candidates.

### 1.4.1 Domain Sizing

Status: decided

Question:
Should Tarangini compute the external domain size entirely automatically from the body geometry and orientation, or should even the validated median preset expose limited user sizing control?

Decision:
Tarangini computes domain size automatically in the validated workflow based on the default validated median preset.

Notes:
User-facing domain-sizing control is not exposed in the validated v1 path.

### 1.4.2 Mesh Density

Status: decided

Question:
For the validated path, should mesh density be locked to the single validated median preset, with any coarser/finer choices only in advanced non-validated mode?

Decision:
Yes. Mesh density is fixed by the validated median preset in v1. Other mesh-density choices are advanced/non-validated until separately validated.

Notes:
The validated workflow does not expose user control over mesh density.

### 1.4.3 Wake Refinement

Status: decided

Question:
Should wake refinement be fixed as part of the validated preset, with no user control in validated mode?

Decision:
Yes. Wake refinement is set by Tarangini as part of the validated median preset.

Notes:
The validated workflow does not expose user control over wake-refinement settings.

### 1.4.4 Near-Wall Layering

Status: decided

Question:
Should Tarangini control near-wall layering completely in validated mode?

Decision:
Yes. Tarangini controls near-wall layering completely as part of the validated median preset.

Notes:
The validated workflow does not expose layer count, thickness, growth, or related near-wall mesh controls.

### 1.4.5 Solver-Case Construction

Status: decided

Question:
Should users be able to edit or choose among solver dictionary details, numerics, and case-file structure in validated mode?

Decision:
No. Tarangini owns solver-case construction completely in validated mode.

Notes:
No user editing of generated OpenFOAM case internals is exposed in the validated workflow. Any such editing belongs only in advanced non-validated workflows.

### 1.5 Run Experience

Status: in progress

Question:
What should the run/monitoring experience expose during simulation execution?

Decision:
Run visibility is simple by default, with an advanced logger view available on demand.

Notes:
The validated workflow should not force solver-log complexity on normal users, but advanced users may inspect detailed logs when needed.

### 1.5.1 Run Visibility

Status: decided

Question:
Should the user see only a simple progress/status view, or should Tarangini also expose detailed solver logs during the run?

Decision:
Tarangini shows a simple progress/status view by default and provides an advanced logger view on demand.

Notes:
Detailed logs are available without making them part of the default user experience.

### 1.5.2 Run Stages

Status: decided

Question:
Should Tarangini show named workflow stages during execution?

Decision:
Yes. Tarangini shows named workflow stages such as geometry checks, case generation, meshing, solving, and post-processing.

Notes:
Each stage should have a simple progress bar and an on-demand deeper log view.

### 1.5.3 Run Controls

Status: decided

Question:
Should the user be able to cancel, pause/resume, or rerun a simulation?

Decision:
Tarangini v1 supports cancel and rerun. Pause/resume is not part of v1.

Notes:
Pause/resume is excluded from v1 because it adds process-state, restart, and workflow-complexity that is not essential to the first validated product.

### 1.5.4 Failure Handling

Status: decided

Question:
When a run fails, what should Tarangini do?

Decision:
Tarangini should provide as much user-meaningful failure information as possible, without forcing the user to interpret raw error logs as the primary failure explanation.

Notes:
Tarangini should clearly identify what stage failed, explain what likely broke in user-facing terms, preserve deeper logs for inspection, and support rerun after corrections.

### 1.6 Results Experience

Status: in progress

Question:
What results should be shown in-app versus exported or handed off to external tools?

Decision:
Tarangini v1 shows a full core result set directly in-app for every completed run.

Notes:
In-app results should include both engineering outputs and numerical/validation-status diagnostics.

### 1.6.1 Core In-App Results

Status: decided

Question:
Which core results should Tarangini show directly in-app for every completed validated run?

Decision:
Tarangini v1 shows all of the following directly in-app:

* drag
* lift
* pressure distribution
* wake visualization
* velocity slices
* convergence summary
* mesh-quality summary
* `y+` summary
* validated / non-validated status stamp

Notes:
The in-app results experience should cover both engineering outputs and workflow-quality diagnostics.

### 1.6.2 Exports

Status: decided

Question:
Which result artifacts should Tarangini export directly in v1?

Decision:
Tarangini v1 supports export of:

* report document
* CSV metrics
* images/screenshots
* full case bundle
* raw OpenFOAM results
* VTK/ParaView-compatible output

Notes:
These exports support communication, comparison, reproducibility, advanced inspection, and external visualization workflows.

### 1.6.3 External Visualization Handoff

Status: decided

Question:
Should Tarangini explicitly support a handoff to external visualization tools like ParaView, or just export compatible files and leave the rest to the user?

Decision:
Tarangini v1 provides a limited built-in viewer for core results and supports handoff to ParaView after the run is over.

Notes:
The built-in viewer may also support a limited live view of the ongoing simulation where practical. Tarangini should export ParaView-compatible results and support ParaView as the primary deeper external visualization path without trying to replace it in v1.

## 2. Validated Physics Envelope

Status: in progress

### 2.1 Supported Body Class Assessment

Status: decided

Question:
How should Tarangini determine whether an imported body belongs to the supported validated body class?

Decision:
Tarangini should both assess the body internally and take a body-class input from the user. If Tarangini's internal assessment and the user's declared choice do not match, Tarangini should explicitly ask the user to confirm that they want to proceed with that choice.

Notes:
The internal assessment should be based on deterministic rule-based geometry screening against the validated envelope, not only on user declaration.

### 2.1.1 User-Facing Body Class vs Internal Family Prediction

Status: decided

Question:
Should Tarangini expose only coarse body-class choices to the user while internally predicting richer shape families and collecting user feedback on those predictions?

Decision:
Yes. Tarangini exposes only `Bluff` and `Mildly Streamlined` as user-facing analysis options, while internally predicting higher-resolution shape-family classifications probabilistically. Tarangini may ask the user to confirm or reject those internal predictions and store the feedback for future improvement.

Notes:
User feedback is for long-term product improvement only. It does not modify or retrain the current validated workflow in-place and must not change the behavior of the released validated system during use.

### 2.2 Validated Mach Envelope Handling

Status: decided

Question:
Should Tarangini v1 hard-block cases above the validated Mach limit, or allow them to run but stamp them as outside the validated envelope?

Decision:
Tarangini v1 hard-blocks cases above the validated Mach limit.

Notes:
The reason is not only validation discipline but also uncertainty about software behavior outside the intended incompressible low-Mach regime. Tarangini should not permit runs in a regime it does not yet understand or control adequately.

### 2.3 Validated Reynolds Envelope Handling

Status: decided

Question:
Should Tarangini hard-block cases outside the validated Reynolds range, or allow them but stamp them as outside the turbulent validated envelope?

Decision:
Tarangini v1 hard-blocks cases outside the validated Reynolds range.

Notes:
For v1, Tarangini should not allow runs in Reynolds regimes that are outside the validated turbulent envelope.

### 2.4 Geometry-Envelope Handling

Status: decided

Question:
If a shape is outside the validated geometric envelope, should Tarangini hard-block it or allow it as a non-validated advanced run?

Decision:
Tarangini allows such cases to run only as non-validated runs and explicitly stamps the results as non-validated.

Notes:
Geometry-envelope violations are treated more flexibly than Mach or Reynolds violations in v1, but the validated status must be removed clearly and persistently.

### 2.5 Atmospheric-Condition Envelope

Status: decided

Question:
Should Tarangini validate and limit atmospheric inputs such as altitude, pressure, and temperature to a bounded range for v1, or allow any values and just derive properties?

Decision:
Tarangini uses two layers. The validated workflow enforces bounded atmospheric-condition limits. Inputs outside those limits may still be allowed, but the run and its results must be stamped as non-validated.

Notes:
Atmospheric-condition violations do not automatically require a hard block in v1, but they do remove validated status.

### 2.6 Validation Status Model

Status: decided

Question:
Should Tarangini have a single visible status system such as `Validated`, `Non-validated`, and `Blocked`, with explicit reasons attached?

Decision:
Yes. Tarangini uses a single visible validation-status model with the states `Validated`, `Non-validated`, and `Blocked`, and it always attaches explicit reasons for the current status.

Notes:
This status model should be applied consistently across geometry checks, atmospheric inputs, operating-envelope checks, and advanced overrides.

## 3. System Architecture

Status: in progress

### 3.1 Runtime Model

Status: decided

Question:
How should Tarangini be structured at runtime?

Decision:
Tarangini uses an exchange-layer architecture. Tarangini operates on the Windows side, while the full `OpenFOAM` runtime remains in its own execution domain such as `WSL2` or another backend terminus. Tarangini orchestrates data and control flow across that boundary rather than embedding OpenFOAM internals directly.

Notes:
This follows the same broad model used in Kosha: a dedicated exchange layer coordinates data sharing between components and modules. OpenFOAM remains an external backend runtime driven by generated case files, commands, logs, and results exchanged through that orchestration layer.

### 3.2 Exchange-Layer Contract

Status: decided

Question:
What should the exchange layer carry between Tarangini and OpenFOAM?

Decision:
The exchange layer carries the full workflow contract, including:

* input geometry artifacts
* generated case files
* run commands
* stage/progress events
* logs
* result artifacts
* validation/status metadata

Notes:
This broader contract also creates a future path for integration with Kosha, where structured case, result, and validation artifacts may later be combined with paper-interpretation and research-assistance workflows.

### 3.3 Project Workspace Model

Status: decided

Question:
Where should the authoritative project data live?

Decision:
Tarangini uses a three-part workspace model:

* the project folder stores durable user-facing project artifacts
* the local database stores structured project/run metadata
* the OpenFOAM runtime domain stores execution-side working files that are synchronized back as needed

Notes:
The local database records the file locations of project artifacts. The project folder holds items such as the imported `STEP` copy, exported reports, and retained result artifacts. The OpenFOAM-side workspace holds generated case directories, temporary/intermediate runtime files, and execution logs during the run lifecycle.

### 3.4 Local Database Role

Status: decided

Question:
Should the local database be treated as a cache/index over the filesystem, or as the authoritative source of structured truth for projects/runs/status?

Decision:
The local database is the authoritative source of structured project and run state. The filesystem stores large artifacts and durable files referenced by that structured state.

Notes:
Tarangini should treat the database as the canonical record for metadata such as project identity, run identity, parameters, validation status, stage history, overrides, and artifact locations.

### 3.5 OpenFOAM Runtime Packaging and Detection

Status: decided

Question:
How should Tarangini expect OpenFOAM to exist on the backend side?

Decision:
Tarangini detects whether `OpenFOAM` is already present. If it is present, Tarangini checks whether it matches the validated supported version/configuration. If no `OpenFOAM` runtime is found, Tarangini guides the user through installation of the validated supported version. If a different version is present, Tarangini informs the user that validated workflows will not apply to that runtime.

Notes:
Tarangini should handle this through user-facing setup flow such as modals or setup windows rather than failing silently or cryptically.

## 4. Validation Plan

Status: in progress

### 4.1 Meaning of a Validated Claim

Status: decided

Question:
When Tarangini says a run is `Validated`, what exactly is it claiming?

Decision:
When Tarangini marks a run as `Validated`, it means the parameters used for the analysis fall within a regime that has been tested theoretically and is expected to produce outcomes within defined bounds.

Notes:
Validated status means more than successful execution. It asserts that the run stayed within a tested, theoretically supported parameter envelope with expected outcome behavior.

### 4.2 Required Validation Evidence

Status: decided

Question:
What kinds of evidence should Tarangini require for validation?

Decision:
Tarangini's validation basis requires all of the following:

* theoretical consistency
* benchmark/reference cases
* mesh-sensitivity studies
* solver convergence criteria
* comparison against trusted data

Notes:
These evidence types do not all operate at the same stage. Mesh-sensitivity studies and benchmark/trusted-data comparisons are required to establish the validated envelope and methodology. Solver convergence criteria are required on each validated user run. Theoretical consistency applies across both the validation program and the released workflow.

### 4.3 Product-Level Validation vs Per-Run Validation

Status: decided

Question:
Should Tarangini distinguish between product-level validation evidence and per-run validation checks?

Decision:
Yes. Tarangini separates product-level validation work from per-run validation checks.

Notes:
Product-level validation is performed by Tarangini's developers to establish the validated workflow and envelope. Per-run validation is handled automatically by Tarangini and checks whether a specific user run stayed within that validated workflow, met run-quality criteria, and avoided disqualifying conditions. Users are not expected to perform a fresh validation study for every run.

### 4.4 Automatic Per-Run Validation Gates

Status: decided

Question:
What should Tarangini check automatically on every run to award `Validated` status?

Decision:
Tarangini requires all of the following automatic per-run gates to pass before awarding `Validated` status:

* supported `OpenFOAM` version/configuration
* no disqualifying advanced overrides
* geometry inside validated envelope
* Mach inside validated envelope
* Reynolds inside validated envelope
* atmospheric conditions inside validated envelope
* solver convergence passes
* mesh-quality checks pass
* `y+` checks pass

Notes:
Failure of any of these checks prevents the run from being awarded `Validated` status.

### 4.5 Validation Reporting

Status: decided

Question:
Should Tarangini expose just the final status, or also the specific gate-by-gate validation checklist with pass/fail reasons?

Decision:
Tarangini exposes the final validation status together with a gate-by-gate summary table.

Notes:
The validation summary should emphasize the factors that led to failure or loss of validated status, so users can immediately see what disqualified the run.

## 5. UI Information Architecture

Status: in progress

### 5.1 Top-Level Screens

Status: decided

Question:
What are the top-level screens or work areas Tarangini should have in v1?

Decision:
Tarangini v1 uses the following top-level screens/work areas:

* Projects
* Geometry Setup
* Simulation Setup
* Run Monitor
* Results
* Validation Summary
* Exports

Notes:
These screens separate setup, execution, analysis, validation, and artifact handoff clearly.

### 5.2 Navigation Model

Status: decided

Question:
Should Tarangini behave like a wizard, a free workspace, or a hybrid?

Decision:
Tarangini uses a hybrid navigation model. It provides guided progression for standard use and persistent navigation across major sections for advanced users.

Notes:
The guided progression should feel more polished and hide more detail by default. Persistent navigation should remain available for users who want direct access to screens and deeper control/inspection.

### 5.3 Validation Visibility

Status: decided

Question:
Should validation status be visible only on the dedicated Validation Summary screen, or visible persistently throughout the app wherever relevant?

Decision:
Validation status is visible persistently throughout the app wherever relevant, with the detailed gate-by-gate breakdown available on the Validation Summary screen.

Notes:
The user should not need to navigate to a separate screen to discover whether a workflow is validated, non-validated, or blocked.

### 5.4 Advanced Controls Presentation

Status: decided

Question:
Should advanced/non-validated controls live under one unified area or be scattered contextually across screens?

Decision:
Tarangini uses a dedicated Advanced menu/tab for advanced and non-validated controls.

Notes:
This keeps non-validated controls centralized, explicit, and visually separated from the normal validated workflow.

### 5.5 Live Results During Run

Status: decided

Question:
Should live results be embedded directly in the Run Monitor, or only appear after the run completes?

Decision:
Live results are embedded directly in the Run Monitor.

Notes:
Tarangini should provide a basic viewer for the results of the ongoing simulation while the run is in progress.

## 6. Data Model

Status: in progress

### 6.1 Core Entities

Status: decided

Question:
What are the main objects Tarangini should store as first-class records?

Decision:
Tarangini stores the following as first-class records:

* Project
* Geometry
* Simulation Setup
* Run
* Validation Record
* Result Set
* Export Artifact

Notes:
These entities cover the main lifecycle from imported model through execution, validation, results, and export.

### 6.2 Project Versioning and History

Status: decided

Question:
Should a `Project` be able to contain multiple geometries, multiple simulation setups, multiple runs, and a history of changes?

Decision:
Yes. A project can contain multiple geometries, multiple simulation setups, multiple runs, and a history of changes.

Notes:
This supports comparison, reproducibility, provenance, and iterative design work within a single project.

### 6.3 Validation Status Attachment

Status: decided

Question:
Should validation status be attached only to a `Run`, or also to the simulation setup, geometry assessment, and exported reports/artifacts?

Decision:
Validation status originates from the run and must be carried through to exported reports and artifacts. Anything derived from a run should carry that run's validation status.

Notes:
This ensures that exported outputs cannot become detached from their validation state. Reports and artifacts must visibly preserve the validated, non-validated, or blocked context of the originating run.

### 6.4 Run Provenance

Status: decided

Question:
Should each `Run` explicitly snapshot the geometry version used, simulation setup values, `OpenFOAM` version/configuration, validation-gate results, advanced overrides used, and artifact paths produced?

Decision:
Yes. Each run stores an explicit provenance snapshot covering geometry version, simulation setup, `OpenFOAM` version/configuration, validation-gate results, advanced overrides, and produced artifact paths.

Notes:
This supports reproducibility, auditability, export traceability, and later comparison across runs and product versions.
