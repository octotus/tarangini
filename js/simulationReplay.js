import { $ } from "./dom.js";
import { roundRect } from "./canvasPrimitives.js";
import { state } from "./state.js";

export function drawSimulationReplay(values, results) {
  const canvas = $("simulationCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const frame = state.replay.frame;
  const progress = state.completed ? frame / state.replay.frameCount : Math.max(0, state.activeStage) / 6;
  const body = bodySilhouette(values, width, height);

  ctx.clearRect(0, 0, width, height);
  drawTunnel(ctx, width, height, progress);
  drawFlow(ctx, width, height, body, progress, state.completed);
  drawSolidBody(ctx, values, body);
  drawWakeField(ctx, values, results, body, progress, state.completed);
  drawReplayStatus(ctx, width, state.completed, progress);
}

function bodySilhouette(values, width, height) {
  if (values.geometryPreview.points.length > 2 && values.geometryPreview.bounds) {
    const crossSection = crossSectionProjection(values.geometryPreview);
    const maxBodyWidth = 190;
    const maxBodyHeight = 130;
    const scale = Math.min(maxBodyWidth / crossSection.width, maxBodyHeight / crossSection.height);
    const centerX = width * 0.32;
    const centerY = height * 0.52;
    const boundary = radialBoundary(crossSection.points, centerX, centerY, scale);
    if (boundary.length > 2) {
      return {
        type: "step",
        x: centerX,
        y: centerY,
        width: crossSection.width * scale,
        height: crossSection.height * scale,
        hull: boundary,
        projection: crossSection.name
      };
    }
  }

  return {
    type: values.geometryClass,
    x: width * 0.32,
    y: height * 0.52,
    width: values.geometryClass === "bluff" ? 118 : 160,
    height: values.geometryClass === "bluff" ? 92 : 76,
    hull: []
  };
}

function drawTunnel(ctx, width, height, progress) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#dcefed");
  gradient.addColorStop(0.48, "#f8fbfb");
  gradient.addColorStop(1, "#e8f1f7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(102, 113, 116, 0.18)";
  ctx.lineWidth = 1;
  for (let x = 34 - ((progress * 80) % 80); x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 72);
    ctx.lineTo(x, height - 42);
    ctx.stroke();
  }
}

