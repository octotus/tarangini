import { $, bindInputs } from "./dom.js";
import { resetOrientation, useViewerOrientation } from "./orientation.js";
import { readGeometryFile } from "./stepPreview.js";
import { installOpenFoam, refreshOpenFoam } from "./runtime.js";
import { render } from "./render.js";
import { resetRun, startRun } from "./run.js";
import { inputs, state } from "./state.js";

const inputIds = [
  "projectName",
  "geometryFile",
  "geometryClass",
  "geometryEnvelope",
  "orientation",
  "yaw",
  "pitch",
  "roll",
  "angle",
  "speed",
  "altitude",
  "pressure",
  "temperature",
  "length",
  "area",
  "advancedMode",
  "overrideReason"
];

export function bindApp() {
  bindInputs(inputIds, render);
  inputs.geometryFile.addEventListener("change", readGeometryFile);
  bindNav();
  bindRunControls();
  bindOrientationControls();
  bindGeometryCanvas();
}

function bindNav() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.section = button.dataset.section;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".section").forEach((section) => section.classList.toggle("active", section.id === state.section));
      $("sectionTitle").textContent = button.textContent;
      render();
    });
  });
}

function bindRunControls() {
  $("startRun").addEventListener("click", startRun);
  $("resetRun").addEventListener("click", resetRun);
  $("refreshOpenFoam").addEventListener("click", refreshOpenFoam);
  $("installOpenFoam").addEventListener("click", installOpenFoam);
}

function bindOrientationControls() {
  $("resetOrientation").addEventListener("click", resetOrientation);
  $("useViewerOrientation").addEventListener("click", useViewerOrientation);
  bindAngleInput("yaw", "yawValue", -180, 180);
  bindAngleInput("pitch", "pitchValue", -60, 60);
  bindAngleInput("roll", "rollValue", -90, 90);
}

function bindAngleInput(sliderId, numberId, min, max) {
  inputs[numberId] = $(numberId);
  inputs[numberId].addEventListener("input", () => {
    const value = Number(inputs[numberId].value);
    if (!Number.isFinite(value)) return;
    inputs[sliderId].value = Math.max(min, Math.min(max, value));
    render();
  });
  inputs[numberId].addEventListener("change", () => {
    const value = Number(inputs[numberId].value);
    inputs[sliderId].value = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
    inputs[numberId].value = inputs[sliderId].value;
    render();
  });
}

function bindGeometryCanvas() {
  const geometryCanvas = $("geometryCanvas");
  geometryCanvas.addEventListener("pointerdown", (event) => {
    state.viewerDragging = true;
    state.viewerLastX = event.clientX;
    state.viewerLastY = event.clientY;
    geometryCanvas.setPointerCapture(event.pointerId);
  });
  geometryCanvas.addEventListener("pointermove", (event) => {
    if (!state.viewerDragging) return;
    const dx = event.clientX - state.viewerLastX;
    const dy = event.clientY - state.viewerLastY;
    state.viewerAngle += dx * 0.012;
    state.viewerTilt = Math.max(-0.9, Math.min(0.9, state.viewerTilt + dy * 0.008));
    inputs.yaw.value = Math.round((state.viewerAngle * 180) / Math.PI);
    inputs.pitch.value = Math.round((state.viewerTilt * 180) / Math.PI);
    state.viewerLastX = event.clientX;
    state.viewerLastY = event.clientY;
    render();
  });
  geometryCanvas.addEventListener("pointerup", () => {
    state.viewerDragging = false;
  });
  geometryCanvas.addEventListener("pointercancel", () => {
    state.viewerDragging = false;
  });
}
