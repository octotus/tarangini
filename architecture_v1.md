# Tarangini V1 Architecture

## Purpose

This document defines the implementation architecture for Tarangini v1. It translates the product specification into runtime components, boundaries, data flow, storage rules, and module responsibilities.

Tarangini v1 is built as a desktop orchestration product around a validated `OpenFOAM` workflow. The architecture must preserve:

* strict separation between Tarangini and the `OpenFOAM` runtime
* explicit validation and provenance
* reproducible case generation and run execution
* a guided user experience with advanced non-validated escape hatches

## Architectural Principles

Tarangini v1 follows these principles:

* `OpenFOAM` remains an external backend runtime, not an embedded library layer
* the validated workflow is encoded in Tarangini-owned templates, rules, and checks
* the local database is the authoritative source of structured state
* the project filesystem stores durable artifacts referenced by the database
* the exchange layer is the only supported control/data boundary between Tarangini and the backend runtime
* advanced overrides never silently inherit validated status

## High-Level Runtime Topology

### Windows/Desktop Side

The desktop application runs on the host side and contains:

* `Tauri` application shell
* `Rust` backend/orchestration services
* `React + TypeScript` UI
* local database access
* project/workspace management
* validation logic
* export/report generation

### Backend Runtime Side

The solver backend runs in its own execution domain, typically `WSL2`, and contains:

* validated supported `OpenFOAM` runtime
* generated case directories
* mesh-generation commands
* solver execution commands
* post-processing commands
* intermediate runtime logs and artifacts

### Boundary

The boundary between the desktop side and backend side is owned by the **exchange layer**.

Nothing in the UI talks directly to `OpenFOAM`.
Nothing in the `OpenFOAM` runtime directly mutates Tarangini state.

## Primary Components

### 1. Desktop Shell

Responsibilities:

* windowing and application lifecycle
* native file dialogs
* desktop notifications and setup flows
* platform integration for runtime discovery and installation guidance

Technology:

* `Tauri 2`

### 2. UI Application

Responsibilities:

* guided workflow screens
* persistent navigation for advanced users
* display of validation status everywhere relevant
* run monitor with stage progress and basic live viewer
* results viewer and export actions
* advanced/non-validated controls tab

Technology:

* `React`
* `TypeScript`

### 3. Orchestration Core

Responsibilities:

* coordinate project lifecycle
* own validated workflow rules
* generate simulation setup objects
* manage run creation and run state transitions
* invoke exchange-layer operations
* interpret backend progress and failure states
* maintain provenance and validation records

Technology:

* `Rust`

### 4. Validation Engine

Responsibilities:

* evaluate geometry-envelope eligibility
* enforce Mach and Reynolds gates
* enforce atmospheric-condition envelope rules
* enforce validated runtime/version rules
* record validation-gate results
* produce final status:
  * `Validated`
  * `Non-validated`
  * `Blocked`

The validation engine runs:

* before run creation
* during run preparation
* after solver/post-processing completion

### 5. Case Generator

Responsibilities:

* translate Tarangini simulation setup into backend case inputs
* apply the validated median preset
* compute domain sizing automatically
* compute mesh controls automatically
* encode turbulence/wall-treatment assumptions
* write generated case configuration artifacts

Constraints:

* validated mode must not expose solver-internal edit points
* advanced mode must be marked and logged explicitly

### 6. Exchange Layer

Responsibilities:

* move structured requests and artifacts across the Windows/backend boundary
* submit backend commands
* stage input geometry into backend workspaces
* collect progress events and logs
* synchronize output artifacts back to the project workspace
* standardize transport of validation/status metadata

Contract categories:

* input geometry artifacts
* generated case files
* run commands
* stage/progress events
* logs
* result artifacts
* validation/status metadata

This layer should be designed as a reusable protocol surface, not a pile of ad hoc shell calls.

### 7. Runtime Adapter

Responsibilities:

* detect supported `OpenFOAM` installations
* verify validated version/configuration
* guide installation when missing
* map high-level run stages to concrete backend commands
* normalize command execution outputs into Tarangini event formats

