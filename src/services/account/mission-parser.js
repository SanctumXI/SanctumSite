const MISSION_LOG_SIZE = 70;
const MISSION_AREA_COUNT = 15;

export function parseMissionBlob(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return [];
  }

  const logs = [];

  for (let area = 0; area < MISSION_AREA_COUNT; area += 1) {
    const offset = area * MISSION_LOG_SIZE;
    if (offset + 6 > buffer.length) {
      break;
    }

    const current = buffer.readUInt16LE(offset);
    const statusUpper = buffer.readUInt16LE(offset + 2);
    const statusLower = buffer.readUInt16LE(offset + 4);
    const status = (statusUpper << 16) | statusLower;

    logs.push({
      area,
      current,
      status,
    });
  }

  return logs;
}
