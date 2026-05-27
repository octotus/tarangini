import { $ } from "./dom.js";
import { metric, row } from "./components.js";
import { drawGeometryPreview } from "./geometryViewer.js";
import { drawWake } from "./wakeViewer.js";
import { formatBytes, formatFixed, formatSci } from "./format.js";
import { collectInputs, orientationLabel } from "./model.js";
import { derive, resultModel } from "./physics.js";
import { stageDefs, state } from "./state.js";
import { validation } from "./validation.js";
import { syncViewerFromOrientation } from "./orientation.js";

export function render() {
  syncViewerFromOrientation();
  const values = collectInputs();
  const derived = derive(values);
  const validationState = validation(values, derived);
  const results = resultModel(values, derived, validationState);

  renderGlobal(validationState);
  renderGeometry(values);
  drawGeometryPreview(values);
  renderDerived(derived);
  renderStages();
  renderOpenFoam();
  renderResults(results);
  renderValidation(validationState);
  renderExports(values, derived, validationState, results);
  drawWake(values, results);
}

function renderGlobal(validationState) {
  const pill = $("validationPill");
  pill.textContent = validationState.finalStatus;
  pill.className = `status-pill ${validationState.finalStatus.toLowerCase().replace("-", "")}`;

  $("globalStatus").textContent = state.runState[0].toUpperCase() + state.runState.slice(1);
  $("globalStatusHint").textContent =
    validationState.finalStatus === "Blocked"
      ? "Resolve blocking gates before a validated run."
      : `${validationState.finalStatus} workflow is ready to run.`;
}

function renderGeometry(values) {
  const fileOk = /\.(step|stp)$/i.test(values.geometryFile);
  const preview = values.geometryPreview;
  const items = [
    ["Source file", fileOk ? "pass" : "fail", values.geometryFile || "No file selected"],
    ["File size", values.geometryFile ? "pass" : "idle", values.geometryFile ? formatBytes(values.geometrySize) : "Select a STEP/STP file"],
    ["Preview data", preview.points.length > 0 ? "pass" : fileOk ? "warn" : "idle", preview.note],
    ["Analysis class", "pass", values.geometryClass === "bluff" ? "Bluff" : "Mildly Streamlined"],
    ["Envelope review", values.geometryEnvelope ? "pass" : "warn", values.geometryEnvelope ? "Inside v1 envelope" : "Allowed only as non-validated"]
  ];
  $("geometryReview").innerHTML = items.map(([name, status, detail]) => row(name, status, detail)).join("");

  const modified = values.geometryModified ? new Date(values.geometryModified).toLocaleString() : "No file selected";
  $("geometryMeta").innerHTML = [
    metric("File", values.geometryFile || "None"),
    metric("Size", values.geometryFile ? formatBytes(values.geometrySize) : "n/a"),
    metric("STEP schema", preview.schema || "n/a"),
    metric("Point entities", preview.points.length.toString()),
    metric("Orientation", orientationLabel(values)),
    metric("Product", preview.productName || "n/a"),
    metric("Modified", modified)
  ].join("");

  $("orientationSummary").value = orientationLabel(values);
}

function renderDerived(derived) {
  $("derivedMetrics").innerHTML = [
    metric("Density", `${formatFixed(derived.density, 3)} kg/m3`),
    metric("Viscosity", `${formatSci(derived.viscosity)} Pa s`),
    metric("Mach", formatFixed(derived.mach, 3)),
    metric("Reynolds", formatSci(derived.reynolds)),
    metric("Characteristic length", `${formatFixed(derived.characteristicLength, 2)} m`),
    metric("Reference area", `${formatFixed(derived.referenceArea, 2)} m2`)
  ].join("");
}

