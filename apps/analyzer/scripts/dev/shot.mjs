/**
 * Screenshots a served analyzer page with headless Edge/Chrome.
 *
 *   node scripts/dev/shot.mjs <url> <width> <out.png> [actions...]
 *   npm run shot -- <url> <width> <out.png> [actions...]
 *
 * Serve a real build first; dev servers do not reproduce the Pages 404 rule
 * that deep links rely on. From the repo root:
 *   npm run build:analyzer && node scripts/build-404.js && node scripts/serve-dist.js
 * then e.g. http://localhost:8080/SparkingZero/analyzer/characters/android-13
 *
 * Widths under 600 emulate a phone. Actions run in order:
 *   bars          Character Overview: switch "How it fights" to Bars
 *   picker        open the build picker
 *   build:<n>     choose option n in the build picker (0 = All builds)
 *   hover:<text>  hover the tooltip target whose text starts with <text>
 *   at:<classes>  scroll to the first <div> whose class attribute is exactly <classes>
 *   chip:<id>     open the chip or menu whose data-chip is <id> (e.g. chip:char)
 *   type:<text>   type <text> into the focused input (an open menu's search)
 *
 * With picker, hover:, at: or chip:, the shot is the viewport. Otherwise it is the full
 * page - from the character card down on a character page - up to 2400px tall.
 */
import fs from 'fs';
import path from 'path';
import { launch, settle, sleep } from './browser.mjs';

const [url, widthArg, out, ...actions] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/dev/shot.mjs <url> <width> <out.png> [actions...]');
  process.exit(1);
}
const W = parseInt(widthArg, 10) || 1280;

// floating-ui's listbox role marks the picker's trigger; its text changes with
// the selection, so it is not a reliable hook.
const pickerButton = `document.querySelector('button[aria-haspopup="listbox"]')`;

const browser = await launch();
const { send, evaluate, viewport } = browser;
try {
  await viewport(W);
  await send('Page.navigate', { url });
  // A character page is ready when the Overview has rendered; anything else
  // when it stops growing.
  const characterPage = /\/characters\/[^/?]+/.test(url);
  const ready = await settle(evaluate, characterPage ? { until: `document.body.textContent.includes('How it fights')` } : {});
  if (!ready) console.error('warning: the page never settled; shooting it anyway');
  await sleep(600);

  let viewportShot = false;
  for (const a of actions) {
    if (a === 'bars') {
      await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Bars').click()`);
    } else if (a === 'picker' || a.startsWith('build:')) {
      await evaluate(`(() => { const b = ${pickerButton}; scrollTo(0, b.getBoundingClientRect().top + scrollY - 120); b.click(); })()`);
      if (a.startsWith('build:')) {
        await sleep(300);
        await evaluate(`document.querySelectorAll('[role=option]')[${parseInt(a.slice(6), 10) || 0}].click()`);
      } else {
        viewportShot = true;
      }
    } else if (a.startsWith('hover:')) {
      const box = await evaluate(`(() => {
        const el = [...document.querySelectorAll('.cursor-help')].find(e => e.textContent.trim().startsWith(${JSON.stringify(a.slice(6))}));
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      })()`);
      if (box) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
      else console.error('warning: no tooltip target starting with ' + JSON.stringify(a.slice(6)));
      viewportShot = true;
    } else if (a.startsWith('at:')) {
      const found = await evaluate(`(() => {
        const el = [...document.querySelectorAll('div')].find(d => d.getAttribute('class') === ${JSON.stringify(a.slice(3))});
        if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 140);
        return !!el;
      })()`);
      if (!found) console.error('warning: no <div> with class ' + JSON.stringify(a.slice(3)));
      viewportShot = true;
    } else if (a.startsWith('chip:')) {
      const found = await evaluate(`(() => {
        const b = document.querySelector('button[data-chip=${JSON.stringify(a.slice(5))}]');
        if (b) b.click();
        return !!b;
      })()`);
      if (!found) console.error('warning: no chip ' + JSON.stringify(a.slice(5)));
      viewportShot = true;
    } else if (a.startsWith('type:')) {
      // React tracks an input's value itself: set it through the native setter,
      // then fire the input event React listens for.
      await evaluate(`(() => {
        const el = document.activeElement;
        if (!el || el.tagName !== 'INPUT') return;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(a.slice(5))});
        el.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
    } else {
      console.error('warning: unknown action ' + a);
    }
    await sleep(500);
  }

  let shot;
  if (viewportShot) {
    shot = await send('Page.captureScreenshot', { format: 'png' });
  } else {
    const top = characterPage
      ? await evaluate(`(() => { const el = document.querySelector('[role=tablist]')?.closest('.rounded-2xl'); return el ? el.getBoundingClientRect().top + scrollY - 8 : 0; })()`)
      : 0;
    const height = await evaluate('document.documentElement.scrollHeight');
    // Grow the viewport to the page rather than use captureBeyondViewport: that
    // mis-resolves vw units while it stitches, and collapsed the 97vw page shell
    // to ~45px in a capture while the live page was fine.
    await viewport(W, Math.min(height, 6000));
    await sleep(700);
    shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: top, width: W, height: Math.min(height - top, 2400), scale: 1 },
    });
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('wrote ' + out + '  (' + (await evaluate('location.href')) + ')');
} finally {
  await browser.close();
}
