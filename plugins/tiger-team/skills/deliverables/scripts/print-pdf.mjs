#!/usr/bin/env node
// Render an HTML deliverable to PDF with a local Chromium-based browser (Edge or Chrome),
// through the DevTools protocol: no npm dependency. Needs Node.js 22+ (global WebSocket).
//
// Usage: node print-pdf.mjs <input.html> <output.pdf> [--landscape] [--footer "<left text>"] [--header "<right text>"]
//                           [--env <environment.md> | --no-env] [--allow-network]
//   BROWSER_PATH=<path to msedge/chrome> overrides the browser lookup.
//
// The page size and margins come from the CSS @page rules (print-base.css). Before printing, the script
//   - applies the brand tokens of the environment sheet (section 12, "Document branding": palette, fonts, logo,
//     footer, lang), found with --env or as docs/tiger-team/environment.md above the input file;
//   - draws every <pre class="gantt-weeks"> block as a Gantt chart in weeks relative to the decision (S0 / W0);
//   - puts the logo and the title at the top of each page, the footer text and "page n of N" at the bottom,
//     nothing on a .cover page (Chromium 131 or later; older browsers get the footer only).
// Nothing is downloaded without consent: a remote image, font or stylesheet stops the script (exit code 3)
// unless --allow-network is given, and the browser runs with remote requests blocked.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  EXIT, KitError, escapeHtml, unescapeHtml, strings, parseGantt, ganttHtml, parseBrandTokens, findEnvSheet, tokensCss,
  remoteResources, localStylesheets, localPath, dataUri, inlineFontCss, headerLogoUri, marginBoxesCss,
} from './print-kit.mjs';

const args = process.argv.slice(2);
const VALUE_FLAGS = ['--footer', '--header', '--env'];
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.includes(args[i - 1])));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs in the page: brand stylesheet, logo images, and what the script needs to know about the document.
function pageSetup({ css, logo }) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  for (const img of document.querySelectorAll('img[data-brand="logo"]')) { if (logo) img.src = logo; else img.remove(); }
  return {
    lang: document.documentElement.lang || '',
    title: document.title || '',
    cover: Boolean(document.querySelector('.cover')),
    reference: document.querySelector('meta[name="reference"]')?.content || '',
    gantt: [...document.querySelectorAll('pre.gantt-weeks')].map((p) => ({
      text: p.textContent, lang: p.closest('[lang]')?.getAttribute('lang') || '',
    })),
  };
}

