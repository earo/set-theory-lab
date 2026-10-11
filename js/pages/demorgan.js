import { h, pageHeader, card, textInput, field, stepPlayer, errorBox, note, clear } from '../ui.js';
import { parse, format, evaluate } from '../core/expr.js';
import { parseSet, formatSet, evalSet, union, difference } from '../core/sets.js';
import { renderVenn, regionsWhere, regionName } from '../core/venn.js';

const P = (x) => parse(x, 'set');
const LAWS = [
  {
    label: 'Law 1: (A ∪ B)′ = A′ ∩ B′', inner: 'A ∪ B', left: '(A ∪ B)′', right: 'A′ ∩ B′', logic: '¬(p ∨ q) ≡ ¬p ∧ ¬q',
    words: ['not (in A or in B)', 'not in A and not in B'],
    innerText: 'Shade everything in A or B — both whole circles.',
    joinText: 'A′ ∩ B′ means AND, so keep only the part that was shaded both times — outside A and also outside B.',
    story: '"I do not have a cat or a dog" means the same as "I do not have a cat, and I do not have a dog."',
  },
  {
    label: 'Law 2: (A ∩ B)′ = A′ ∪ B′', inner: 'A ∩ B', left: '(A ∩ B)′', right: 'A′ ∪ B′', logic: '¬(p ∧ q) ≡ ¬p ∨ ¬q',
    words: ['not (in A and in B)', 'not in A or not in B'],
    innerText: 'Shade only the overlap, where A and B meet.',
    joinText: 'A′ ∪ B′ means OR, so keep everything that was shaded either time — anything missing from at least one circle.',
    story: '"I am not both hungry and tired" means the same as "I am not hungry, or I am not tired (or neither)."',
  },
];

