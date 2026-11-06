#!/usr/bin/env node
// Render an HTML deliverable to PDF with a local Chromium-based browser (Edge or Chrome),
// through the DevTools protocol: no npm dependency. Needs Node.js 22+ (global WebSocket).
//
// Usage: node print-pdf.mjs <input.html> <output.pdf> [--landscape] [--footer "<left text>"]
//   BROWSER_PATH=<path to msedge/chrome> overrides the browser lookup.
// The page size and margins come from the CSS @page rule (print-base.css); the footer shows
// the given text on the left and "page n of N" on the right. The script waits for web fonts.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--footer'));
const [input, output] = positional;
if (!input || !output) {
  console.error('Usage: node print-pdf.mjs <input.html> <output.pdf> [--landscape] [--footer "<text>"]');
  process.exit(1);
}
if (typeof WebSocket === 'undefined') {
  console.error('Node.js 22 or later is required (global WebSocket).');
  process.exit(1);
}

const candidates = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/microsoft-edge',
].filter(Boolean);
const browser = candidates.find((p) => fs.existsSync(p));
if (!browser) {
  console.error('No Chromium-based browser found: set BROWSER_PATH.');
  process.exit(1);
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const footerText = escapeHtml(option('--footer') ?? '');
const footer = '<div style="font-family:Arial,sans-serif;font-size:7.5pt;color:#555;width:100%;padding:0 15mm;' +
  'display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">' +
  `<span>${footerText}</span><span>page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'print-pdf-'));
const proc = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--disable-gpu', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

async function devtoolsPort() {
  const file = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100; i++) {
    if (fs.existsSync(file)) { const port = fs.readFileSync(file, 'utf8').split('\n')[0].trim(); if (port) return port; }
    await sleep(100);
  }
  throw new Error('The browser did not open its DevTools port.');
}

try {
  const port = await devtoolsPort();
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method) { for (const l of listeners.splice(0)) l(d); }
  };
  const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
  const once = (name) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${name}`)), 30000);
    const check = (d) => { if (d.method === name) { clearTimeout(timer); resolve(d); } else listeners.push(check); };
    listeners.push(check);
  });

  await send('Page.enable');
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: pathToFileURL(path.resolve(input)).href });
  await loaded;
  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
  await sleep(300);
  const result = await send('Page.printToPDF', {
    landscape: flag('--landscape'), printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer,
  });
  if (!result.result) throw new Error(JSON.stringify(result.error));
  fs.writeFileSync(output, Buffer.from(result.result.data, 'base64'));
  console.log(`PDF written: ${output}`);
  ws.close();
} finally {
  proc.kill();
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* profile still locked: left in the temp folder */ }
}
