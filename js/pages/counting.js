import { h, pageHeader, card, textInput, numInput, field, stepPlayer, errorBox, note, clear, tabs, chips } from '../ui.js';
import { survey2, survey3 } from '../core/sets.js';
import { renderVenn } from '../core/venn.js';

const short = (s) => (s.length > 10 ? s.slice(0, 9) + '…' : s);

function readNumber(input, label, optional = false) {
  const raw = input.value.trim();
  if (raw === '') {
    if (optional) return null;
    throw new Error(`Fill in a number for "${label}".`);
  }
  const v = Number(raw);
  if (!Number.isInteger(v) || v < 0) throw new Error(`"${label}" should be a whole number, 0 or more.`);
  return v;
}

function solver(n) {
  return (panel) => {
    const defaults = n === 2
      ? { names: ['Soccer', 'Basketball'], total: 30, a: 18, b: 15, ab: 8 }
      : { names: ['Maths', 'Science', 'Art'], total: 50, a: 25, b: 22, c: 18, ab: 10, ac: 7, bc: 6, abc: 3 };
    const names = defaults.names.map((x) => textInput(x, { maxlength: 20 }));
    const f = {};
    for (const k of ['total', 'a', 'b', 'c', 'ab', 'ac', 'bc', 'abc']) if (k in defaults) f[k] = numInput(defaults[k]);
    const out = h('div', {}), story = h('p', { class: 'story' });
    const nm = () => names.map((x, i) => x.value.trim() || 'ABC'[i]);

    const run = () => {
      clear(out);
      const N = nm();
      try {
        const v = {};
        const labels = { total: 'Total', a: N[0], b: N[1], c: N[2], ab: `${N[0]} and ${N[1]}`, ac: `${N[0]} and ${N[2]}`, bc: `${N[1]} and ${N[2]}`, abc: 'All three' };
        for (const k of Object.keys(f)) v[k] = readNumber(f[k], labels[k], k === 'total');
        story.textContent = n === 2
          ? `${v.total != null ? `Out of ${v.total} people, ` : ''}${v.a} like ${N[0]}, ${v.b} like ${N[1]} and ${v.ab} like both. How many are in each part of the diagram?`
          : `${v.total != null ? `Out of ${v.total} people, ` : ''}${v.a} like ${N[0]}, ${v.b} like ${N[1]}, ${v.c} like ${N[2]}; ${v.ab} like ${N[0]} and ${N[1]}, ${v.ac} like ${N[0]} and ${N[2]}, ${v.bc} like ${N[1]} and ${N[2]}; ${v.abc} like all three.`;
        const sol = n === 2 ? survey2({ a: v.a, b: v.b, both: v.ab, total: v.total }, N) : survey3(v, N);
        const diagram = h('div', { class: 'venn-box' });
        const show = (i, all) => {
          const counts = {};
          sol.steps.forEach((st, k) => { if ((all || k <= i) && st.region != null) counts[st.region] = st.value; });
          const cur = sol.steps[i].region;
          clear(diagram).append(renderVenn({ n, labels: N.map(short), counts, focus: cur, shaded: cur != null ? new Set([cur]) : new Set(), caption: 'Survey diagram' }));
        };
        const R = sol.regions;
        const exactlyOne = n === 2 ? R[1] + R[2] : R[1] + R[2] + R[4];
        const facts = [
          [`In at least one (${N.join(' ∪ ')})`, sol.either],
          ['In exactly one', exactlyOne],
          [n === 2 ? 'In both' : 'In all three', n === 2 ? R[3] : R[7]],
          ...(n === 3 ? [['In exactly two', R[3] + R[5] + R[6]]] : []),
          ...(R[0] != null ? [['In none', R[0]]] : []),
        ];
        out.append(
          h('div', { class: 'split' },
            card('Fill in the diagram', diagram, h('p', { class: 'muted small' }, 'The shaded region is the one being filled in on the current step.')),
            card('Step by step', stepPlayer(sol.steps.map((st) => ({ title: `${st.title}: ${st.value}`, body: st.text })), show))),
          card('Answers to the usual questions',
            h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('tbody', {}, facts.map(([k, val]) => h('tr', {}, h('th', {}, k), h('td', { class: 'math big' }, String(val))))))),
            R[0] == null ? h('p', { class: 'muted small' }, 'Enter a total to also find how many are in none of the sets.') : null));
      } catch (e) { out.append(errorBox(e.message)); }
    };

    [...names, ...Object.values(f)].forEach((i) => i.addEventListener('input', run));
    const N0 = defaults.names;
    const presets = n === 2
      ? [{ label: 'Sports', names: N0, v: defaults }, { label: 'Pets', names: ['Cats', 'Dogs'], v: { total: 40, a: 22, b: 17, ab: 5 } }, { label: 'No total given', names: ['Tea', 'Coffee'], v: { total: '', a: 12, b: 20, ab: 7 } }]
      : [{ label: 'Subjects', names: N0, v: defaults }, { label: 'Clubs', names: ['Chess', 'Drama', 'Band'], v: { total: 100, a: 40, b: 35, c: 30, ab: 12, ac: 10, bc: 8, abc: 4 } }];
    panel.append(
      card('The problem',
        chips(presets, (p) => { p.names.forEach((x, i) => { names[i].value = x; }); for (const k of Object.keys(f)) f[k].value = p.v[k]; run(); }),
        story,
        h('div', { class: 'fields' }, names.map((x, i) => field(`Name of set ${'ABC'[i]}`, x))),
        h('div', { class: 'fields narrow' },
          field('Total surveyed', f.total, 'Optional'), field('In ' + 'A', f.a), field('In B', f.b), n === 3 ? field('In C', f.c) : null,
          field('In A and B', f.ab), n === 3 ? [field('In A and C', f.ac), field('In B and C', f.bc), field('In all three', f.abc)] : null)),
      out);
    run();
  };
}

export default {
  id: 'counting',
  title: 'Counting problems',
  render(root) {
    root.append(
      pageHeader('Counting with Venn diagrams', 'Survey questions like "18 play soccer, 15 play basketball, 8 play both — how many play only soccer?" are easy once you know where to start: in the middle.'),
      note('tip', h('strong', {}, 'Why not just add? '), 'If you add |A| + |B|, everyone in the overlap gets counted twice. Subtract the overlap once to fix it. This is the ', h('strong', {}, 'inclusion–exclusion principle'), ': ',
        h('span', { class: 'math' }, '|A ∪ B| = |A| + |B| − |A ∩ B|')),
      tabs([{ label: 'Two sets', render: solver(2) }, { label: 'Three sets', render: solver(3) }]));
  },
};
