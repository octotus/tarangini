const state = {
  section: "project",
  runState: "draft",
  runTimer: null,
  activeStage: -1,
  completed: false,
  viewerAngle: -0.45,
  viewerTilt: 0.2,
  viewerDragging: false,
  viewerLastX: 0,
  viewerLastY: 0,
  geometryPreview: {
    fileName: "",
    status: "empty",
    points: [],
    bounds: null,
    schema: "",
    productName: "",
    note: "No geometry selected."
  },
  log: []
};

const stageDefs = [
  ["geometry_check", "Geometry checks"],
  ["case_generation", "Case generation"],
  ["meshing", "Meshing"],
  ["solving", "Solving"],
  ["post_processing", "Post-processing"],
  ["artifact_sync", "Artifact sync"]
];

const inputs = {};

function $(id) {
  return document.getElementById(id);
}

function numberValue(id) {
  return Number(inputs[id].value || 0);
}

function collectInputs() {
  const file = inputs.geometryFile.files[0];
  return {
    projectName: inputs.projectName.value.trim() || "Untitled Project",
    geometryFile: file ? file.name : "",
    geometrySize: file ? file.size : 0,
    geometryModified: file ? file.lastModified : null,
    geometryPreview: state.geometryPreview,
    geometryClass: inputs.geometryClass.value,
    geometryEnvelope: inputs.geometryEnvelope.checked,
    orientation: inputs.orientation.value,
    angle: numberValue("angle"),
    speed: numberValue("speed"),
    altitude: numberValue("altitude"),
    pressure: numberValue("pressure"),
    temperature: numberValue("temperature"),
    length: numberValue("length"),
    area: numberValue("area"),
    advancedMode: inputs.advancedMode.checked,
    overrideReason: inputs.overrideReason.value.trim()
  };
}

function derive(values) {
  const tempK = values.temperature + 273.15;
  const density = values.pressure / (287.05 * tempK);
  const sutherlandC = 110.4;
  const refTemp = 273.15;
  const refViscosity = 0.00001716;
  const viscosity = refViscosity * ((refTemp + sutherlandC) / (tempK + sutherlandC)) * Math.pow(tempK / refTemp, 1.5);
  const soundSpeed = Math.sqrt(1.4 * 287.05 * tempK);
  const mach = values.speed / soundSpeed;
  const reynolds = density * values.speed * values.length / viscosity;
  return {
    density,
    viscosity,
    soundSpeed,
    mach,
    reynolds,
    characteristicLength: values.length,
    referenceArea: values.area
  };
}

