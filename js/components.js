export function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

export function row(name, status, detail) {
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

export function statusClass(status) {
  if (status === "pass") return "pass";
  if (status === "fail") return "fail";
  if (status === "warn") return "warn";
  return "idle";
}

function statusLabel(status) {
  return {
    pass: "Pass",
    fail: "Fail",
    warn: "Warn",
    idle: "Pending"
  }[status];
}
