/**
 * Capsules with behaviour beyond their effect rows, by referencedata id (never by
 * display name, so a rename cannot silently switch them off).
 *   Light Body     the holder takes 10% less ki-blast damage (the old calculator's
 *                  model of "bullet armor level +3"), unless the attacker has Draconic Aura
 *   Draconic Aura  armor break +3; beats Light Body and Power Body
 *   Dragon Rush    armor break +3 against Rush Attack category actions
 */
export const LIGHT_BODY = '00_0_0033';
export const DRACONIC_AURA = '00_0_0032';
export const DRAGON_RUSH = '00_0_0035';

export function hasCapsule(equipped, id) {
  return Array.isArray(equipped) && equipped.some(c => c && c.id === id);
}
