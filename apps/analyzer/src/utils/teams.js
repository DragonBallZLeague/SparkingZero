import TEAM_LIST from '../../../../referencedata/teams.json';
import { slugifyCharacterName } from './characterSlug.js';

/**
 * The league's teams, from referencedata/teams.json (see its README entry).
 *
 * A team has two identities, kept apart on purpose:
 * - its TAG ("Master and Student"): the identifier in match files, BR_Data
 *   folders, the scope bar's `team=` URL param and every aggregation. Never
 *   changes.
 * - its NAME ("Master & Student"): what the website calls it, and what every
 *   view here shows.
 * Its `slug` is its /teams/<slug> path.
 *
 * A tag with no entry (a team that reached the match data before the list)
 * still works: its name is the tag and its slug is made from it.
 */
export const TEAMS = TEAM_LIST;

const byTag = new Map(TEAMS.map(t => [t.tag, t]));
const bySlug = new Map(TEAMS.map(t => [t.slug, t]));

/** The team entry for a tag, or a stand-in built from the tag itself. */
export function teamByTag(tag) {
  if (!tag) return null;
  return byTag.get(tag) || { tag, name: tag, slug: slugifyCharacterName(tag), websiteSlug: null, logo: null, color: null };
}

/** The display name for a tag: "Master and Student" -> "Master & Student". */
export const teamName = tag => (tag ? (byTag.get(tag) || { name: tag }).name : '');

/**
 * A URL segment -> team entry, among the tags present in `tags` (the match
 * data), so a team not yet in the list still resolves by its derived slug.
 * The tag itself is accepted too, for hand-typed links.
 */
export function teamBySlug(param, tags = []) {
  if (!param) return null;
  const p = String(param).toLowerCase();
  if (bySlug.has(p)) return bySlug.get(p);
  for (const tag of tags) {
    const t = teamByTag(tag);
    if (t.slug === p || tag.toLowerCase() === p) return t;
  }
  return null;
}
