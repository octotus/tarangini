# Tarangini V1 Scope

## Product Definition

Tarangini v1 is a validated engineering desktop application for **Body Mode**: external aerodynamic analysis of a single rigid body imported from `STEP`, using `OpenFOAM` as the backend.

## Backend Decision

Tarangini v1 integrates with the **full OpenFOAM package/runtime** as an external backend. It does **not** selectively extract or inherit only individual OpenFOAM libraries or modules.

The integration model is:

* generate and manage validated case files
* run OpenFOAM utilities and solvers as external processes
* parse logs, diagnostics, and result files for reporting in the Tarangini UI

## Supported Scope

Tarangini v1 supports:

* import of one rigid external body from `STEP`
* body classes limited to **bluff** and **mildly streamlined** shapes
* fixed geometry only: no motion, no deformation, no rotation
* single-phase **air** only
* **low-Mach** external airflow, with a target validated range of `Mach < 0.3`
* automatic setup of the external flow domain around the body
* a controlled meshing and solver workflow built for validation, not open-ended case editing
* engineering outputs including:
  * drag
  * lift
  * pressure distribution
  * wake visualization and velocity slices
* numerical quality reporting including:
  * convergence status
  * mesh-quality summary
  * `y+` summary
  * warnings when a case is outside the validated envelope

## Purpose

Tarangini v1 is intended for:

* engineering-grade prediction for a narrow class of external-flow body problems
* comparison and evaluation of rigid body designs in air
* a validated workflow, not a general-purpose CFD sandbox

## Explicitly Out of Scope

Tarangini v1 does not support:

* `STL` input
* blade mode or lifting-surface validation
* rotating bodies
* moving wheels, propellers, or rotors
* flexible or deforming bodies
* water or multiphase flow
* free-surface problems
* thermal analysis
* high-compressibility or supersonic regimes
* arbitrary custom `OpenFOAM` model exposure
* piecemeal extraction of selected `OpenFOAM` internals instead of using the full package/runtime
* broad "simulate anything" workflows

## One-Line Statement

Tarangini v1 is a validated `STEP`-to-`OpenFOAM` desktop tool for engineering-grade external aerodynamic analysis of a single rigid bluff or mildly streamlined body in low-Mach air flow.
