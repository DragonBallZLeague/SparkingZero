// The calculator demo shell: the site navbar, the calculator's section tabs and a hash router,
// so every view (and every build) is an address. See README.md.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { idOfSlug, data } from './data.js';
import { BreakdownHost } from './ui.jsx';
import CharactersPage from './characters.jsx';
import CharacterPage from './character.jsx';
import BuildPage from './build.jsx';

function parse() {
  const h = location.hash.replace(/^#/, '') || '/characters';
  const [path, qs = ''] = h.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs)) };
}
function href(path, query) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.at !== this.props.at && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="panel empty">This view failed: <code>{String(this.state.error.message)}</code><pre className="small" style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre></div>;
  }
}

function App() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const f = () => setRoute(parse());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const go = (to) => { location.hash = to; window.scrollTo(0, 0); };
  const setQuery = (patch) => {
    const q = { ...route.query, ...patch };
    history.replaceState(null, '', href(route.path, q));
    setRoute({ path: route.path, query: Object.fromEntries(Object.entries(q).filter(([, v]) => v != null && v !== '')) });
  };

  const parts = route.path.split('/').filter(Boolean);
  const section = parts[0] === 'build' ? 'build' : 'characters';
  const charId = parts[0] === 'characters' && parts[1] ? (idOfSlug.get(parts[1]) || parts[1]) : null;

  let page;
  if (section === 'build') page = <BuildPage query={route.query} setQuery={setQuery} go={go} />;
  else if (charId) page = <CharacterPage key={charId} id={charId} query={route.query} setQuery={setQuery} go={go} />;
  else page = <CharactersPage query={route.query} setQuery={setQuery} go={go} />;

  return (
    <BreakdownHost>
      <nav className="nav">
        <div className="nav-accent" />
        <div className="nav-inner">
          <div className="nav-brand"><b className="nav-logo">DBSZL</b><span className="nav-div" /><span className="nav-title">Character Calculator</span></div>
          <div className="nav-links"><span>Home</span><span>Analyzer</span><span>Match Builder</span><span className="on">Calculator</span></div>
          <span className="nav-burger" />
        </div>
      </nav>
      <div className="wrap">
        <div className="tabs">
          <div className="tablist" role="tablist">
            {[['characters', 'Characters', '/characters'], ['build', 'Build', '/build']].map(([k, l, to]) => (
              <button key={k} role="tab" className="tab" aria-selected={section === k} onClick={() => go(to)}>{l}</button>
            ))}
          </div>
          <span className="demo-lbl">Demo · data {data.meta.dataVersion}</span>
        </div>
        <main><Boundary at={location.hash}>{page}</Boundary></main>
        <p className="demo-foot">Calculator demo on the published data ({data.characters.length} characters). Every number comes from the calculator's own engine; nothing here is saved.</p>
      </div>
    </BreakdownHost>
  );
}

createRoot(document.getElementById('root')).render(<App />);
