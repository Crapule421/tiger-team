// Helpers of the PDF rendering kit, used by print-pdf.mjs: brand tokens read from the environment sheet,
// Gantt charts in weeks relative to the decision, scan for remote resources, logo sizing, page margin boxes.
// Plain Node.js, no npm dependency.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXIT = { ok: 0, fail: 1, usage: 2, refused: 3 };

export class KitError extends Error {
  constructor(message, code = EXIT.usage) { super(message); this.code = code; }
}

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const unescapeHtml = (s) => String(s).replace(/<[^>]+>/g, '').replace(/&(lt|gt|quot|#39|apos|amp);/g,
  (_, n) => ({ lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", amp: '&' }[n]));

export const I18N = {
  en: {
    prefix: 'W', of: ' of ', before: 'before the decision', until: 'until {w}',
    bandBefore: 'Before', yearFirst: 'Year 1 after the decision', yearN: 'Year {n}',
    head: 'Step and weeks after the decision', step: 'Step', crit: 'Critical path',
    milestone: 'Decision or milestone', origin: 'the decision',
    note: '{p}0: {origin}. {p}{a}, {p}{b}: end of week {a}, {b}.',
  },
  fr: {
    prefix: 'S', of: ' sur ', before: 'avant la décision', until: "jusqu'à {w}",
    bandBefore: 'Avant', yearFirst: 'Année 1 après la décision', yearN: 'Année {n}',
    head: 'Étape et semaines après la décision', step: 'Étape', crit: 'Chemin critique',
    milestone: 'Décision ou jalon', origin: 'la décision',
    note: '{p}0 : {origin}. {p}{a}, {p}{b} : fin de la {a}e et de la {b}e semaine.',
  },
};
export const strings = (lang) => I18N[String(lang || 'en').slice(0, 2).toLowerCase()] ?? I18N.en;
const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, k) => String(values[k]));

// ------------------------------------------------------------------ Gantt in weeks relative to the decision

const GANTT_OPTIONS = new Set(['from', 'to', 'tick', 'bands', 'caption', 'prefix', 'origin', 'label-width']);

function week(text, where) {
  const s = String(text).trim().replace('\u2212', '-');
  const value = Number(s);
  if (s === '' || !Number.isFinite(value)) throw new KitError(`${where}: '${s}' is not a week number`);
  return value;
}

/**
 * Parse the text of a gantt-weeks block. Weeks are counted from the decision (0); negative weeks are before it.
 *   section <name>
 *   <label> : <start>, <end>            a step
 *   <label> : crit, <start>, <end>      a step on the critical path
 *   <label> : milestone, <week>         a decision or milestone (add crit to colour it)
 * Options, one per line: from, to, tick, bands (Label: week | Label: week), caption, prefix, origin, label-width.
 */
export function parseGantt(source) {
  const opts = {};
  const rows = [];
  String(source).split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || line.startsWith('#')) return;
    const where = `gantt-weeks, line ${i + 1}`;
    const option = line.match(/^([a-z-]+)\s*:\s*(.*)$/);
    if (option && GANTT_OPTIONS.has(option[1])) { opts[option[1]] = option[2].trim(); return; }
    if (/^section\s/i.test(line)) { rows.push({ kind: 'section', label: line.slice(8).trim() }); return; }
    const colon = line.lastIndexOf(':');
    if (colon < 0) throw new KitError(`${where}: expected 'label : start, end', 'label : milestone, week' or 'section <name>'`);
    const label = line.slice(0, colon).trim();
    const parts = line.slice(colon + 1).split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
    const crit = parts.includes('crit');
    const milestone = parts.includes('milestone');
    const nums = parts.filter((p) => p !== 'crit' && p !== 'milestone').map((p) => week(p, where));
    if (!label) throw new KitError(`${where}: the label is empty`);
    if (milestone) {
      if (nums.length !== 1) throw new KitError(`${where}: a milestone takes one week`);
      rows.push({ kind: 'milestone', label, at: nums[0], crit });
    } else {
      if (nums.length !== 2 || nums[1] <= nums[0]) throw new KitError(`${where}: a step takes a start week and a later end week`);
      rows.push({ kind: 'task', label, start: nums[0], end: nums[1], crit });
    }
  });
  if (!rows.some((r) => r.kind !== 'section')) throw new KitError('gantt-weeks: no step or milestone');
  return { opts, rows };
}

export function weekLabelTask(a, b, prefix, t) {
  if (b <= 0) return t.before;
  if (a < 0) return fill(t.until, { w: `${prefix}${b}` });
  return b - a <= 1 ? `${prefix}${b}` : `${prefix}${a + 1}\u2013${prefix}${b}`;
}

export const weekLabelMilestone = (w, prefix, t) => (w < 0 ? t.before : `${prefix}${w}`);

