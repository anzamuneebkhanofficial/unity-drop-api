
export function parseDurationToMs(input, defaultVal = 24, defaultUnit = 'h') {
  if (input === undefined || input === null || input === '') {
    return convertValueAndUnitToMs(defaultVal, defaultUnit);
  }
  const trimmed = input.toString().trim();
  // Raw number -> treat as defaultUnit for backward compatibility
  if (/^\d+$/.test(trimmed)) {
    return convertValueAndUnitToMs(parseInt(trimmed, 10), defaultUnit);
  }
  const matches = trimmed.match(/^(\d+)\s*([a-zA-Z]+)$/);
  if (!matches) {
    console.warn(`[DurationParser] Invalid duration string format: "${input}". Falling back to default.`);
    return convertValueAndUnitToMs(defaultVal, defaultUnit);
  }
  const value = parseInt(matches[1], 10);
  const unit = matches[2];
  return convertValueAndUnitToMs(value, unit);
}
function convertValueAndUnitToMs(value, unit) {
  const normalizedUnit = unit.toLowerCase();
  switch (normalizedUnit) {
    case 'ms':
    case 'millisecond':
    case 'milliseconds':
      return value;
    case 's':
    case 'sec':
    case 'second':
    case 'seconds':
      return value * 1000;
    case 'm':
    case 'min':
    case 'minute':
    case 'minutes':
      return value * 60 * 1000;
    case 'h':
    case 'hr':
    case 'hrs':
    case 'hour':
    case 'hours':
      return value * 60 * 60 * 1000;
    case 'd':
    case 'day':
    case 'days':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
    case 'wk':
    case 'week':
    case 'weeks':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      console.warn(`[DurationParser] Unknown unit: "${unit}". Defaulting to milliseconds.`);
      return value;
  }
}
export function getDurationText(input, defaultVal = 24, defaultUnit = 'h') {
  if (input === undefined || input === null || input === '') {
    return formatValueAndUnit(defaultVal, defaultUnit);
  }
  const trimmed = input.toString().trim();
  if (/^\d+$/.test(trimmed)) {
    return formatValueAndUnit(parseInt(trimmed, 10), defaultUnit);
  }
  return trimmed;
}
function formatValueAndUnit(value, unit) {
  const u = unit.toLowerCase();
  let unitText = unit;
  if (u === 'm' || u === 'min' || u === 'minute' || u === 'minutes') {
    unitText = value === 1 ? 'minute' : 'minutes';
  } else if (u === 'h' || u === 'hr' || u === 'hrs' || u === 'hour' || u === 'hours') {
    unitText = value === 1 ? 'hour' : 'hours';
  } else if (u === 'd' || u === 'day' || u === 'days') {
    unitText = value === 1 ? 'day' : 'days';
  } else if (u === 'w' || u === 'wk' || u === 'week' || u === 'weeks') {
    unitText = value === 1 ? 'week' : 'weeks';
  }
  return `${value} ${unitText}`;
}