function renderStages() {
  $("stageList").innerHTML = stageDefs
    .map(([key, name], index) => {
      const complete = state.completed || index < state.activeStage;
      const active = index === state.activeStage && state.runState === "running";
      const progress = complete ? 100 : active ? 65 : 0;
      const label = complete ? "Complete" : active ? "Running" : "Waiting";
      return `
        <div class="stage-item">
          <div class="row-head"><strong>${name}</strong><span class="tag ${complete ? "pass" : active ? "warn" : "idle"}">${label}</span></div>
          <div class="stage-bar"><span style="width:${progress}%"></span></div>
          <p>${key}</p>
        </div>
      `;
    })
    .join("");

  $("runLog").textContent = state.log.join("\n") || "No run events yet.";
}

function renderOpenFoam() {
  const status = state.openfoam.status;
  const tagStatus = status === "available" ? "pass" : status === "checking" ? "idle" : "warn";
  const commands = state.openfoam.commands.length
    ? state.openfoam.commands.map((command) => `${command.name}: ${command.path}`).join("\n")
    : "No OpenFOAM commands detected.";
  $("openfoamStatus").innerHTML = [
    row("Runtime status", tagStatus, state.openfoam.detail),
    row("Version", status === "available" ? "pass" : "idle", state.openfoam.version || "unknown"),
    row("Commands", state.openfoam.commands.length ? "pass" : "idle", commands)
  ].join("");
}

function renderResults(results) {
  const locked = !state.completed;
  $("resultMetrics").innerHTML = locked
    ? metric("Status", "Run not completed")
    : [
        metric("Drag", `${formatFixed(results.drag, 2)} N`),
        metric("Lift", `${formatFixed(results.lift, 2)} N`),
        metric("Cd", formatFixed(results.cd, 3)),
        metric("Cl", formatFixed(results.cl, 3)),
        metric("Pressure min", `${formatFixed(results.pressureMin, 1)} Pa`),
        metric("Pressure max", `${formatFixed(results.pressureMax, 1)} Pa`)
      ].join("");

  $("qualitySummary").innerHTML = locked
    ? row("Quality checks", "idle", "Mesh, convergence, and y+ summaries appear after run completion.")
    : [
        row("Convergence", "pass", "Final residual proxy below 1e-4."),
        row("Mesh quality", "pass", "Synthetic non-orthogonality and skewness inside MVP thresholds."),
        row("y+ summary", "pass", "Wall-function y+ proxy centered in target range.")
      ].join("");
}

function renderValidation(validationState) {
  $("validationGrid").innerHTML = validationState.gates.map((gate) => row(gate.name, gate.status, gate.detail)).join("");
}

function renderExports(values, derived, validationState, results) {
  const exports = [
    ["Report document", "PDF-ready report carrying validation status."],
    ["CSV metrics", "Drag, lift, coefficients, derived values, and gate states."],
    ["Case bundle", "Generated median-preset case skeleton for backend handoff."],
    ["ParaView output", "VTK-compatible handoff placeholder for post-processing."]
  ];
  $("exportList").innerHTML = exports
    .map(([name, detail]) => row(name, state.completed ? "pass" : "idle", state.completed ? detail : "Available after a run completes."))
    .join("");

  $("provenance").textContent = JSON.stringify(
    {
      project: values.projectName,
      geometry: {
        sourceFile: values.geometryFile || null,
        userClass: values.geometryClass,
        envelopeAccepted: values.geometryEnvelope,
        preview: {
          status: values.geometryPreview.status,
          pointCount: values.geometryPreview.points.length,
          schema: values.geometryPreview.schema || null,
          bounds: values.geometryPreview.bounds
        }
      },
      setup: {
        orientation: values.orientation,
        orientationTransform: {
          yawDeg: values.yaw,
          pitchDeg: values.pitch,
          rollDeg: values.roll
        },
        angleDeg: values.angle,
        speedMps: values.speed,
        altitudeM: values.altitude,
        pressurePa: values.pressure,
        temperatureC: values.temperature,
        characteristicLengthM: values.length,
        referenceAreaM2: values.area
      },
      derived,
      validationStatus: validationState.finalStatus,
      openfoam: state.openfoam,
      runState: state.runState,
      advancedOverride: values.advancedMode ? { active: true, reason: values.overrideReason || "Unspecified" } : { active: false },
      resultSet: state.completed ? results : null
    },
    null,
    2
  );
}
