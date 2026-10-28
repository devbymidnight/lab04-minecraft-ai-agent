export const MAX_DISTANCE = 64;
export const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    tool: { type: 'string', enum: ['follow', 'stop', 'goto', 'unsupported'] },
    x: { type: ['integer', 'null'] }, y: { type: ['integer', 'null'] }, z: { type: ['integer', 'null'] }
  }, required: ['tool', 'x', 'y', 'z']
};
export function validateTool(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'tool,x,y,z' ||
      !schema.properties.tool.enum.includes(value.tool)) throw new Error('AI returned an unapproved tool.');
  if (value.tool === 'goto') {
    if (![value.x, value.y, value.z].every(Number.isSafeInteger) ||
        Math.abs(value.x) > 29999900 || Math.abs(value.z) > 29999900 || value.y < -64 || value.y > 319) {
      throw new Error('Coordinates must be whole numbers inside the Minecraft world.');
    }
  } else if ([value.x, value.y, value.z].some(v => v !== null)) throw new Error('This tool does not accept coordinates.');
  return value;
}
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function assertNearby(point, current, anchor) {
  if (!point || !current || !anchor || [point,current,anchor].some(p => ![p.x,p.y,p.z].every(Number.isFinite)) ||
      distance(point, current) > MAX_DISTANCE || distance(point, anchor) > MAX_DISTANCE) {
    throw new Error('Stay within 64 blocks of the bot and its starting point.');
  }
}
