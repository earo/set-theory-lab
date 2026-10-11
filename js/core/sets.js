import { evaluate } from './expr.js';

export class SetError extends Error {}

const MAX_ELEMENTS = 60;

// "{1, 2, 3}", "1 2 3", "a, b" or a range like "1..10" → array of unique strings.
export function parseSetInfo(text) {
  let body = (text || '').trim();
  if (body.startsWith('{')) body = body.slice(1);
  if (body.endsWith('}')) body = body.slice(0, -1);
  body = body.trim();
  if (!body || body === '∅') return { elements: [], duplicates: [] };
  const parts = (/[,;]/.test(body) ? body.split(/[,;]/) : body.split(/\s+/)).map((p) => p.trim()).filter(Boolean);
  const elements = [], duplicates = [];
  const add = (x) => (elements.includes(x) ? duplicates.includes(x) || duplicates.push(x) : elements.push(x));
  for (const part of parts) {
    const range = part.match(/^(-?\d+)\s*(?:\.\.+|…)\s*(-?\d+)$/);
    if (range) {
      const lo = +range[1], hi = +range[2];
      if (hi < lo) throw new SetError(`The range ${part} goes backwards — write the smaller number first.`);
      if (hi - lo >= MAX_ELEMENTS) throw new SetError(`The range ${part} is too big. Keep sets to ${MAX_ELEMENTS} elements or fewer.`);
      for (let n = lo; n <= hi; n++) add(String(n));
    } else add(part);
  }
  if (elements.length > MAX_ELEMENTS) throw new SetError(`That set has ${elements.length} elements. Keep sets to ${MAX_ELEMENTS} or fewer so the steps stay readable.`);
  return { elements: sortElements(elements), duplicates };
}

export const parseSet = (text) => parseSetInfo(text).elements;

const isNum = (x) => x !== '' && !isNaN(Number(x));

export function sortElements(arr) {
  return arr.every(isNum) ? [...arr].sort((a, b) => Number(a) - Number(b)) : [...arr];
}

export const formatSet = (arr) => (arr.length ? `{${arr.join(', ')}}` : '∅');

export function evalSet(ast, sets, universe) {
  return universe.filter((x) => {
    const env = {};
    for (const name of Object.keys(sets)) env[name] = sets[name].includes(x);
    return evaluate(ast, env);
  });
}

export const union = (a, b) => sortElements([...new Set([...a, ...b])]);
export const intersection = (a, b) => a.filter((x) => b.includes(x));
export const difference = (a, b) => a.filter((x) => !b.includes(x));

export function subsetCheck(a, b) {
  const checks = a.map((x) => ({ element: x, found: b.includes(x) }));
  const missing = checks.filter((c) => !c.found).map((c) => c.element);
  const isSubset = missing.length === 0;
  const equal = isSubset && a.length === b.length;
  return { checks, missing, isSubset, equal, proper: isSubset && !equal };
}

export function powerSet(a) {
  const out = [];
  for (let mask = 0; mask < 1 << a.length; mask++) out.push(a.filter((_, i) => (mask >> i) & 1));
  return out.sort((x, y) => x.length - y.length);
}

export function cartesian(a, b) {
  return a.flatMap((x) => b.map((y) => [x, y]));
}

const need = (cond, msg) => { if (!cond) throw new SetError(msg); };

// Two-set survey problem. Region keys are Venn bitmasks: 1 = A only, 2 = B only, 3 = both, 0 = neither.
export function survey2({ a, b, both, total }, names = ['A', 'B']) {
  const [A, B] = names;
  need(both <= a && both <= b, `The overlap (${both}) can't be bigger than either group — everyone in both is also counted in ${A} and in ${B}.`);
  const onlyA = a - both, onlyB = b - both, either = onlyA + onlyB + both;
  const steps = [
    { region: 3, value: both, title: 'Start in the middle', text: `${both} are in both ${A} and ${B}. Always fill the overlap first.` },
    { region: 1, value: onlyA, title: `Only ${A}`, text: `${A} has ${a} altogether, but ${both} of those are already in the overlap: ${a} − ${both} = ${onlyA}.` },
    { region: 2, value: onlyB, title: `Only ${B}`, text: `${B} has ${b} altogether, minus the ${both} in the overlap: ${b} − ${both} = ${onlyB}.` },
    { region: null, value: either, title: `In ${A} or ${B}`, text: `Add the three regions: ${onlyA} + ${both} + ${onlyB} = ${either}. The formula gives the same thing: |${A} ∪ ${B}| = |${A}| + |${B}| − |${A} ∩ ${B}| = ${a} + ${b} − ${both} = ${either}.` },
  ];
  const regions = { 1: onlyA, 2: onlyB, 3: both };
  if (total != null) {
    need(total >= either, `The total (${total}) is smaller than the ${either} people already placed in the circles. Check the numbers.`);
    regions[0] = total - either;
    steps.push({ region: 0, value: regions[0], title: 'Neither', text: `Everyone else is outside both circles: ${total} − ${either} = ${regions[0]}.` });
  }
  return { regions, either, steps };
}

