import { $ } from "./dom.js";
import { state } from "./state.js";
import { drawEdges, drawFrontFace, drawGrid } from "./canvasPrimitives.js";
import { boxEdges, boxPoints, orientPoint, projectPoint, streamlinedEdges, streamlinedPoints } from "./geometryMath.js";

export function drawGeometryPreview(values) {
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

  drawProxyPreview(ctx, values, width, height, fileOk);
}

function drawProxyPreview(ctx, values, width, height, fileOk) {
  const centerX = width / 2;
  const centerY = height / 2 + 14;
  const yaw = state.viewerAngle;
  const pitch = state.viewerTilt;
  const roll = (values.roll * Math.PI) / 180;
  const points = values.geometryClass === "bluff" ? boxPoints(190, 110, 90) : streamlinedPoints(230, 84, 80);
  const projected = points.map((point) => projectPoint(orientPoint(point, yaw, pitch, roll), centerX, centerY));

  drawEdges(ctx, projected, values.geometryClass === "bluff" ? boxEdges() : streamlinedEdges());
  ctx.fillStyle = "#1f7a6d";
  ctx.globalAlpha = fileOk ? 0.2 : 0.12;
  drawFrontFace(ctx, projected);
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
  const yaw = state.viewerAngle;
  const pitch = state.viewerTilt;
  const roll = (values.roll * Math.PI) / 180;
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanY = bounds.maxY - bounds.minY || 1;
  const spanZ = bounds.maxZ - bounds.minZ || 1;
  const scale = Math.min(420 / spanX, 240 / spanY, 360 / spanZ);
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const midZ = (bounds.minZ + bounds.maxZ) / 2;

  const projected = points.map((point) =>
    projectPoint(
      orientPoint(
        {
          x: (point.x - midX) * scale,
          y: -(point.y - midY) * scale,
          z: (point.z - midZ) * scale
        },
        yaw,
        pitch,
        roll
      ),
      centerX,
      centerY
    )
  );

  const box = boxPoints(spanX * scale, spanY * scale, spanZ * scale);
  const boxProjected = box.map((point) => projectPoint(orientPoint(point, yaw, pitch, roll), centerX, centerY));
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