function drawFlow(ctx, width, height, body, progress, animated) {
  ctx.save();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = animated ? "rgba(15, 111, 149, 0.42)" : "rgba(15, 111, 149, 0.22)";
  const shift = (progress * 130) % 130;
  for (let y = 72; y <= height - 54; y += 36) {
    ctx.beginPath();
    for (let x = -120 + shift; x <= width + 130; x += 28) {
      const dx = x - body.x;
      const dy = y - body.y;
      const avoid = Math.exp(-(dx * dx) / 13000 - (dy * dy) / 3600);
      const sign = dy < 0 ? -1 : 1;
      const curveY = y + sign * avoid * (body.height * 0.45) + Math.sin((x + progress * 200) * 0.025 + y * 0.03) * 3;
      if (x === -120 + shift) ctx.moveTo(x, curveY);
      else ctx.lineTo(x, curveY);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(15, 111, 149, 0.72)";
  for (let i = 0; i < 24; i += 1) {
    const px = (i * 83 + progress * 520) % (width + 160) - 80;
    const py = 88 + ((i * 47) % (height - 150));
    ctx.beginPath();
    ctx.arc(px, py, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSolidBody(ctx, values, body) {
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate((values.angle * Math.PI) / 180);
  ctx.translate(-body.x, -body.y);

  ctx.fillStyle = "#253130";
  ctx.strokeStyle = "#0f1f1d";
  ctx.lineWidth = 2.5;

  if (body.type === "step") {
    ctx.beginPath();
    ctx.moveTo(body.hull[0].x, body.hull[0].y);
    body.hull.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    ctx.beginPath();
    ctx.ellipse(body.x - body.width * 0.12, body.y - body.height * 0.2, Math.max(12, body.width * 0.22), Math.max(8, body.height * 0.16), -0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (body.type === "bluff") {
    roundRect(ctx, body.x - body.width / 2, body.y - body.height / 2, body.width, body.height, 9);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(body.x - body.width / 2, body.y);
    ctx.quadraticCurveTo(body.x - body.width * 0.15, body.y - body.height * 0.64, body.x + body.width / 2, body.y);
    ctx.quadraticCurveTo(body.x - body.width * 0.15, body.y + body.height * 0.64, body.x - body.width / 2, body.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawWakeField(ctx, values, results, body, progress, animated) {
  const wakeLength = Math.min(460, 150 + Math.abs(results.drag || 0) * 1.2);
  const pulse = animated ? 0.82 + Math.sin(progress * Math.PI * 2) * 0.18 : 0.65;
  const wake = ctx.createRadialGradient(body.x + body.width * 0.5, body.y, 16, body.x + wakeLength, body.y, wakeLength);
  wake.addColorStop(0, `rgba(31, 122, 109, ${0.34 * pulse})`);
  wake.addColorStop(0.5, `rgba(166, 93, 0, ${0.16 * pulse})`);
  wake.addColorStop(1, "rgba(31, 122, 109, 0)");
  ctx.fillStyle = wake;
  ctx.beginPath();
  ctx.ellipse(body.x + wakeLength / 2, body.y, wakeLength / 2, values.geometryClass === "bluff" ? 106 : 76, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawReplayStatus(ctx, width, completed, progress) {
  ctx.fillStyle = "#1e2424";
  ctx.font = "800 18px system-ui";
  ctx.fillText(completed ? "Simulation replay" : "Replay available after run completion", 24, 34);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#667174";
  ctx.fillText(completed ? `Recorded frames ${Math.round(progress * 100)}%` : "Run the case to record telemetry and replay frames.", 24, 54);

  ctx.fillStyle = "#0f6f95";
  ctx.font = "800 12px system-ui";
  ctx.textAlign = "right";
  ctx.fillText("FLOW ->", width - 28, 34);
  ctx.textAlign = "left";
}

function crossSectionProjection(preview) {
  const bounds = preview.bounds;
  const spans = {
    x: bounds.maxX - bounds.minX || 1,
    y: bounds.maxY - bounds.minY || 1,
    z: bounds.maxZ - bounds.minZ || 1
  };
  const centers = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2
  };
  const candidates = [
    { name: "YZ cross-section", horizontal: "z", vertical: "y", area: spans.z * spans.y },
    { name: "XY section", horizontal: "x", vertical: "y", area: spans.x * spans.y },
    { name: "XZ section", horizontal: "x", vertical: "z", area: spans.x * spans.z }
  ];
  const best = candidates.reduce((chosen, candidate) => (candidate.area > chosen.area ? candidate : chosen), candidates[0]);
  const selected = candidates[0].area >= best.area * 0.08 ? candidates[0] : best;
  const stride = Math.max(1, Math.floor(preview.points.length / 1800));
  const points = preview.points
    .filter((_, index) => index % stride === 0)
    .map((point) => ({
      x: point[selected.horizontal] - centers[selected.horizontal],
      y: point[selected.vertical] - centers[selected.vertical]
    }));

  return {
    name: selected.name,
    points,
    width: spans[selected.horizontal],
    height: spans[selected.vertical]
  };
}

function radialBoundary(points, centerX, centerY, scale) {
  const bins = 96;
  const radii = new Array(bins).fill(0);
  const screenPoints = points.map((point) => ({
    x: point.x * scale,
    y: -point.y * scale
  }));

  for (const point of screenPoints) {
    const radius = Math.hypot(point.x, point.y);
    if (radius < 0.5) continue;
    const angle = Math.atan2(point.y, point.x);
    const index = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * bins) % bins;
    radii[index] = Math.max(radii[index], radius);
  }

  for (let pass = 0; pass < 3; pass += 1) {
    for (let index = 0; index < bins; index += 1) {
      if (radii[index] > 0) continue;
      const previous = radii[(index - 1 + bins) % bins];
      const next = radii[(index + 1) % bins];
      radii[index] = Math.max(previous, next) * 0.96;
    }
  }

  const smoothed = radii.map((radius, index) => {
    const previous = radii[(index - 1 + bins) % bins];
    const next = radii[(index + 1) % bins];
    return (previous + radius * 2 + next) / 4;
  });

  return smoothed
    .map((radius, index) => {
      const angle = (index / bins) * Math.PI * 2 - Math.PI;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}