export default {
  id: 'demorgan',
  title: "De Morgan's laws",
  render(root) {
    let law = LAWS[0];
    const body = h('div', {});
    const buttons = LAWS.map((l) => h('button', { type: 'button', class: 'chip', onclick: () => { law = l; draw(); } }, l.label));
    const u = textInput('1..8'), a = textInput('1, 2, 3, 4'), b = textInput('3, 4, 5, 6');
    const own = h('div', {});

    function drawOwn() {
      clear(own);
      try {
        const A = parseSet(a.value), B = parseSet(b.value);
        let U = parseSet(u.value);
        if (!U.length) U = union(A, B);
        const stray = difference(union(A, B), U);
        if (stray.length) throw new Error(`${stray.join(', ')} must also be in U, because U has to contain everything.`);
        const val = (x) => formatSet(evalSet(P(x), { A, B }, U));
        const line = (x) => h('div', { class: 'math' }, `${x} = ${val(x)}`);
        own.append(h('div', { class: 'split' },
          h('div', {}, h('h4', {}, `Left side: ${law.left}`), line(law.inner), h('div', { class: 'math answer-line' }, `${law.left} = ${val(law.left)}`)),
          h('div', {}, h('h4', {}, `Right side: ${law.right}`), line('A′'), line('B′'), h('div', { class: 'math answer-line' }, `${law.right} = ${val(law.right)}`))),
        note('ok', 'Both sides give exactly the same set. Change the sets to anything you like — they will always match.'));
      } catch (e) { own.append(errorBox(e.message)); }
    }

    function draw() {
      buttons.forEach((bt, i) => bt.classList.toggle('chip-on', LAWS[i] === law));
      const reg = (x) => regionsWhere(2, (env) => evaluate(P(x), env));
      const L = h('div', { class: 'venn-box' }), R = h('div', { class: 'venn-box' });
      const lCap = h('p', { class: 'venn-caption' }), rCap = h('p', { class: 'venn-caption' });
      const verdict = h('div', {});
      const frames = [
        { l: law.inner, r: null }, { l: law.left, r: null }, { l: law.left, r: 'A′' }, { l: law.left, r: 'B′', tone: 'b' },
        { l: law.left, r: law.right }, { l: law.left, r: law.right, done: true },
      ];
      const steps = [
        { title: `Left side — start inside the brackets: ${law.inner}`, body: law.innerText },
        { title: `Left side — take the complement: ${law.left}`, body: 'The ′ outside the bracket flips everything: shaded becomes clear, clear becomes shaded.' },
        { title: 'Right side — shade A′', body: 'A′ is everything outside circle A.' },
        { title: 'Right side — shade B′', body: 'B′ is everything outside circle B.' },
        { title: `Right side — combine: ${law.right}`, body: law.joinText },
        { title: 'Compare the two pictures', body: 'They are shaded in exactly the same place, so the two expressions always describe the same set — whatever A and B are.' },
      ];
      const show = (i) => {
        const fr = frames[i];
        clear(L).append(renderVenn({ n: 2, shaded: reg(fr.l), caption: fr.l }));
        clear(R).append(renderVenn({ n: 2, shaded: fr.r ? reg(fr.r) : new Set(), tone: fr.tone || (fr.r === law.right ? 'a' : 'c'), caption: fr.r || 'empty' }));
        lCap.textContent = `Left: ${fr.l}`;
        rCap.textContent = fr.r ? `Right: ${fr.r}` : 'Right: (not started yet)';
        clear(verdict);
        if (fr.done) verdict.append(note('ok', h('strong', {}, 'Same shading. '), `${law.left} = ${law.right}`));
      };

      const cols = ['A', 'B', law.inner, law.left, 'A′', 'B′', law.right];
      const table = h('div', { class: 'table-wrap' }, h('table', { class: 'table center' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Region'), cols.map((cname, i) => h('th', { class: i === 3 || i === 6 ? 'col-final' : '' }, cname)))),
        h('tbody', {}, [3, 1, 2, 0].map((mask) => {
          const env = { A: !!(mask & 1), B: !!(mask & 2) };
          return h('tr', {}, h('th', {}, regionName(mask, 2)), cols.map((cname, i) => {
            const yes = evaluate(P(cname), env);
            return h('td', { class: (yes ? 'yes' : 'no') + (i === 3 || i === 6 ? ' col-final' : '') }, yes ? '✓ in' : '—');
          }));
        }))));

      clear(body).append(
        h('div', { class: 'answer' },
          h('div', { class: 'math big' }, `${law.left} = ${law.right}`),
          h('div', {}, '"', h('strong', {}, law.words[0]), '" is the same as "', h('strong', {}, law.words[1]), '"'),
          h('div', { class: 'muted' }, law.story)),
        card('See it happen',
          h('div', { class: 'split' }, h('div', {}, L, lCap), h('div', {}, R, rCap)),
          verdict,
          stepPlayer(steps, show)),
        card('Check every region',
          h('p', {}, 'Two circles make four regions. If the two highlighted columns match in all four rows, the law is proved.'),
          table),
        card('Try it with real sets',
          h('div', { class: 'fields' }, field('Universal set U', u), field('Set A', a), field('Set B', b)),
          own),
        card('The same law in logic',
          h('p', {}, 'Swap ∪ for OR (∨), ∩ for AND (∧) and ′ for NOT (¬) and you get the logic version:'),
          h('div', { class: 'math big' }, law.logic),
          h('p', {}, 'Check it with a truth table on the ', h('a', { href: '#/boolean' }, 'Boolean algebra page'), '.')));
      drawOwn();
    }

    [u, a, b].forEach((i) => i.addEventListener('input', drawOwn));
    root.append(
      pageHeader("De Morgan's laws", 'Two rules for what happens when a complement (NOT) sits outside a bracket. The short version: push the ′ onto each set, and flip ∪ to ∩ or ∩ to ∪.'),
      h('div', { class: 'chips' }, buttons),
      body,
      note('tip', h('strong', {}, 'Memory trick: '), '"Break the line, change the sign." Split the complement across both sets and swap the operation. A very common mistake is to forget the swap and write (A ∪ B)′ = A′ ∪ B′ — the picture shows why that is wrong.'));
    draw();
  },
};
