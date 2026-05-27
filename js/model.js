import { inputs, state } from "./state.js";
import { numberValue } from "./dom.js";

export function collectInputs() {
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
    yaw: numberValue("yaw"),
    pitch: numberValue("pitch"),
    roll: numberValue("roll"),
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

export function orientationLabel(values) {
  return `Yaw ${values.yaw} deg, pitch ${values.pitch} deg, roll ${values.roll} deg`;
}