function validation(values, derived) {
  const fileOk = /\.(step|stp)$/i.test(values.geometryFile);
  const gates = [
    {
      key: "runtime",
      name: "Runtime",
      status: "pass",
      detail: "MVP uses a simulated OpenFOAM adapter. Real runtime detection is not wired yet."
    },
    {
      key: "geometry_file",
      name: "Geometry file",
      status: fileOk ? "pass" : "fail",
      detail: fileOk ? "STEP/STP geometry selected." : "Select a STEP or STP file to create a validated run."
    },
    {
      key: "geometry_envelope",
      name: "Geometry envelope",
      status: values.geometryEnvelope ? "pass" : "warn",
      detail: values.geometryEnvelope ? "User review marks geometry inside v1 envelope." : "Geometry can run only as non-validated."
    },
    {
      key: "mach",
      name: "Mach gate",
      status: derived.mach < 0.3 ? "pass" : "fail",
      detail: derived.mach < 0.3 ? "Low-Mach incompressible condition satisfied." : "Mach must remain below 0.3."
    },
    {
      key: "reynolds",
      name: "Reynolds gate",
      status: derived.reynolds >= 100000 && derived.reynolds <= 10000000 ? "pass" : "fail",
      detail: "Validated turbulent MVP envelope is 1.0e5 to 1.0e7."
    },
    {
      key: "atmosphere",
      name: "Atmospheric envelope",
      status: values.altitude <= 3000 && values.pressure >= 70000 && values.pressure <= 110000 ? "pass" : "warn",
      detail: "MVP validated defaults target near-ground air conditions."
    },
    {
      key: "advanced",
      name: "Advanced overrides",
      status: values.advancedMode ? "warn" : "pass",
      detail: values.advancedMode ? "Advanced controls disqualify validated status." : "Validated median preset is active."
    }
  ];

  if (state.completed) {
    gates.push(
      { key: "convergence", name: "Convergence", status: "pass", detail: "Residual trend reached MVP completion threshold." },
      { key: "mesh", name: "Mesh quality", status: "pass", detail: "Synthetic mesh-quality summary is inside MVP limits." },
      { key: "yplus", name: "y+ summary", status: "pass", detail: "Synthetic wall-function y+ band is acceptable." }
    );
  } else {
    gates.push(
      { key: "convergence", name: "Convergence", status: "idle", detail: "Available after a run completes." },
      { key: "mesh", name: "Mesh quality", status: "idle", detail: "Available after meshing completes." },
      { key: "yplus", name: "y+ summary", status: "idle", detail: "Available after post-processing completes." }
    );
  }

  const hasFail = gates.some((gate) => gate.status === "fail");
  const hasWarn = gates.some((gate) => gate.status === "warn");
  const finalStatus = hasFail ? "Blocked" : hasWarn ? "Non-validated" : "Validated";
  return { gates, finalStatus };
}

function resultModel(values, derived, validationState) {
  const classFactor = values.geometryClass === "bluff" ? 1.05 : 0.42;
  const angleFactor = 1 + Math.abs(values.angle) / 50;
  const dynamicPressure = 0.5 * derived.density * values.speed * values.speed;
  const drag = dynamicPressure * values.area * classFactor * angleFactor;
  const lift = dynamicPressure * values.area * Math.sin((values.angle * Math.PI) / 180) * 0.7;
  return {
    drag,
    lift,
    cd: drag / (dynamicPressure * values.area),
    cl: values.area > 0 ? lift / (dynamicPressure * values.area) : 0,
    pressureMin: -0.65 * dynamicPressure,
    pressureMax: 1.15 * dynamicPressure,
    validationStatus: validationState.finalStatus
  };
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function formatFixed(value, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function formatSci(value) {
  return Number.isFinite(value) ? value.toExponential(2) : "n/a";
}

function statusClass(status) {
  if (status === "pass") return "pass";
  if (status === "fail") return "fail";
  if (status === "warn") return "warn";
  return "idle";
}

function render() {
  const values = collectInputs();
  const derived = derive(values);
  const validationState = validation(values, derived);
  const results = resultModel(values, derived, validationState);

  renderGlobal(validationState);
  renderGeometry(values);
  drawGeometryPreview(values);
  renderDerived(derived);
  renderStages();
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
    metric("Product", preview.productName || "n/a"),
    metric("Modified", modified)
  ].join("");
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
      runState: state.runState,
      advancedOverride: values.advancedMode ? { active: true, reason: values.overrideReason || "Unspecified" } : { active: false },
      resultSet: state.completed ? results : null
    },
    null,
    2
  );
}

function row(name, status, detail) {
  return `
    <div class="validation-item">
      <div class="row-head">
        <strong>${name}</strong>
        <span class="tag ${statusClass(status)}">${statusLabel(status)}</span>
      </div>
      <p>${detail}</p>
    </div>
  `;
}