The runtime adapter is specific to the supported `OpenFOAM` packaging model for v1.

### 8. Persistence Layer

Responsibilities:

* manage local database schema and migrations
* persist structured project state
* persist run state and stage history
* index filesystem artifacts
* support provenance reconstruction and comparisons

Suggested storage:

* `SQLite` for structured state

### 9. Artifact Manager

Responsibilities:

* manage project folder layout
* retain imported `STEP` copies
* retain generated reports and exported outputs
* retain selected solver/result artifacts
* map file paths into DB records

### 10. Visualization Layer

Responsibilities:

* render in-app summary results
* render limited live run views where practical
* surface ParaView handoff
* keep in-app visualization intentionally narrower than ParaView

## Data and Control Flow

### A. Project Creation and Import

1. User creates a project.
2. UI requests a file via native file browser.
3. Artifact manager copies the selected `STEP`/`STP` file into the project folder.
4. Persistence layer creates `Project` and `Geometry` records.
5. Validation engine runs geometry readiness checks.
6. UI shows body-class selection plus any mismatch prompts.

### B. Simulation Setup

1. User sets orientation, angle, speed, altitude, pressure, and temperature.
2. Orchestration core derives secondary quantities:
   * density
   * viscosity
   * Mach
   * Reynolds
   * characteristic length
   * reference area
3. Validation engine evaluates envelope compliance.
4. Persistence layer writes a `Simulation Setup` record.

### C. Run Creation

1. User requests a run.
2. Orchestration core snapshots the active setup.
3. Case generator applies the validated median preset or advanced overrides.
4. Validation engine determines initial run eligibility.
5. Persistence layer creates a `Run` record with initial validation state.

### D. Backend Execution

1. Exchange layer stages geometry and generated case files into backend workspace.
2. Runtime adapter executes backend stages:
   * geometry checks
   * case generation finalization
   * meshing
   * solving
   * post-processing
3. Progress/log events flow back through the exchange layer.
4. UI Run Monitor updates stage bars and advanced logs.
5. Basic live-view data may be refreshed where available.

### E. Completion and Result Persistence

1. Runtime adapter signals stage completion.
2. Exchange layer synchronizes result artifacts back to the project folder.
3. Validation engine executes post-run gates:
   * convergence
   * mesh quality
   * `y+`
4. Persistence layer stores:
   * `Result Set`
   * `Validation Record`
   * artifact paths
   * final run provenance snapshot
5. UI updates results and validation summary screens.

## Storage Architecture

### Project Folder

Stores durable user-facing artifacts such as:

* imported `STEP`/`STP` source copy
* exported reports
* images/screenshots
* retained result artifacts
* case bundles and raw exported backend outputs

### Local Database

Authoritative structured source for:

* projects
* geometry records
* simulation setups
* runs
* validation records
* result sets
* export artifacts
* stage history
* advanced overrides
* artifact locations

### Backend Workspace

Execution-side area for:

* generated case directories
* temporary runtime files
* solver outputs during execution
* transient logs and intermediate artifacts before synchronization

## Core Data Entities

### Project

Contains:

* project identity
* workspace root path
* created/updated timestamps
* active geometry/setup references

### Geometry

Contains:

* source filename
* copied artifact path
* geometry assessment outputs
* user-declared class
* internal predicted family/classification metadata
* geometry version identity

### Simulation Setup

Contains:

* orientation
* angle relative to flow
* speed
* altitude
* pressure
* temperature
* derived fluid properties
* derived Mach/Reynolds/reference values
* validated or advanced mode markers

### Run

Contains:

* run identity
* lifecycle status
* validation status
* current stage
* start/end timestamps
* links to geometry/setup/version snapshot

### Validation Record

Contains:

* gate-by-gate pass/fail results
* final validation status
* block/non-validation reasons
* envelope violations
* advanced override disqualifiers

### Result Set

Contains:

