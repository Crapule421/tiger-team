#!/usr/bin/env node
// Calculation file of the fictitious example (Nordelle, managed file transfer platform): node chiffrage.mjs
// Produces every cost table of dossier-decision-mft.md from one parameter table: one capacity basis, cash-out apart
// from full cost, steering and contingency per phase, range, three-year cost by year after the decision.
// Paste its output into the dossier; never retype a figure by hand.

// ----------------------------------------------------------------------------- parameters (P1-P10)
const P1_DAYS = 209;                       // working days per FTE per year
const P2_AVAIL = 0.80;                     // availability for the project
const P3_PROD = P1_DAYS * P2_AVAIL;        // productive days per FTE per year
const P4_LOADED = 88_000;                  // loaded annual cost of an internal FTE, EUR
const P5_DAY = P4_LOADED / P1_DAYS;        // internal day cost, EUR
const TJM = { integrator: 720, 'vendor expert': 1050 };   // P6, EUR excl. VAT
const P7_STEER = 0.12;                     // steering, share of effort
const [LOW, HIGH] = [0.75, 1.35];          // P9, range at scoping
const TEAM = 2;                            // internal FTE on the project
const COMMITTED_A = 2;                     // phases committed by the decision: preparation, platform and pilot
const DEFER_PREMIUM = 35;                  // option 0: one year of extended support, k EUR

// [name, [first week, last week], internal days, vendor days by profile, purchases k EUR, contingency]
const PHASES_A = [
  ['Préparation', [1, 6], 32, { 'vendor expert': 8 }, { licences: 12 }, 0.10],
  ['Socle et pilote', [7, 16], 55, { integrator: 45, 'vendor expert': 10 }, { infra: 6, other: 9 }, 0.20],
  ['Migration des partenaires', [17, 34], 100, { integrator: 60 }, {}, 0.25],
  ['Décommissionnement', [35, 38], 20, { integrator: 5 }, { other: 2 }, 0.15],
];
const PHASES_B = [
  ['Préparation', [1, 4], 20, { 'vendor expert': 4 }, { licences: 85 }, 0.10],
  ['Mise à niveau et migration', [5, 30], 140, { 'vendor expert': 70 }, { infra: 18, other: 9 }, 0.20],
];
// Run cost of each option (PM playbook §15): [label, k EUR per year or FTE, first week, kind]
const RUN_A = [['Abonnement MFT', 42, 7, 'cash'], ["Support de l'intégrateur", 6, 39, 'cash'],
  ['Exploitation interne, 0,4 ETP', 0.4, 39, 'fte'], ["Support et hébergement de l'ancienne passerelle", 29, 39, 'avoided']];
const RUN_B = [["Support de l'éditeur", 19, 1, 'cash'], ['Exploitation interne, 0,7 ETP', 0.7, 31, 'fte'],
  ["Support de l'ancienne version", 21, 31, 'avoided']];

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const k = (x) => x.toFixed(1).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = (x) => `${Math.round(x * 100)} %`;

function costPhase([name, weeks, internal, vendor, purchases, cont]) {
  const vendorK = sum(Object.entries(vendor).map(([p, d]) => d * TJM[p])) / 1000;
  const purch = sum(Object.values(purchases));
  const cash = (vendorK * (1 + P7_STEER) + purch) * (1 + cont);
  const intDays = internal * (1 + P7_STEER);
  const valued = (intDays * P5_DAY / 1000) * (1 + cont);
  const available = TEAM * (weeks[1] - weeks[0] + 1) / 52 * P3_PROD;
  return { name, weeks, vendorK, purch, cont, cash, intDays, valued, full: cash + valued, available, load: intDays / available };
}

// Weeks of [first, last] that fall in year n (year 1 = S1-S52 after the decision).
const yearWeeks = (first, last, n) => Math.max(0, Math.min(last, 52 * n) - Math.max(first, 52 * (n - 1) + 1) + 1);

function threeYears(phases, run) {
  const rows = { 'Décaissé projet': [0, 0, 0], 'Décaissé récurrent': [0, 0, 0], 'Temps interne valorisé, projet': [0, 0, 0],
    'Temps interne valorisé, exploitation': [0, 0, 0], 'Décaissé évité': [0, 0, 0] };
  for (const p of phases) {
    const n = p.weeks[1] - p.weeks[0] + 1;
    for (const y of [1, 2, 3]) {
      rows['Décaissé projet'][y - 1] += p.cash * yearWeeks(...p.weeks, y) / n;
      rows['Temps interne valorisé, projet'][y - 1] += p.valued * yearWeeks(...p.weeks, y) / n;
    }
  }
  for (const [, amount, first, kind] of run) {
    for (const y of [1, 2, 3]) {
      const share = yearWeeks(first, 156, y) / 52;
      if (kind === 'cash') rows['Décaissé récurrent'][y - 1] += amount * share;
      else if (kind === 'fte') rows['Temps interne valorisé, exploitation'][y - 1] += amount * P4_LOADED / 1000 * share;
      else rows['Décaissé évité'][y - 1] += amount * share;
    }
  }
  const cash = [0, 1, 2].map((i) => rows['Décaissé projet'][i] + rows['Décaissé récurrent'][i]);
  const full = [0, 1, 2].map((i) => cash[i] + rows['Temps interne valorisé, projet'][i] + rows['Temps interne valorisé, exploitation'][i]);
  const net = [0, 1, 2].map((i) => cash[i] - rows['Décaissé évité'][i]);
  return { rows, cash, full, net };
}