async function main() {
  const [input, output] = positional;
  if (!input || !output) {
    throw new KitError('Usage: node print-pdf.mjs <input.html> <output.pdf> [--landscape] [--footer "<text>"] '
      + '[--header "<text>"] [--env <environment.md> | --no-env] [--allow-network]');
  }
  if (!fs.existsSync(input)) throw new KitError(`file not found: ${input}`);
  if (typeof WebSocket === 'undefined') throw new KitError('Node.js 22 or later is required (global WebSocket).');
  const allowNetwork = flag('--allow-network');
  const html = fs.readFileSync(input, 'utf8');

  // Brand tokens from the environment sheet.
  const envPath = flag('--no-env') ? null : (option('--env') ?? findEnvSheet(path.dirname(path.resolve(input))));
  if (envPath && !fs.existsSync(envPath)) throw new KitError(`environment sheet not found: ${envPath}`);
  const tokens = envPath ? parseBrandTokens(fs.readFileSync(envPath, 'utf8')) : {};
  const brandDir = envPath ? path.dirname(path.resolve(envPath)) : path.dirname(path.resolve(input));
  const localFile = (name) => {
    const file = localPath(tokens[name], brandDir);
    if (!file) throw new KitError(`brand token '${name}' must be a local file, not ${tokens[name]}: download it yourself and give its path`);
    if (!fs.existsSync(file)) throw new KitError(`brand token '${name}': file not found: ${file}`);
    return file;
  };
  const fontCss = tokens['font-css'] ? inlineFontCss(localFile('font-css')) : '';
  const logoFile = tokens.logo ? localFile('logo') : null;

  // Gantt blocks are checked before the browser starts, so a syntax error is reported at once.
  for (const m of html.matchAll(/<pre\b[^>]*\bclass\s*=\s*["'][^"']*\bgantt-weeks\b[^>]*>([\s\S]*?)<\/pre>/gi)) parseGantt(unescapeHtml(m[1]));

  // Nothing is downloaded without consent.
  const scanned = [html, fontCss, ...localStylesheets(html, path.dirname(path.resolve(input))).map((f) => fs.readFileSync(f, 'utf8'))];
  const remote = [...new Set(scanned.flatMap(remoteResources))];
  if (remote.length && !allowNetwork) {
    throw new KitError(`refused: the document needs ${remote.length} remote resource(s) and this script downloads nothing `
      + `without consent:\n${remote.map((u) => `  - ${u}`).join('\n')}\nDownload them yourself into a local folder and `
      + 'reference the local path, or run again with --allow-network if the user agrees to these downloads.', EXIT.refused);
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
  if (!browser) throw new KitError('No Chromium-based browser found: set BROWSER_PATH (this script does not download one).', EXIT.fail);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'print-pdf-'));
  const browserArgs = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--disable-gpu',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
    '--disable-component-update', '--disable-sync', '--no-pings'];
  if (!allowNetwork) browserArgs.push('--host-resolver-rules=MAP * ~NOTFOUND');
  const proc = spawn(browser, [...browserArgs, 'about:blank'], { stdio: 'ignore' });

  async function devtoolsPort() {
    const file = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100; i++) {
      try {
        const port = fs.readFileSync(file, 'utf8').split('\n')[0].trim();
        if (port) return port;
      } catch { /* not written yet, or still locked by the browser (Windows) */ }
      await sleep(100);
    }
    throw new KitError('The browser did not open its DevTools port.', EXIT.fail);
  }

  try {
    const port = await devtoolsPort();
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map(); const listeners = []; const handlers = [];
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
      else if (d.method) { for (const h of handlers) h(d); for (const l of listeners.splice(0)) l(d); }
    };
    const send = (method, params = {}) => new Promise((resolve) => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });
    const once = (name) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${name}`)), 30000);
      const check = (d) => { if (d.method === name) { clearTimeout(timer); resolve(d); } else listeners.push(check); };
      listeners.push(check);
    });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new KitError(`page script failed: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`, EXIT.fail);
      return r.result?.result?.value;
    };

    // Remote requests that slip past the scan are blocked and reported, never downloaded.
    const blocked = new Set(); const requests = new Map();
    if (!allowNetwork) {
      handlers.push((d) => {
        if (d.method === 'Network.requestWillBeSent') requests.set(d.params.requestId, d.params.request.url);
        if (d.method === 'Network.loadingFailed' && /^(?:https?|wss?):/i.test(requests.get(d.params.requestId) ?? '')) blocked.add(requests.get(d.params.requestId));
      });
      await send('Network.enable');
      await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*', 'ws://*', 'wss://*'] });
    }

    await send('Page.enable');
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url: pathToFileURL(path.resolve(input)).href });
    await loaded;

    const logo = logoFile ? dataUri(logoFile) : '';
    const info = await evaluate(`(${pageSetup})(${JSON.stringify({ css: `${fontCss}\n${tokensCss(tokens)}`, logo })})`);
    const lang = info.lang || tokens.lang || 'en';
    if (info.gantt.length) {
      const charts = info.gantt.map((g) => ganttHtml(parseGantt(g.text), g.lang || lang));
      await evaluate(`((charts) => { [...document.querySelectorAll('pre.gantt-weeks')].forEach((p, i) => { p.outerHTML = charts[i]; }); })(${JSON.stringify(charts)})`);
    }

    const footerText = option('--footer') ?? tokens.footer ?? '';
    const title = info.title.length <= 60 ? info.title : `${info.title.slice(0, 60).replace(/[\s,;:]+\S*$/, '')}\u2026`;
    const header = option('--header') ?? (logoFile || tokens.footer ? title : '');
    const version = (await send('Browser.getVersion')).result?.product ?? '';
    const marginBoxes = Number(version.match(/\/(\d+)\./)?.[1] ?? 0) >= 131;
    if (marginBoxes) {
      const css = marginBoxesCss({
        header, footer: footerText, reference: info.reference, logoUri: logoFile ? headerLogoUri(logoFile) : '',
        lang, font: tokens.sans, color: tokens['ink-2'], cover: info.cover,
      });
      await evaluate(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s); })()`);
    }
    await evaluate('document.fonts.ready.then(() => true)');
    await sleep(300);

    const t = strings(lang);
    const footer = '<div style="font-family:Arial,sans-serif;font-size:7.5pt;color:#555;width:100%;padding:0 15mm;'
      + 'display:flex;justify-content:space-between;-webkit-print-color-adjust:exact">'
      + `<span>${escapeHtml(footerText)}</span><span>page <span class="pageNumber"></span>${escapeHtml(t.of)}<span class="totalPages"></span></span></div>`;
    const result = await send('Page.printToPDF', {
      landscape: flag('--landscape'), printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: !marginBoxes, headerTemplate: '<span></span>', footerTemplate: footer,
    });
    if (!result.result) throw new KitError(JSON.stringify(result.error), EXIT.fail);
    fs.writeFileSync(output, Buffer.from(result.result.data, 'base64'));
    console.log(`PDF written: ${output}`);
    if (blocked.size) console.warn(`blocked, not downloaded:\n${[...blocked].map((u) => `  - ${u}`).join('\n')}`);
    ws.close();
  } finally {
    proc.kill();
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* profile still locked: left in the temp folder */ }
  }
}

main().catch((err) => {
  console.error(`print-pdf: ${err.message}`);
  process.exit(err instanceof KitError ? err.code : EXIT.fail);
});
