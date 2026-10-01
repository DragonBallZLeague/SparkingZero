// Entry point for the /cms admin panel.
//
// Decap renders the preview pane inside a sandboxed iframe that inherits no styles
// from this page, so the site's compiled Tailwind is injected explicitly below.
// Preview templates are registered before CMS.init() so the editor never renders
// against an empty registry.
import yaml from 'js-yaml';
import cssText from '../src/index.css?inline';
import { bridgePreview } from './preview-bridge.jsx';
import { PREVIEWS } from './previews.jsx';
import { templateKeysFor } from './entry.js';

const CMS = window.CMS;

if (!CMS) {
  // The CDN script is the only way Decap gets here; without it there is no panel.
  document.body.innerHTML =
    '<p style="font:16px system-ui;padding:2rem">Decap CMS failed to load. Check your connection to unpkg.com and reload.</p>';
} else {
  // `?inline` hands us the PostCSS/Tailwind output as a string, so this survives
  // Vite's asset hashing in production and works in dev, where there is no CSS file.
  CMS.registerPreviewStyle(cssText, { raw: true });

  // Anything else Vite linked into this page (component CSS from shared packages)
  // belongs in the iframe too, so a previewed component is never missing its styles.
  for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
    CMS.registerPreviewStyle(link.href);
  }

  // Decap looks a preview template up by collection name for `folder` collections
  // but by the FILE's name for `files` collections, so the config decides which keys
  // to register under. Reading it here (same relative URL Decap itself uses) keeps
  // that in step automatically as files are added to a collection.
  fetch('config.yml')
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`config.yml: HTTP ${r.status}`))))
    .then((text) => registerAll(yaml.load(text)))
    .catch((err) => {
      console.error('[cms] could not read config.yml for preview registration', err);
      registerAll(null);
    })
    .finally(() => CMS.init());
}

function registerAll(config) {
  for (const [name, Component] of Object.entries(PREVIEWS)) {
    const template = bridgePreview(Component);
    // Without a config (fetch failed) this falls back to the collection name, which
    // is right for folder collections and no worse than nothing for the rest.
    for (const key of templateKeysFor(config, name)) {
      CMS.registerPreviewTemplate(key, template);
    }
  }
}
