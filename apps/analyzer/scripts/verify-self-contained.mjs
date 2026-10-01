/**
 * Every file under src/components/, src/pages/ and src/shell/ must resolve all of its own
 * identifiers from its own imports and declarations.
 *
 * WHY THIS EXISTS
 *
 * The 13 presentational components (StatBar, BuildTableView, MetricDisplay …)
 * lived inside App.jsx, where they could reach anything App imported without
 * importing it themselves. Moving them out means every one of those reaches has
 * to become a real import, and **a Vite build does not catch a missed one**: it
 * is a runtime ReferenceError on whichever code path touches it. A build panel
 * that only opens when someone expands a row could stay broken for weeks.
 *
 * So this parses each file and walks its scopes, reporting any identifier that
 * is neither declared locally nor imported. It is pure parsing - no data, no
 * I/O beyond reading the files - so it is cheap enough for prebuild, and it
 * discovers files by globbing rather than from a list, so it cannot fall behind
 * as Phases 4-6 move more components out.
 *
 * Usage: npm run verify-self-contained
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'src');
const ROOTS = ['components', 'pages', 'shell'];

// Things the runtime provides. Anything genuinely missing shows up as a name
// that is not here and not imported.
const GLOBALS = new Set([
  'window', 'document', 'console', 'Math', 'Object', 'Array', 'JSON', 'String',
  'Number', 'Boolean', 'Date', 'Set', 'Map', 'WeakMap', 'Promise', 'RegExp',
  'Error', 'TypeError', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask',
  'fetch', 'navigator', 'localStorage', 'sessionStorage', 'undefined', 'NaN',
  'Infinity', 'URL', 'URLSearchParams', 'Blob', 'File', 'FileReader',
  'encodeURIComponent', 'decodeURIComponent', 'structuredClone', 'alert',
  'requestAnimationFrame', 'cancelAnimationFrame', 'AbortController',
  'HTMLElement', 'Event', 'CustomEvent', 'IntersectionObserver', 'ResizeObserver',
  'TextEncoder', 'TextDecoder', 'crypto', 'performance', 'globalThis', 'process',
]);

// NOT in that list, deliberately: `React`.
//
// It was, on the reasoning that the automatic JSX runtime injects it. That is
// true for JSX itself - which never mentions the identifier, so it is never
// flagged - but it is NOT true for an explicit `React.useState(...)` or
// `React.Fragment`. Whitelisting the name made this checker blind to exactly
// the bug it exists to catch: useCopyFeedback moved out of App.jsx still
// calling React.useState, and the character page rendered as a blank white
// screen. A file that names React must import React.

function collectPattern(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Identifier': out.add(node.name); break;
    case 'ObjectPattern':
      for (const p of node.properties) {
        if (p.type === 'RestElement') collectPattern(p.argument, out);
        else collectPattern(p.value, out);
      }
      break;
    case 'ArrayPattern': for (const e of node.elements) collectPattern(e, out); break;
    case 'AssignmentPattern': collectPattern(node.left, out); break;
    case 'RestElement': collectPattern(node.argument, out); break;
  }
}

function freeIdentifiers(code) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
  });

  const top = new Set();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') node.specifiers.forEach(s => top.add(s.local.name));
    else if (node.type === 'FunctionDeclaration' && node.id) top.add(node.id.name);
    else if (node.type === 'ClassDeclaration' && node.id) top.add(node.id.name);
    else if (node.type === 'VariableDeclaration') node.declarations.forEach(d => collectPattern(d.id, top));
    else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      const d = node.declaration;
      if ((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) top.add(d.id.name);
      if (d.type === 'VariableDeclaration') d.declarations.forEach(x => collectPattern(x.id, top));
    } else if (node.type === 'ExportDefaultDeclaration' && node.declaration?.id) {
      top.add(node.declaration.id.name);
    }
  }

  const free = new Set();
  const scopes = [top];
  const declared = n => scopes.some(s => s.has(n));

  function hoist(stmts, target) {
    for (const st of stmts || []) {
      if (!st) continue;
      if (st.type === 'FunctionDeclaration' && st.id) target.add(st.id.name);
      else if (st.type === 'VariableDeclaration') st.declarations.forEach(d => collectPattern(d.id, target));
      else if (st.type === 'ClassDeclaration' && st.id) target.add(st.id.name);
    }
  }

  function walk(node, parent) {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      // import.meta.env.BASE_URL is a MetaProperty, not a reference to a binding
      // called `import`. Without this the checker reports `import` and `meta`.
      case 'MetaProperty': return;
      case 'ImportDeclaration': return;

      // `export { X } from './Y.js'` names something in the OTHER module, so it
      // is not a local reference. Barrel files are nothing but these.
      case 'ExportNamedDeclaration':
        if (node.source) return;
        break;
      case 'ExportAllDeclaration': return;

      case 'BlockStatement': {
        const s = new Set(); scopes.push(s); hoist(node.body, s);
        node.body.forEach(c => walk(c, node)); scopes.pop(); return;
      }
      // A switch body is NOT a BlockStatement - each case holds a bare statement
      // list - so `const x` inside a case would otherwise look undeclared.
      case 'SwitchStatement': {
        walk(node.discriminant, node);
        const s = new Set(); scopes.push(s);
        node.cases.forEach(c => hoist(c.consequent, s));
        node.cases.forEach(c => { if (c.test) walk(c.test, c); c.consequent.forEach(st => walk(st, c)); });
        scopes.pop(); return;
      }

      // An object or class method has params like any function; without this its
      // destructured params read as references rather than bindings.
      case 'ObjectMethod': case 'ClassMethod': case 'ClassPrivateMethod': {
        if (node.computed && node.key) walk(node.key, node);
        const s = new Set(); scopes.push(s);
        node.params.forEach(p => collectPattern(p, s));
        if (node.body?.type === 'BlockStatement') {
          hoist(node.body.body, s);
          node.body.body.forEach(c => walk(c, node.body));
        }
        scopes.pop(); return;
      }

      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        const s = new Set(); scopes.push(s);
        node.params.forEach(p => collectPattern(p, s));
        if (node.id) s.add(node.id.name);
        // A default VALUE is a reference: `icon: Icon = Target` binds Icon but
        // references Target, and missing that ships a ReferenceError.
        (function defaults(n) {
          if (!n || typeof n.type !== 'string') return;
          if (n.type === 'AssignmentPattern') walk(n.right, n);
          for (const k of Object.keys(n)) {
            if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra') continue;
            const v = n[k];
            if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && defaults(c));
            else if (v && typeof v.type === 'string') defaults(v);
          }
        })({ type: 'Params', params: node.params });
        if (node.body.type === 'BlockStatement') {
          hoist(node.body.body, s);
          node.body.body.forEach(c => walk(c, node.body));
        } else walk(node.body, node);
        scopes.pop(); return;
      }
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const s = new Set(); scopes.push(s);
        if (node.init?.type === 'VariableDeclaration') node.init.declarations.forEach(d => collectPattern(d.id, s));
        if (node.left?.type === 'VariableDeclaration') node.left.declarations.forEach(d => collectPattern(d.id, s));
        ['init', 'test', 'update', 'left', 'right', 'body'].forEach(k => node[k] && walk(node[k], node));
        scopes.pop(); return;
      }
      case 'CatchClause': {
        const s = new Set(); scopes.push(s);
        if (node.param) collectPattern(node.param, s);
        walk(node.body, node); scopes.pop(); return;
      }
      case 'Identifier': {
        // Positions that are names, not references.
        if (parent) {
          if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression')
              && parent.property === node && !parent.computed) return;
          if (parent.type === 'ObjectProperty' && parent.key === node && !parent.computed) return;
          if (parent.type === 'ObjectMethod' && parent.key === node && !parent.computed) return;
          if (parent.type === 'ClassMethod' && parent.key === node && !parent.computed) return;
          if (parent.type === 'JSXAttribute') return;
          if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' ||
              parent.type === 'ContinueStatement') return;
        }
        if (!declared(node.name) && !GLOBALS.has(node.name)) free.add(node.name);
        return;
      }
      case 'JSXIdentifier': {
        // Only a capitalised element name is a value reference; <div> is not.
        if (parent && (parent.type === 'JSXOpeningElement' || parent.type === 'JSXClosingElement')) {
          if (/^[A-Z]/.test(node.name) && !declared(node.name) && !GLOBALS.has(node.name)) free.add(node.name);
        }
        return;
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' ||
          k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, node));
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  }

  ast.program.body.forEach(n => walk(n, ast.program));
  return [...free].sort();
}

function walkDir(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full, out);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [];
for (const root of ROOTS) {
  const dir = path.join(SRC, root);
  if (fs.existsSync(dir)) walkDir(dir, files);
}
files.sort();

let failures = 0;
console.log(`Checking ${files.length} file(s) under ${ROOTS.map(r => 'src/' + r + '/').join(' and ')}:\n`);
for (const file of files) {
  const rel = path.relative(SRC, file).replace(/\\/g, '/');
  let free;
  try {
    free = freeIdentifiers(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('  FAIL ' + rel + '\n         could not parse: ' + err.message);
    failures++;
    continue;
  }
  if (free.length) {
    console.error('  FAIL ' + rel + '\n         references but does not import: ' + free.join(', '));
    failures++;
  } else {
    console.log('  ok   ' + rel);
  }
}

console.log();
if (failures) {
  console.error(`FAILED - ${failures} file(s) reference something they do not import.`);
  console.error('This does not fail a build; it fails at runtime, on whichever path touches it.');
  process.exit(1);
}
console.log('PASSED - every component and page file is self-contained.');