/** HTML of a Gantt chart (classes g-* of print-base.css) from parseGantt's result. */
export function ganttHtml({ opts, rows }, lang = 'en') {
  const t = strings(lang);
  const e = escapeHtml;
  const prefix = opts.prefix ?? t.prefix;
  const weeks = rows.flatMap((r) => (r.kind === 'task' ? [r.start, r.end] : r.kind === 'milestone' ? [r.at] : []));
  const lo = Math.min(...weeks, 0);
  const hi = Math.max(...weeks, 1);
  const guess = hi - Math.min(lo, 0);
  const tick = 'tick' in opts ? week(opts.tick, 'gantt-weeks, tick') : guess <= 78 ? 4 : guess <= 156 ? 8 : 13;
  if (!Number.isInteger(tick) || tick <= 0) throw new KitError('gantt-weeks: tick must be a positive whole number of weeks');
  const start = 'from' in opts ? week(opts.from, 'gantt-weeks, from') : lo < 0 ? -tick * Math.ceil(-lo / tick) : 0;
  const lastMilestone = Math.max(...rows.filter((r) => r.kind === 'milestone').map((r) => r.at), -Infinity);
  const end = 'to' in opts ? week(opts.to, 'gantt-weeks, to') : tick * Math.ceil(Math.max(hi, lastMilestone + 1) / tick);
  if (end <= start) throw new KitError("gantt-weeks: 'to' must be after 'from'");
  const pos = (w) => ((Math.min(Math.max(w, start), end) - start) / (end - start)) * 100;
  const pct = (x) => x.toFixed(3);

  let marks;
  if ('bands' in opts) {
    marks = opts.bands.split('|').map((item) => {
      const i = item.lastIndexOf(':');
      return [item.slice(0, Math.max(i, 0)).trim(), week(item.slice(i + 1), 'gantt-weeks, bands')];
    });
  } else {
    marks = start < 0 ? [[t.bandBefore, start]] : [];
    for (let k = 0; k < Math.max(1, Math.ceil(end / 52)); k++) marks.push([k === 0 ? t.yearFirst : fill(t.yearN, { n: k + 1 }), 52 * k]);
  }
  const bands = [];
  marks.forEach(([name, a], i) => {
    const b = i + 1 < marks.length ? marks[i + 1][1] : end;
    const [a2, b2] = [Math.max(a, start), Math.min(b, end)];
    if (b2 > a2) bands.push([name, a2, b2]);
  });
  const first = start <= 0 ? 0 : Math.ceil(start / tick) * tick;
  const grid = [];
  for (let w = first; w < end; w += tick) grid.push(w);
  const cells = (start < 0 ? [[start, Math.min(0, end), '']] : [])
    .concat(grid.map((w) => [w, Math.min(w + tick, end), `${prefix}${Math.min(w + tick, end)}`]));
  const seps = grid.filter((w) => w > start)
    .map((w) => `<i class="g-sep${w % 52 === 0 ? ' y' : ''}" style="left:${pct(pos(w))}%"></i>`).join('');
  const box = (cls, a, b, text) => `<div class="${cls}" style="left:${pct(pos(a))}%;width:${pct(pos(b) - pos(a))}%">${e(text)}</div>`;

  const out = [
    `<figure class="gantt-figure"><div class="gantt" style="--lw:${e(opts['label-width'] ?? '33%')}">`,
    '<div class="g-row g-head"><div class="g-label"></div><div class="g-track">',
    bands.map(([name, a, b]) => box('g-band', a, b, name)).join(''), '</div></div>',
    `<div class="g-row g-head g-ticks"><div class="g-label g-when">${e(t.head)}</div><div class="g-track">`,
    cells.map(([a, b, label]) => box('g-tick', a, b, label)).join(''), '</div></div>',
  ];
  let hasCrit = false;
  for (const r of rows) {
    if (r.kind === 'section') {
      out.push(`<div class="g-row g-section"><div class="g-label">${e(r.label)}</div><div class="g-track">${seps}</div></div>`);
    } else if (r.kind === 'task') {
      hasCrit ||= r.crit;
      const width = Math.max(pos(r.end) - pos(r.start), 0.7);
      out.push(`<div class="g-row"><div class="g-label"><span>${e(r.label)}</span>`
        + `<span class="g-when">${e(weekLabelTask(r.start, r.end, prefix, t))}</span></div>`
        + `<div class="g-track">${seps}<div class="g-bar${r.crit ? ' crit' : ''}" `
        + `style="left:${pct(pos(r.start))}%;width:${pct(width)}%"></div></div></div>`);
    } else {
      hasCrit ||= r.crit;
      const when = weekLabelMilestone(r.at, prefix, t);
      const side = pos(r.at) > 82 ? `right:calc(${pct(100 - pos(r.at))}% + 7pt)` : `left:calc(${pct(pos(r.at))}% + 7pt)`;
      out.push(`<div class="g-row g-ms-row"><div class="g-label"><span>${e(r.label)}</span>`
        + `<span class="g-when">${e(when)}</span></div><div class="g-track">${seps}`
        + `<div class="g-ms${r.crit ? ' crit' : ''}" style="left:${pct(pos(r.at))}%"></div>`
        + `<span class="g-ms-label" style="${side}">${e(when)}</span></div></div>`);
    }
  }
  out.push('</div>');
  const legend = [`<span><i class="lg-bar"></i>${e(t.step)}</span>`];
  if (hasCrit) legend.push(`<span><i class="lg-bar crit"></i>${e(t.crit)}</span>`);
  legend.push(`<span><i class="lg-ms"></i>${e(t.milestone)}</span>`);
  legend.push(`<span class="g-note">${e(fill(t.note, { p: prefix, origin: opts.origin ?? t.origin, a: tick, b: 2 * tick }))}</span>`);
  out.push(`<div class="g-legend">${legend.join('')}</div>`);
  if (opts.caption) out.push(`<figcaption>${e(opts.caption)}</figcaption>`);
  out.push('</figure>');
  return out.join('');
}

