export function drawGrid(ctx, width, height) {
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

export function drawEdges(ctx, points, edges, strokeStyle = "#1e2424") {
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

export function drawFrontFace(ctx, points) {
  const face = [0, 1, 2, 3];
  ctx.beginPath();
  ctx.moveTo(points[face[0]].x, points[face[0]].y);
  face.slice(1).forEach((index) => ctx.lineTo(points[index].x, points[index].y));
  ctx.closePath();
  ctx.fill();
}

export function roundRect(ctx, x, y, width, height, radius) {
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
