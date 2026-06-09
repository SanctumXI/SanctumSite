/**
 * Field access policy derived from DBSchema.md.
 * Protected fields require authenticated owner access over HTTPS.
 * Passwords are never exposed via the API.
 */

export const NEVER_EXPOSE = new Set([
  'accounts.password',
]);

export const PROTECTED_FIELDS = new Set([
  'accounts.login',
  'accounts.id',
  'accounts_sessions.accid',
  'accounts_sessions.charid',
  'chars.accid',
  'chars.charid',
  'char_stats.charid',
  'char_exp.charid',
]);

export const PUBLIC_FIELDS = new Set([
  'chars.charname',
  'chars.nation',
  'char_stats.hp',
  'char_stats.mp',
  'char_stats.mjob',
  'char_stats.sjob',
  'char_stats.mlvl',
  'char_stats.slvl',
  'char_exp.war',
  'char_exp.mnk',
  'char_exp.whm',
  'char_exp.blm',
  'char_exp.rdm',
  'char_exp.thf',
  'char_exp.pld',
  'char_exp.drk',
  'char_exp.bst',
  'char_exp.brd',
  'char_exp.rng',
  'char_exp.sam',
  'char_exp.nin',
  'char_exp.drg',
  'char_exp.smn',
  'char_exp.blu',
  'char_exp.cor',
  'char_exp.pup',
  'char_exp.dnc',
  'char_exp.sch',
  'char_exp.geo',
  'char_exp.run',
]);

export function assertNeverExpose(fieldKey) {
  if (NEVER_EXPOSE.has(fieldKey)) {
    throw new Error(`Field ${fieldKey} must never be exposed via API`);
  }
}