function statusLabel(status) {
  return {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    idle: "Pending"
  }[status];
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function startRun() {
  const values = collectInputs();
  const derived = derive(values);
  const validationState = validation(values, derived);

  if (validationState.finalStatus === "Blocked") {
    state.log.unshift(`[${new Date().toLocaleTimeString()}] Run blocked by validation gates.`);
    render();
    return;
  }

  clearInterval(state.runTimer);
  state.runState = "running";
  state.completed = false;
  state.activeStage = 0;
  state.log = [`[${new Date().toLocaleTimeString()}] Run started with ${validationState.finalStatus} status.`];

  state.runTimer = setInterval(() => {
    const stage = stageDefs[state.activeStage];
    if (stage) {
      state.log.unshift(`[${new Date().toLocaleTimeString()}] ${stage[1]} completed.`);
    }
    state.activeStage += 1;

    if (state.activeStage >= stageDefs.length) {
      clearInterval(state.runTimer);
      state.runTimer = null;
      state.activeStage = stageDefs.length;
      state.runState = "completed";
      state.completed = true;
      state.log.unshift(`[${new Date().toLocaleTimeString()}] Results synchronized to project workspace.`);
    }
    render();
  }, 900);

  render();
}

function resetRun() {
  clearInterval(state.runTimer);
  state.runTimer = null;
  state.runState = "draft";
  state.activeStage = -1;
  state.completed = false;
  state.log = [];
  render();
}

function drawWake(values, results) {
  const canvas = $("wakeCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#d8ebe7");
  gradient.addColorStop(0.5, "#f8fbfb");
  gradient.addColorStop(1, "#dbe7f4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(40, 95, 159, 0.2)";
  ctx.lineWidth = 1;
  for (let y = 50; y < height; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(width * 0.35, y - 18, width * 0.65, y + 18, width, y);
    ctx.stroke();
  }

  const bodyX = 190;
  const bodyY = height / 2;
  ctx.save();
  ctx.translate(bodyX, bodyY);
  ctx.rotate((values.angle * Math.PI) / 180);
  ctx.fillStyle = "#263130";
  if (values.geometryClass === "bluff") {
    roundRect(ctx, -54, -42, 108, 84, 10);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-72, 0);
    ctx.quadraticCurveTo(-20, -45, 76, 0);
    ctx.quadraticCurveTo(-20, 45, -72, 0);
    ctx.fill();
  }
  ctx.restore();

  const wakeLength = Math.min(420, 120 + Math.abs(results.drag || 0) * 1.8);
  const wakeHeight = values.geometryClass === "bluff" ? 120 : 72;
  const wake = ctx.createRadialGradient(bodyX + 110, bodyY, 20, bodyX + wakeLength, bodyY, wakeLength);
  wake.addColorStop(0, "rgba(31, 122, 109, 0.42)");
  wake.addColorStop(0.55, "rgba(166, 93, 0, 0.18)");
  wake.addColorStop(1, "rgba(31, 122, 109, 0)");
  ctx.fillStyle = wake;
  ctx.beginPath();
  ctx.ellipse(bodyX + wakeLength / 2, bodyY, wakeLength / 2, wakeHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1e2424";
  ctx.font = "700 18px system-ui";
  ctx.fillText(state.completed ? "Synthetic wake preview" : "Wake preview appears after run", 24, 34);
}

function drawGeometryPreview(values) {
  const canvas = $("geometryCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#f9fbfa");
  background.addColorStop(1, "#e6efec");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height);

  const fileOk = /\.(step|stp)$/i.test(values.geometryFile);
  if (values.geometryPreview.points.length > 0) {
    drawStepPointPreview(ctx, values, width, height, fileOk);
    return;
  }

  const centerX = width / 2;
  const centerY = height / 2 + 14;
  const angle = state.viewerAngle;
  const tilt = state.viewerTilt;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tiltScale = 0.55 + Math.cos(tilt) * 0.25;

  const points =
    values.geometryClass === "bluff"
      ? boxPoints(190, 110, 90)
      : streamlinedPoints(230, 84, 80);
  const projected = points.map((point) => projectPoint(point, centerX, centerY, cos, sin, tiltScale));

  drawEdges(ctx, projected, values.geometryClass === "bluff" ? boxEdges() : streamlinedEdges());

  ctx.fillStyle = "#1f7a6d";
  ctx.globalAlpha = fileOk ? 0.2 : 0.12;
  drawFrontFace(ctx, projected, values.geometryClass);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#1e2424";
  ctx.font = "800 18px system-ui";
  ctx.fillText(fileOk ? values.geometryFile : "No STEP/STP selected", 24, 34);
  ctx.font = "13px system-ui";
  ctx.fillStyle = "#667174";
  ctx.fillText(
    fileOk ? "No coordinate entities found in the readable STEP preview. Showing class proxy." : "Select a STEP/STP file to preview geometry.",
    24,
    58
  );

  if (!fileOk) {
    ctx.fillStyle = "rgba(180, 35, 24, 0.08)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawStepPointPreview(ctx, values, width, height, fileOk) {
  const points = values.geometryPreview.points;
  const bounds = values.geometryPreview.bounds;
  const centerX = width / 2;
  const centerY = height / 2 + 20;
  const angle = state.viewerAngle;
  const tilt = state.viewerTilt;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tiltScale = 0.55 + Math.cos(tilt) * 0.25;
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanY = bounds.maxY - bounds.minY || 1;
  const spanZ = bounds.maxZ - bounds.minZ || 1;
  const scale = Math.min(420 / spanX, 240 / spanY, 360 / spanZ);
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const midZ = (bounds.minZ + bounds.maxZ) / 2;

  const projected = points.map((point) =>
    projectPoint(
      {
        x: (point.x - midX) * scale,
        y: -(point.y - midY) * scale,
        z: (point.z - midZ) * scale
      },
      centerX,
      centerY,
      cos,
      sin,
      tiltScale
    )
  );

  const box = boxPoints(spanX * scale, spanY * scale, spanZ * scale);
  const boxProjected = box.map((point) => projectPoint(point, centerX, centerY, cos, sin, tiltScale));
  drawEdges(ctx, boxProjected, boxEdges(), "rgba(30, 36, 36, 0.28)");

  ctx.fillStyle = fileOk ? "#1f7a6d" : "#b42318";
  projected.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#1e2424";
  ctx.font = "800 18px system-ui";
  ctx.fillText(values.geometryFile, 24, 34);
  ctx.font = "13px system-ui";
  ctx.fillStyle = "#667174";
  ctx.fillText("Parsed STEP coordinate preview. Drag to rotate.", 24, 58);
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = "rgba(102, 113, 116, 0.18)";
  ctx.lineWidth = 1;
  for (let x = 36; x < width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 84);
    ctx.lineTo(x, height - 28);
    ctx.stroke();
  }
  for (let y = 92; y < height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
}

function projectPoint(point, centerX, centerY, cos, sin, tiltScale) {
  const rotatedX = point.x * cos - point.z * sin;
  const rotatedZ = point.x * sin + point.z * cos;
  return {
    x: centerX + rotatedX + rotatedZ * 0.18,
    y: centerY + point.y * tiltScale - rotatedZ * 0.28
  };
}

function boxPoints(width, height, depth) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  return [
    { x: -x, y: -y, z: -z },
    { x, y: -y, z: -z },
    { x, y, z: -z },
    { x: -x, y, z: -z },
    { x: -x, y: -y, z },
    { x, y: -y, z },
    { x, y, z },
    { x: -x, y, z }
  ];
}

function boxEdges() {
  return [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7]
  ];
}

