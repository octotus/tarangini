export function derive(values) {
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

export function resultModel(values, derived, validationState) {
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
