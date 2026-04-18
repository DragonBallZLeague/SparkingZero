import yaml from 'js-yaml';

const cache = {};

/**
 * Load a YAML content file from public/content/.
 * Results are cached per session so repeated calls are instant.
 */
export async function loadContent(filename) {
  if (cache[filename]) return cache[filename];
  const resp = await fetch(`${import.meta.env.BASE_URL}content/${filename}`);
  const text = await resp.text();
  const data = yaml.load(text);
  cache[filename] = data;
  return data;
}

/** Clear cache (useful if content is updated live via CMS) */
export function clearContentCache() {
  Object.keys(cache).forEach((k) => delete cache[k]);
}