function streamlinedPoints(width, height, depth) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  return [
    { x: -x, y: 0, z: 0 },
    { x: -x * 0.25, y: -y, z: -z },
    { x: x * 0.65, y: 0, z: -z * 0.75 },
    { x: -x * 0.25, y, z: -z },
    { x: -x * 0.25, y: -y, z },
    { x: x * 0.65, y: 0, z: z * 0.75 },
    { x: -x * 0.25, y, z },
    { x, y: 0, z: 0 }
  ];
}

function streamlinedEdges() {
  return [
    [0, 1],
    [0, 3],
    [0, 4],
    [0, 6],
    [1, 2],
    [2, 3],
    [4, 5],
    [5, 6],
    [1, 4],
    [3, 6],
    [2, 7],
    [5, 7]
  ];
}

function drawEdges(ctx, points, edges, strokeStyle = "#1e2424") {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  edges.forEach(([start, end]) => {
    ctx.beginPath();
    ctx.moveTo(points[start].x, points[start].y);
    ctx.lineTo(points[end].x, points[end].y);
    ctx.stroke();
  });

  points.forEach((point) => {
    ctx.fillStyle = "#1f7a6d";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFrontFace(ctx, points, geometryClass) {
  const face = geometryClass === "bluff" ? [0, 1, 2, 3] : [0, 1, 2, 3];
  ctx.beginPath();
  ctx.moveTo(points[face[0]].x, points[face[0]].y);
  face.slice(1).forEach((index) => ctx.lineTo(points[index].x, points[index].y));
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function bind() {
  [
    "projectName",
    "geometryFile",
    "geometryClass",
    "geometryEnvelope",
    "orientation",
    "angle",
    "speed",
    "altitude",
    "pressure",
    "temperature",
    "length",
    "area",
    "advancedMode",
    "overrideReason"
  ].forEach((id) => {
    inputs[id] = $(id);
    inputs[id].addEventListener("input", render);
    inputs[id].addEventListener("change", render);
  });

  inputs.geometryFile.addEventListener("change", readGeometryFile);

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.section = button.dataset.section;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".section").forEach((section) => section.classList.toggle("active", section.id === state.section));
      $("sectionTitle").textContent = button.textContent;
      render();
    });
  });

  $("startRun").addEventListener("click", startRun);
  $("resetRun").addEventListener("click", resetRun);

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

