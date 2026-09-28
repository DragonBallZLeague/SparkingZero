/**
 * Headless Edge/Chrome over the DevTools protocol, for the dev tools in this
 * folder (shot.mjs, css-diff.mjs). No dependencies: Node 22's global fetch and
 * WebSocket talk to the browser directly.
 *
 * Uses the first browser found: $BROWSER_PATH, then Edge, then Chrome.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Starts a headless browser with a throwaway profile and returns
 * { send, evaluate, viewport, close }. Always call close() - it kills the
 * browser and deletes the profile.
 */
export async function launch() {
  const exe = CANDIDATES.find(p => fs.existsSync(p));
  if (!exe) throw new Error('No Edge or Chrome found. Set BROWSER_PATH to a Chromium-based browser.');
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'szl-cdp-'));
  const proc = spawn(exe, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });

  let page = null;
  for (let i = 0; i < 75 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page') || null;
    } catch { /* not listening yet */ }
    if (!page) await sleep(200);
  }
  if (!page) {
    proc.kill();
    throw new Error(`${exe} did not open its DevTools port`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });

  const send = (method, params = {}) => new Promise(resolve => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

  /** Runs an expression in the page (promises awaited) and returns its JSON value. */
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    const err = r.result?.exceptionDetails;
    if (err) throw new Error('page script failed: ' + (err.exception?.description || err.text));
    return r.result?.result?.value;
  };

  /** Emulates a device this wide; under 600px it is a phone (touch, mobile viewport). */
  const viewport = (width, height = 900) => send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 600,
  });

  const close = async () => {
    try { ws.close(); } catch { /* already closed */ }
    proc.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold a file */ }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  return { send, evaluate, viewport, close };
}

/**
 * Waits for a page to finish loading its data. With `until` (a page expression),
 * waits for it to be true; otherwise waits for the element count to hold still
 * for two seconds, which is when the analyzer has fetched and rendered.
 * Returns false on timeout.
 */
export async function settle(evaluate, { until = null, timeoutMs = 60000 } = {}) {
  let last = -1, stable = 0;
  for (let waited = 0; waited < timeoutMs; waited += 500) {
    await sleep(500);
    if (until) {
      if (await evaluate(until).catch(() => false)) return true;
    } else {
      const n = await evaluate('document.body ? document.body.querySelectorAll("*").length : 0').catch(() => 0);
      stable = n === last && n > 50 ? stable + 1 : 0;
      last = n;
      if (stable >= 4) return true;
    }
  }
  return false;
}