// ------------------------------------------------------------------ brand tokens (environment sheet, section 12)

export const CSS_TOKENS = new Set([
  'brand', 'heading', 'ink', 'ink-2', 'line', 'surface',
  'crit', 'crit-tint', 'crit-line', 'warn', 'warn-tint', 'warn-line',
  'info', 'info-tint', 'info-line', 'ok', 'ok-tint', 'ok-line',
  'sans', 'head', 'mono', 'gantt-bar', 'gantt-crit',
]);
export const OTHER_TOKENS = new Set(['logo', 'font-css', 'footer', 'lang']);

/** Read the 'Document branding' table of an environment sheet: | token | value | source |. */
export function parseBrandTokens(text) {
  const tokens = {};
  let inside = false;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(line)) { inside = /branding|charte/i.test(line); continue; }
    if (!inside || !line.trimStart().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|+|\|+$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    const name = cells[0].replace(/^[`*\s]+|[`*\s]+$/g, '').toLowerCase().replace(/^-+/, '');
    const value = cells[1].replace(/^`+|`+$/g, '').trim();
    if (!value || (value.startsWith('<') && value.endsWith('>'))) continue;
    if (CSS_TOKENS.has(name) || OTHER_TOKENS.has(name)) tokens[name] = value;
  }
  for (const [name, value] of Object.entries(tokens)) {
    if (CSS_TOKENS.has(name) && /[;{}<>\\]|url\s*\(|@import|expression\s*\(/i.test(value)) {
      throw new KitError(`brand token '${name}': value not allowed in a stylesheet: ${value}`);
    }
  }
  return tokens;
}

export function findEnvSheet(startDir) {
  for (let dir = path.resolve(startDir); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'docs', 'tiger-team', 'environment.md');
    if (fs.existsSync(candidate)) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
}

export const tokensCss = (tokens) => `:root { ${Object.entries(tokens)
  .filter(([k]) => CSS_TOKENS.has(k)).map(([k, v]) => `--${k}: ${v};`).join(' ')} }`;

// ------------------------------------------------------------------ resources: nothing is downloaded without consent

const REMOTE = String.raw`(?:https?:)?//[^\s"'<>)]+`;
const RESOURCE_PATTERNS = [
  String.raw`<(?!a\b)[a-z][\w-]*\b[^>]*?\s(?:src|srcset|poster|data|background)\s*=\s*["']?\s*(${REMOTE})`,
  String.raw`<link\b[^>]*?\shref\s*=\s*["']?\s*(${REMOTE})`,
  String.raw`<(?:image|use|feimage)\b[^>]*?\s(?:xlink:)?href\s*=\s*["']?\s*(${REMOTE})`,
  String.raw`url\(\s*["']?\s*(${REMOTE})`,
  String.raw`@import\s+(?:url\()?\s*["']?\s*(${REMOTE})`,
].map((s) => new RegExp(s, 'gi'));

/** Remote URLs a page or stylesheet would load (images, fonts, stylesheets); plain hyperlinks are ignored. */
export function remoteResources(text) {
  const scanned = String(text).replace(/<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>|<!--[\s\S]*?-->/gi, '');
  const found = [];
  for (const rx of RESOURCE_PATTERNS) for (const m of scanned.matchAll(rx)) if (!found.includes(m[1])) found.push(m[1]);
  return found;
}

/** Local stylesheets linked by a page, as absolute paths. */
export function localStylesheets(html, baseDir) {
  return [...String(html).matchAll(/<link\b[^>]*\brel\s*=\s*["']?stylesheet[^>]*>/gi)]
    .map((m) => m[0].match(/\shref\s*=\s*["']([^"']+)["']/i)?.[1])
    .map((href) => (href ? localPath(href, baseDir) : null))
    .filter((p) => p && fs.existsSync(p));
}

const MIME = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

/** The local file a reference points to, or null for data:, http(s): and other schemes. */
export function localPath(ref, baseDir) {
  const r = String(ref).trim();
  if (/^[A-Za-z]:[\\/]/.test(r)) return r;
  if (/^file:/i.test(r)) return fileURLToPath(r);
  if (/^(?:[A-Za-z][\w+.-]*:|\/\/)/.test(r)) return null;
  return path.resolve(baseDir, decodeURIComponent(r.split(/[?#]/)[0]));
}

export function dataUri(file) {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new KitError(`unsupported file type for embedding: ${file}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

/** A local @font-face stylesheet with its local font files embedded. */
export function inlineFontCss(file) {
  return fs.readFileSync(file, 'utf8').replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (whole, _q, ref) => {
    const target = localPath(ref, path.dirname(file));
    if (!target) return whole;
    if (!fs.existsSync(target)) throw new KitError(`font file not found: ${ref} (in ${file})`);
    return `url("${dataUri(target)}")`;
  });
}

/** Width and height of a PNG or JPEG image, read from its header. */
export function rasterSize(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

/** The logo as a data URI sized for the page header; a PNG or JPEG logo is wrapped in a sized SVG. */
export function headerLogoUri(file, heightPx = 22) {
  const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  if (path.extname(file).toLowerCase() !== '.svg') {
    const size = rasterSize(fs.readFileSync(file));
    if (!size || !size[0] || !size[1]) throw new KitError(`logo: use an SVG, PNG or JPEG file (${file})`);
    const [w, h] = size;
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${(heightPx * w / h).toFixed(1)}" height="${heightPx}" `
      + `viewBox="0 0 ${w} ${h}"><image href="${dataUri(file)}" width="${w}" height="${h}"/></svg>`);
  }
  const svg = fs.readFileSync(file, 'utf8').replace(/<\?xml[^>]*\?>/, '').trim();
  const tag = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) throw new KitError(`not an SVG file: ${file}`);
  const vb = tag.match(/viewBox\s*=\s*["']\s*[-\d.eE]+[ ,]+[-\d.eE]+[ ,]+([\d.eE]+)[ ,]+([\d.eE]+)/);
  let w; let h; let extra = '';
  if (vb) { [w, h] = [Number(vb[1]), Number(vb[2])]; } else {
    w = Number(tag.match(/\swidth\s*=\s*["']([\d.]+)/)?.[1] ?? 4);
    h = Number(tag.match(/\sheight\s*=\s*["']([\d.]+)/)?.[1] ?? 1);
    extra = ` viewBox="0 0 ${w} ${h}"`;
  }
  const sized = tag.replace(/\s(?:width|height)\s*=\s*["'][^"']*["']/g, '')
    .replace(/^<svg\b/i, `<svg width="${(heightPx * w / h).toFixed(1)}" height="${heightPx}"${extra}`);
  return svgUri(svg.replace(tag, sized));
}

// ------------------------------------------------------------------ page margin boxes (Chromium 131 or later)

export const cssString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3C ').replace(/\r?\n/g, ' ')}"`;

/** @page margin boxes: logo and title at the top, footer text and "page n of N" at the bottom; none on a cover. */
export function marginBoxesCss({ header = '', footer = '', reference = '', logoUri = '', lang = 'en', font, color, cover = false }) {
  const t = strings(lang);
  const box = `font-family: ${font || 'system-ui, "Segoe UI", Arial, sans-serif'}; font-size: 7.5pt; color: ${color || '#5A5A5A'};`;
  const right = `${reference ? `${cssString(`${reference}  \u00b7  `)} ` : ''}"page " counter(page) ${cssString(t.of)} counter(pages)`;
  const boxes = [];
  if (logoUri) boxes.push(`@top-left { content: url("${logoUri}"); vertical-align: bottom; padding-bottom: 3mm; }`);
  if (header) boxes.push(`@top-right { content: ${cssString(header)}; ${box} vertical-align: bottom; padding-bottom: 3.5mm; }`);
  if (footer) boxes.push(`@bottom-left { content: ${cssString(footer)}; ${box} vertical-align: top; padding-top: 4mm; }`);
  boxes.push(`@bottom-right { content: ${right}; ${box} vertical-align: top; padding-top: 4mm; white-space: pre; }`);
  let css = `@page { ${boxes.join(' ')} }\n@page wide { ${boxes.join(' ')} }\n`;
  if (cover) css += '@page :first { @top-left { content: none; } @top-right { content: none; } @bottom-left { content: none; } @bottom-right { content: none; } }\n';
  return css;
}