* drag/lift metrics
* pressure-result metadata
* wake/slice artifact links
* convergence summary
* mesh summary
* `y+` summary

### Export Artifact

Contains:

* export type
* output path
* source run
* carried validation status

## Validation Architecture

Validation is split into two levels.

### Product-Level Validation

Maintained by Tarangini development and release management:

* benchmark/reference cases
* trusted-data comparisons
* mesh-sensitivity studies
* workflow and template qualification

This produces the release-level validated envelope.

### Per-Run Validation

Executed automatically by the application for each run:

* runtime/version verification
* geometry-envelope check
* Mach gate
* Reynolds gate
* atmospheric gate
* advanced-override disqualification
* convergence gate
* mesh-quality gate
* `y+` gate

The architecture must keep these two layers separate in both code and data.

## Advanced Mode Architecture

Advanced controls live in a dedicated UI area, but the architecture also needs explicit backend consequences.

When advanced overrides are used:

* the override is stored structurally, not only as free text
* the run is flagged as non-validated before execution if appropriate
* the validation record captures the reason
* exports inherit the non-validated status
* reset-to-validated-default is available through orchestration logic

## Runtime Discovery and Installation

Startup/runtime-preflight flow:

1. detect whether `OpenFOAM` exists
2. detect version/configuration
3. compare against validated supported runtime
4. branch:
   * supported runtime present -> continue
   * no runtime -> guide installation of validated runtime
   * unsupported runtime -> allow awareness, but warn that validated workflows do not apply

Any runtime installation path must require an explicit user install action and an install-time confirmation before changing the system, WSL distro, package repositories, or OpenFOAM workspace. The runtime adapter must report a declined install as a blocked-but-recoverable setup state, not as an application failure.

This logic belongs in the runtime adapter plus onboarding/setup UI.

## UI-to-Core Boundaries

The UI should never own validated business rules directly.

The UI may:

* present inputs
* present warnings
* request actions
* render statuses and outputs

The orchestration/validation layers must own:

* derived-value calculations
* validation gates
* run-state transitions
* advanced-mode consequences
* provenance assembly

## Run State Model

Suggested run states:

* `draft`
* `ready`
* `blocked`
* `queued`
* `running`
* `failed`
* `completed`
* `cancelled`

Suggested stage states:

* `geometry_check`
* `case_generation`
* `meshing`
* `solving`
* `post_processing`
* `artifact_sync`

Validation status remains orthogonal to lifecycle state:

* a run may be `completed + validated`
* a run may be `completed + non-validated`
* a run may be `blocked`

## Error-Handling Strategy

The architecture must preserve two parallel outputs for failures:

* user-facing diagnosis
* raw technical evidence

This implies:

* normalized error categories in orchestration/runtime layers
* preserved raw logs in artifact storage
* DB links between failures and raw evidence
* UI translation into stage-aware user explanations

## ParaView Handoff

Tarangini should not treat ParaView as part of the validated execution core.

Instead:

* result exporters produce ParaView-compatible outputs
* the UI may provide a handoff/open action after run completion
* validation status remains attached to exported artifacts used in the handoff

## Future Extension Points

The architecture should anticipate, but not prematurely optimize for:

* blade mode
* additional validated case-generation presets
* additional validated turbulence/physics branches
* deeper live visualization
* Kosha integration through the exchange layer and structured run/result artifacts

These extensions should add adapters, validators, and templates, not rewrite the core boundary model.

## Recommended Implementation Order

1. project folder and local database foundation
2. core entities and run-state model
3. runtime detection/onboarding for supported `OpenFOAM`
4. exchange layer and runtime adapter
5. validated median case generator
6. validation engine and per-run gates
7. run monitor and failure-reporting UI
8. results viewer and export pipeline
9. advanced-mode framework

## Non-Goals for V1 Architecture

Do not build:

* embedded `OpenFOAM` integration
* arbitrary solver-file editing in validated workflows
* multi-solver abstraction beyond what is needed for the `OpenFOAM` backend
* ParaView replacement inside the app
* full pause/resume orchestration
