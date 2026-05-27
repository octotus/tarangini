import { $ } from "./dom.js";
import { roundRect } from "./canvasPrimitives.js";
import { state } from "./state.js";

export function drawWake(values, results) {
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

  drawBody(ctx, values, 190, height / 2);
  drawWakeBlob(ctx, values, results, 190, height / 2);

  ctx.fillStyle = "#1e2424";
  ctx.font = "700 18px system-ui";
  ctx.fillText(state.completed ? "Synthetic wake preview" : "Wake preview appears after run", 24, 34);
}

function drawBody(ctx, values, bodyX, bodyY) {
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
}

function drawWakeBlob(ctx, values, results, bodyX, bodyY) {
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
}
