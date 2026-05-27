import { inputs } from "./state.js";

export function $(id) {
  return document.getElementById(id);
}

export function numberValue(id) {
  return Number(inputs[id].value || 0);
}

export function bindInputs(ids, onChange) {
  ids.forEach((id) => {
    inputs[id] = $(id);
    inputs[id].addEventListener("input", onChange);
    inputs[id].addEventListener("change", onChange);
  });
}
