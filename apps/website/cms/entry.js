// Helpers for turning what Decap hands a preview template into the plain YAML-shaped
// data the site's components already consume.

/** The entry's fields as plain JS (Decap stores them as an Immutable Map). */
export function entryData(props) {
  const data = props.entry && props.entry.get('data');
  if (!data) return {};
  return typeof data.toJS === 'function' ? data.toJS() : data;
}

/** e.g. "season-0" for content/teams/season-0.yaml. */
export function entryFileBase(props) {
  const path = (props.entry && props.entry.get('path')) || '';
  const file = path.split('/').pop() || '';
  return file.replace(/\.[^.]+$/, '');
}

/** The file's key in a `files` collection, e.g. "how_to_participate". */
export function entrySlug(props) {
  return (props.entry && props.entry.get('slug')) || '';
}

/**
 * Swap image paths for something the preview can actually show. Saved images are
 * already public URLs, but an image the editor just dropped in only exists as a
 * local blob until the entry is committed - `getAsset` resolves both.
 */
export function withAssets(value, getAsset, keys = IMAGE_KEYS) {
  if (Array.isArray(value)) return value.map((v) => withAssets(v, getAsset, keys));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (keys.has(k) && typeof v === 'string' && v) {
      out[k] = resolveAsset(getAsset, v);
    } else {
      out[k] = withAssets(v, getAsset, keys);
    }
  }
  return out;
}

const IMAGE_KEYS = new Set(['icon', 'banner', 'image', 'logo', 'thumbnail', 'avatar']);

function resolveAsset(getAsset, value) {
  if (typeof getAsset !== 'function') return value;
  try {
    const asset = getAsset(value);
    const url = asset && asset.toString();
    return url || value;
  } catch {
    return value;
  }
}

/**
 * The key(s) Decap will look a preview template up under for one collection.
 *
 * `folder` collections resolve to the collection's own name, but `files`
 * collections resolve to each FILE's `name` - registering the collection name for
 * those silently does nothing and the editor falls back to Decap's default field
 * dump. (Only collections whose single file happens to share the collection name,
 * like `community`, appear to work either way.)
 */
export function templateKeysFor(config, collectionName) {
  const collections = (config && config.collections) || [];
  const collection = collections.find((c) => c.name === collectionName);
  const files = collection && collection.files;
  if (Array.isArray(files) && files.length) {
    return files.filter((f) => f && f.name).map((f) => f.name);
  }
  return [collectionName];
}
