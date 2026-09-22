import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

// Decap 3 exposes these as bare globals (not on the CMS object): `h` is Decap's own
// React.createElement and `createClass` its createReactClass.
const h = window.h;
const createClass = window.createClass;

/**
 * Wraps a site component so Decap can use it as a preview template.
 *
 * Decap bundles its own React 19 while the site runs React 18, and hooks only work
 * through the React instance that is doing the rendering. So the template Decap
 * renders is a thin Decap-React shell that owns an empty <div>, and the site's React
 * mounts its own root inside it. Two independent trees, one DOM - which means the
 * real page components (hooks, context, router and all) render untouched.
 *
 * Everything Decap passes a preview template (entry, collection, widgetFor,
 * getAsset, document, window, fieldsMetaData) is forwarded to `Component`.
 */
export function bridgePreview(Component) {
  return createClass({
    componentDidMount() {
      this.root = createRoot(this.node);
      this.draw();
    },

    componentDidUpdate() {
      this.draw();
    },

    componentWillUnmount() {
      const root = this.root;
      this.root = null;
      // Decap can unmount us from inside its own render pass; defer so React 18
      // does not warn about synchronously unmounting a root mid-render.
      setTimeout(() => root.unmount(), 0);
    },

    draw() {
      if (!this.root) return;
      this.root.render(
        // Page components use <Link>/<useParams>; a memory router keeps them
        // working without touching the CMS's own URL.
        <MemoryRouter>
          <Component {...this.props} />
        </MemoryRouter>
      );
    },

    render() {
      return h('div', { ref: (node) => { this.node = node; } });
    },
  });
}