const table = (header, rows) => [`| ${header.join(' | ')} |`, `|${header.map((_, i) => (i ? '---:' : '---')).join('|')}|`,
  ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const range = (x) => `**${k(x)}** (${k(x * LOW)} à ${k(x * HIGH)})`;

console.log(`P3 = ${P3_PROD.toFixed(1)} productive days, P5 = ${Math.round(P5_DAY)} EUR per day\n`);
const summary = {};
for (const [label, phasesIn, run] of [['A', PHASES_A, RUN_A], ['B', PHASES_B, RUN_B]]) {
  const ph = phasesIn.map(costPhase);
  console.log(`## Option ${label}\n`);
  console.log(table(['Phase', 'Semaines', 'Jours internes (pilotage inclus)', 'Jours disponibles', 'Charge'],
    ph.map((p) => [p.name, `S${p.weeks[0]}–S${p.weeks[1]}`, k(p.intDays), k(p.available), pct(p.load)])));
  console.log();
  const tot = (key) => sum(ph.map((p) => p[key]));
  console.log(table(['Phase', 'Prestation', 'Achats', 'Contingence', 'Décaissé', 'Jours internes', 'Temps interne valorisé', 'Coût complet'],
    [...ph.map((p) => [p.name, k(p.vendorK), k(p.purch), pct(p.cont), k(p.cash), k(p.intDays), k(p.valued), k(p.full)]),
      ['**Total**', k(tot('vendorK')), '', '', `**${k(tot('cash'))}**`, k(tot('intDays')), k(tot('valued')), `**${k(tot('full'))}**`]]));
  console.log();
  const { rows, cash, full, net } = threeYears(ph, run);
  const line = (name) => [name, ...rows[name].map(k), k(sum(rows[name]))];
  console.log(table(['k€ HT', 'Année 1', 'Année 2', 'Année 3', 'Total sur 3 ans'], [
    line('Décaissé projet'), line('Décaissé récurrent'), ['**Décaissé**', ...cash.map(k), range(sum(cash))],
    line('Temps interne valorisé, projet'), line('Temps interne valorisé, exploitation'),
    ['**Coût complet**', ...full.map(k), range(sum(full))], line('Décaissé évité'), ['**Décaissé net**', ...net.map(k), `**${k(sum(net))}**`]]));
  console.log();
  const committed = label === 'A' ? ph.slice(0, COMMITTED_A) : ph;
  summary[label] = { now: sum(committed.map((p) => p.cash)), nowInternal: sum(committed.map((p) => p.valued)),
    cash3: sum(cash), full3: sum(full), runYear2: rows['Décaissé récurrent'][1] };
}

const a = summary.A;
console.log(`Option A committed now: cash-out ${k(a.now)} (${k(a.now * LOW)} to ${k(a.now * HIGH)}), internal time ${k(a.nowInternal)}\n`);
console.log(table(['Option', 'Décaissé engagé maintenant', 'Décaissé sur 3 ans', 'Coût complet sur 3 ans (fourchette)', 'Décaissé récurrent, année 2'], [
  ...Object.entries(summary).map(([name, s]) => [name, k(s.now), k(s.cash3), `${k(s.full3)} (${k(s.full3 * LOW)} à ${k(s.full3 * HIGH)})`, k(s.runYear2)]),
  ["0. Report d'un an", k(DEFER_PREMIUM), `${k(DEFER_PREMIUM)} puis A décalé d'un an`, 'non comparable', '']]));
console.log();

// Savings levers on option A
const mig = PHASES_A[2];
const vendorSaved = mig[3].integrator * TJM.integrator / 1000 * (1 + P7_STEER) * (1 + mig[5]);
const thirdFte = 18 / 52 * P4_LOADED / 1000 * (1 + mig[5]);
console.log(`Lever, internal FTE during migration: cash-out -${k(vendorSaved)}, full cost ${k(thirdFte - vendorSaved)}`);
console.log(`Lever, 3-year subscription commitment (-10 %): -${k(42 * 0.10 * (46 / 52 + 2))}`);
console.log(`Lever, reuse existing VMs: -${k(6 * (1 + PHASES_A[1][5]))}`);