function readGeometryFile() {
  const file = inputs.geometryFile.files[0];
  state.geometryPreview = {
    fileName: file ? file.name : "",
    status: file ? "reading" : "empty",
    points: [],
    bounds: null,
    schema: "",
    productName: "",
    note: file ? "Reading STEP/STP header and coordinate entities." : "No geometry selected."
  };
  render();

  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    state.geometryPreview = parseStepPreview(file.name, String(reader.result || ""));
    render();
  };
  reader.onerror = () => {
    state.geometryPreview = {
      fileName: file.name,
      status: "error",
      points: [],
      bounds: null,
      schema: "",
      productName: "",
      note: "Could not read the selected file in the browser."
    };
    render();
  };
  reader.readAsText(file.slice(0, 2_000_000));
}

function parseStepPreview(fileName, text) {
  const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  const nameMatch = text.match(/FILE_NAME\s*\(\s*'([^']*)'/i);
  const points = [];
  const pointPattern = /CARTESIAN_POINT\s*\(\s*'[^']*'\s*,\s*\(\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*,\s*([-+0-9.Ee]+)\s*\)\s*\)/gi;
  let match = pointPattern.exec(text);

  while (match && points.length < 2500) {
    const point = {
      x: Number(match[1]),
      y: Number(match[2]),
      z: Number(match[3])
    };
    if (Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)) {
      points.push(point);
    }
    match = pointPattern.exec(text);
  }

  const bounds = points.length > 0 ? pointBounds(points) : null;
  const truncated = /CARTESIAN_POINT/i.test(text) && points.length === 2500;
  const note =
    points.length > 0
      ? `${points.length}${truncated ? "+" : ""} STEP coordinate points parsed for preview.`
      : "No CARTESIAN_POINT coordinates found in the readable STEP segment.";

  return {
    fileName,
    status: points.length > 0 ? "parsed" : "fallback",
    points,
    bounds,
    schema: schemaMatch ? schemaMatch[1] : "",
    productName: nameMatch ? nameMatch[1] : "",
    note
  };
}

function pointBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
      minZ: Math.min(bounds.minZ, point.z),
      maxZ: Math.max(bounds.maxZ, point.z)
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity
    }
  );
}

bind();
render();
