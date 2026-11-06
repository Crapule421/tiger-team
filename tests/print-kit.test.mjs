// Unit tests for plugins/tiger-team/skills/deliverables/scripts/print-kit.mjs (no browser needed).
// Run: node --test tests/print-kit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  KitError, parseGantt, ganttHtml, weekLabelTask, weekLabelMilestone, strings, parseBrandTokens, tokensCss,
  remoteResources, localStylesheets, headerLogoUri, rasterSize, marginBoxesCss, unescapeHtml,
} from '../plugins/tiger-team/skills/deliverables/scripts/print-kit.mjs';

const GANTT = `
section Before the decision
Questions answered : -4, 0
Decision : milestone, 0
section Build
Prérequis du pilote : VPN, flux : crit, 2, 8
Build : 6, 18
Go : milestone, crit, 20
`;

test('gantt rows, labels that contain colons', () => {
  const { opts, rows } = parseGantt(GANTT);
  assert.deepEqual(opts, {});
  assert.deepEqual(rows[0], { kind: 'section', label: 'Before the decision' });
  assert.deepEqual(rows[3], { kind: 'section', label: 'Build' });
  assert.deepEqual(rows[4], { kind: 'task', label: 'Prérequis du pilote : VPN, flux', start: 2, end: 8, crit: true });
  assert.deepEqual(rows[6], { kind: 'milestone', label: 'Go', at: 20, crit: true });
});

test('week labels relative to the decision', () => {
  const t = strings('fr');
  assert.equal(weekLabelTask(0, 6, 'S', t), 'S1–S6');
  assert.equal(weekLabelTask(5, 6, 'S', t), 'S6');
  assert.equal(weekLabelTask(-4, 0, 'S', t), 'avant la décision');
  assert.equal(weekLabelTask(-2, 3, 'S', t), "jusqu'à S3");
  assert.equal(weekLabelMilestone(0, 'S', t), 'S0');
});

test('gantt html: language, axis extended after the last milestone, escaping', () => {
  const en = ganttHtml(parseGantt(GANTT), 'en');
  assert.match(en, /W7–W18/);
  assert.match(en, /Critical path/);
  assert.match(en, />W24</);
  const fr = ganttHtml(parseGantt(GANTT), 'fr');
  assert.match(fr, /Année 1 après la décision/);
  assert.match(fr, /S7–S18/);
  const escaped = ganttHtml(parseGantt('<b>x</b> : 0, 4'), 'en');
  assert.match(escaped, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.doesNotMatch(ganttHtml(parseGantt('Build : 0, 8\nGo : milestone, 8'), 'en'), /Critical path/);
});

test('gantt options and errors', () => {
  assert.equal(parseGantt('from: -8\nto: 30\ntick: 2\nA : 0, 4').opts.tick, '2');
  for (const bad of ['section A\nNo colon here', 'A : 6, 2', 'A : milestone, 1, 2', 'section only', 'A : x, 4']) {
    assert.throws(() => parseGantt(bad), KitError, bad);
  }
  assert.equal(unescapeHtml('Q &amp; A : 0, 4'), 'Q & A : 0, 4');
});

const SHEET = `# Env
## 11. Open points
| \`brand\` | \`#000000\` | wrong section |
## 12. Document branding (charte graphique)
| Token | Value | Source |
|---|---|---|
| \`brand\` | \`#0E4D5C\` | charter |
| \`ink-2\` | \`<#hex: secondary text>\` | placeholder |
| \`sans\` | \`"Brand Sans", Arial, sans-serif\` | |
| \`logo\` | \`brand/logo.svg\` | |
| \`unknown\` | \`x\` | |
`;

test('brand tokens: only the branding table, placeholders skipped', () => {
  const tokens = parseBrandTokens(SHEET);
  assert.deepEqual(tokens, { brand: '#0E4D5C', sans: '"Brand Sans", Arial, sans-serif', logo: 'brand/logo.svg' });
  assert.equal(tokensCss(tokens), ':root { --brand: #0E4D5C; --sans: "Brand Sans", Arial, sans-serif; }');
});

test('brand tokens: stylesheet injection refused', () => {
  for (const value of ['#000; } body { display:none', 'url(https://example.com/x.png)', 'red</style>']) {
    assert.throws(() => parseBrandTokens(`## Document branding\n| \`brand\` | \`${value}\` | |\n`), KitError, value);
  }
});

test('remote resources found, hyperlinks, data URIs, code and comments ignored', () => {
  const page = '<img src="https://example.com/a.png"><link rel="stylesheet" href="//cdn.example.org/f.css">'
    + '<div style="background:url(http://example.net/b.jpg)"></div><style>@import "https://x.example/y.css";</style>';
  assert.deepEqual(remoteResources(page), ['https://example.com/a.png', '//cdn.example.org/f.css', 'http://example.net/b.jpg', 'https://x.example/y.css']);
  const quiet = '<a href="https://example.com/doc">doc</a><img src="data:image/png;base64,AAAA">'
    + '<pre>url(https://example.com/in-code.css)</pre><code>src=https://x.example</code><!-- <img src="https://c.example/x.png"> -->';
  assert.deepEqual(remoteResources(quiet), []);
});

test('local stylesheets are found for the scan', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  fs.writeFileSync(path.join(dir, 'a.css'), '@import url("https://cdn.example.org/x.css");');
  const found = localStylesheets('<link rel="stylesheet" href="a.css"><link rel="stylesheet" href="missing.css">', dir);
  assert.deepEqual(found, [path.join(dir, 'a.css')]);
  assert.deepEqual(remoteResources(fs.readFileSync(found[0], 'utf8')), ['https://cdn.example.org/x.css']);
});

test('logo sized for the header: SVG resized, PNG wrapped', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  const svgFile = path.join(dir, 'logo.svg');
  fs.writeFileSync(svgFile, '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100"></svg>');
  const svg = Buffer.from(headerLogoUri(svgFile, 20).split(',')[1], 'base64').toString();
  assert.match(svg, /width="80.0" height="20"/);
  assert.doesNotMatch(svg, /width="400"/);

  const crc = (buf) => { let c = ~0; for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(300, 0); ihdr.writeUInt32BE(100, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.alloc(100 * 901))), chunk('IEND', Buffer.alloc(0))]);
  assert.deepEqual(rasterSize(png), [300, 100]);
  const pngFile = path.join(dir, 'logo.png');
  fs.writeFileSync(pngFile, png);
  const wrapped = Buffer.from(headerLogoUri(pngFile, 22).split(',')[1], 'base64').toString();
  assert.match(wrapped, /width="66.0" height="22" viewBox="0 0 300 100"/);
  assert.match(wrapped, /href="data:image\/png;base64,/);
});

test('margin boxes: localized page numbers, reference, nothing on the cover, quotes escaped', () => {
  const css = marginBoxesCss({ header: 'Title "quoted" </style>', footer: 'Example SA', reference: 'DEC-X-001', lang: 'fr', cover: true });
  assert.match(css, /"page " counter\(page\) " sur " counter\(pages\)/);
  assert.match(css, /"DEC-X-001  ·  "/);
  assert.match(css, /@page wide \{/);
  assert.match(css, /@page :first \{ @top-left \{ content: none; \}/);
  assert.match(css, /Title \\"quoted\\" \\3C \/style>/);
  assert.doesNotMatch(marginBoxesCss({ lang: 'en' }), /:first/);
});