// Three-set survey problem. Bits: 1 = A, 2 = B, 4 = C.
export function survey3({ a, b, c, ab, ac, bc, abc, total }, names = ['A', 'B', 'C']) {
  const [A, B, C] = names;
  need(abc <= ab && abc <= ac && abc <= bc, `The number in all three (${abc}) can't be bigger than any of the two-way overlaps.`);
  const abOnly = ab - abc, acOnly = ac - abc, bcOnly = bc - abc;
  const aOnly = a - abOnly - acOnly - abc, bOnly = b - abOnly - bcOnly - abc, cOnly = c - acOnly - bcOnly - abc;
  need(aOnly >= 0, `${A} (${a}) is too small to hold its overlaps (${abOnly} + ${acOnly} + ${abc}). Check the numbers.`);
  need(bOnly >= 0, `${B} (${b}) is too small to hold its overlaps (${abOnly} + ${bcOnly} + ${abc}). Check the numbers.`);
  need(cOnly >= 0, `${C} (${c}) is too small to hold its overlaps (${acOnly} + ${bcOnly} + ${abc}). Check the numbers.`);
  const either = aOnly + bOnly + cOnly + abOnly + acOnly + bcOnly + abc;
  const steps = [
    { region: 7, value: abc, title: 'Start in the very middle', text: `${abc} are in all three sets. Fill the centre first, then work outwards.` },
    { region: 3, value: abOnly, title: `${A} and ${B} only`, text: `${ab} are in both ${A} and ${B}, but ${abc} of them are already in the centre: ${ab} − ${abc} = ${abOnly}.` },
    { region: 5, value: acOnly, title: `${A} and ${C} only`, text: `${ac} − ${abc} = ${acOnly}.` },
    { region: 6, value: bcOnly, title: `${B} and ${C} only`, text: `${bc} − ${abc} = ${bcOnly}.` },
    { region: 1, value: aOnly, title: `Only ${A}`, text: `${A} has ${a} in total. Subtract the three pieces of ${A} already filled in: ${a} − ${abOnly} − ${acOnly} − ${abc} = ${aOnly}.` },
    { region: 2, value: bOnly, title: `Only ${B}`, text: `${b} − ${abOnly} − ${bcOnly} − ${abc} = ${bOnly}.` },
    { region: 4, value: cOnly, title: `Only ${C}`, text: `${c} − ${acOnly} − ${bcOnly} − ${abc} = ${cOnly}.` },
    { region: null, value: either, title: 'In at least one set', text: `Add all seven regions: ${aOnly} + ${bOnly} + ${cOnly} + ${abOnly} + ${acOnly} + ${bcOnly} + ${abc} = ${either}. Inclusion–exclusion agrees: ${a} + ${b} + ${c} − ${ab} − ${ac} − ${bc} + ${abc} = ${a + b + c - ab - ac - bc + abc}.` },
  ];
  const regions = { 1: aOnly, 2: bOnly, 4: cOnly, 3: abOnly, 5: acOnly, 6: bcOnly, 7: abc };
  if (total != null) {
    need(total >= either, `The total (${total}) is smaller than the ${either} people already placed in the circles. Check the numbers.`);
    regions[0] = total - either;
    steps.push({ region: 0, value: regions[0], title: 'None of them', text: `Everyone else is outside all three circles: ${total} − ${either} = ${regions[0]}.` });
  }
  return { regions, either, steps };
}

export const isPrime = (n) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
