export function projectPoint(point, centerX, centerY) {
  return {
    x: centerX + point.x + point.z * 0.18,
    y: centerY + point.y - point.z * 0.28
  };
}

export function orientPoint(point, yaw, pitch, roll) {
  const yawCos = Math.cos(yaw);
  const yawSin = Math.sin(yaw);
  const pitchCos = Math.cos(pitch);
  const pitchSin = Math.sin(pitch);
  const rollCos = Math.cos(roll);
  const rollSin = Math.sin(roll);

  const rolled = {
    x: point.x,
    y: point.y * rollCos - point.z * rollSin,
    z: point.y * rollSin + point.z * rollCos
  };
  const pitched = {
    x: rolled.x * pitchCos - rolled.y * pitchSin,
    y: rolled.x * pitchSin + rolled.y * pitchCos,
    z: rolled.z
  };

  return {
    x: pitched.x * yawCos - pitched.z * yawSin,
    y: pitched.y,
    z: pitched.x * yawSin + pitched.z * yawCos
  };
}

export function boxPoints(width, height, depth) {
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

export function boxEdges() {
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

export function streamlinedPoints(width, height, depth) {
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

export function streamlinedEdges() {
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
