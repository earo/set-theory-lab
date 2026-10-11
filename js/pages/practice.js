import { h, pageHeader, card, textInput, note, clear } from '../ui.js';
import { parse, format, evaluate, inWords } from '../core/expr.js';
import { parseSet, formatSet, evalSet, subsetCheck, survey2 } from '../core/sets.js';
import { renderVenn, regionsWhere } from '../core/venn.js';
import { explainElements } from '../explain.js';

const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const sample = (arr, k) => shuffle(arr).slice(0, k);
const nums = (k, max = 9) => sample([...Array(max).keys()].map((i) => String(i + 1)), k).sort((a, b) => a - b);

const GENERATORS = {
  'Set operations': () => {
    const U = [...Array(10).keys()].map((i) => String(i + 1)), A = nums(rnd(3, 5)), B = nums(rnd(3, 5));
    const text = pick(['A ∪ B', 'A ∩ B', 'A − B', 'B − A', 'A Δ B', 'A′', '(A ∪ B)′']);
    const ast = parse(text), ans = evalSet(ast, { A, B }, U);
    return {
      prompt: h('div', {}, h('div', { class: 'math' }, `U = {1, 2, …, 10}`), h('div', { class: 'math' }, `A = ${formatSet(A)}`), h('div', { class: 'math' }, `B = ${formatSet(B)}`), h('p', {}, 'Find ', h('span', { class: 'math big' }, text), '.')),
      type: 'set', answer: ans, hint: explainElements(ast),
      solution: `${text} = ${formatSet(ans)}. That is every element that is ${inWords(ast)}.`,
    };
  },
  'Venn diagrams': () => {
    const pool = ['A ∪ B', 'A ∩ B', 'A − B', 'B − A', 'A Δ B', 'A′', 'B′', '(A ∪ B)′', '(A ∩ B)′', 'A′ ∪ B'];
    const choices = sample(pool, 4), answer = choices[0];
    const ast = parse(answer);
    return {
      prompt: h('div', {}, h('p', {}, 'Which expression matches the shaded region?'),
        h('div', { class: 'venn-box small-venn' }, renderVenn({ n: 2, shaded: regionsWhere(2, (env) => evaluate(ast, env)), caption: 'Mystery shading' }))),
      type: 'choice', choices: shuffle(choices), answer,
      hint: 'Pick a spot in the shaded part and ask: is it inside A? Inside B? Then test each option against that.',
      solution: `The shaded part is everything that is ${inWords(ast)} — that is ${answer}.`,
    };
  },
  "De Morgan's laws": () => pick([
    { q: '(A ∪ B)′', answer: 'A′ ∩ B′', wrong: ['A′ ∪ B′', 'A ∩ B', '(A ∩ B)′'] },
    { q: '(A ∩ B)′', answer: 'A′ ∪ B′', wrong: ['A′ ∩ B′', 'A ∪ B', '(A ∪ B)′'] },
    { q: 'A′ ∩ B′', answer: '(A ∪ B)′', wrong: ['(A ∩ B)′', 'A ∪ B', 'A′ ∪ B′'] },
    { q: '¬(p ∧ q)', answer: '¬p ∨ ¬q', wrong: ['¬p ∧ ¬q', 'p ∨ q', '¬(p ∨ q)'] },
    { q: '¬(p ∨ q)', answer: '¬p ∧ ¬q', wrong: ['¬p ∨ ¬q', 'p ∧ q', '¬(p ∧ q)'] },
  ].map((x) => ({
    prompt: h('p', {}, 'Which expression is always equal to ', h('span', { class: 'math big' }, x.q), '?'),
    type: 'choice', choices: shuffle([x.answer, ...x.wrong]), answer: x.answer,
    hint: 'Push the NOT onto each part, and flip the operation between them.',
    solution: `${x.q} = ${x.answer}. De Morgan: the complement goes onto each part and the operator flips (∪ ↔ ∩, or ∨ ↔ ∧).`,
  }))),
  'Subsets': () => {
    if (Math.random() < 0.4) {
      const n = rnd(2, 6);
      return {
        prompt: h('p', {}, `A set has ${n} elements. How many subsets does it have (including ∅ and the set itself)?`),
        type: 'number', answer: 2 ** n, hint: 'Each element is either in a subset or out of it: 2 choices per element.',
        solution: `2 choices for each of the ${n} elements: ${Array(n).fill(2).join(' × ')} = 2^${n} = ${2 ** n}.`,
      };
    }
    const B = nums(rnd(4, 6)), yes = Math.random() < 0.5;
    const A = yes ? sample(B, rnd(1, 3)).sort((a, b) => a - b) : nums(rnd(2, 3));
    const res = subsetCheck(A, B);
    return {
      prompt: h('p', {}, 'True or false? ', h('span', { class: 'math big' }, `${formatSet(A)} ⊆ ${formatSet(B)}`)),
      type: 'choice', choices: ['True', 'False'], answer: res.isSubset ? 'True' : 'False',
      hint: 'Check each element on the left: is it also on the right?',
      solution: res.isSubset ? 'True — every element on the left also appears on the right.' : `False — ${res.missing.join(', ')} ${res.missing.length === 1 ? 'is' : 'are'} on the left but not on the right.`,
    };
  },
  'Counting': () => {
    if (Math.random() < 0.3) {
      const m = rnd(2, 6), k = rnd(2, 5);
      return {
        prompt: h('p', {}, `Set A has ${m} elements and set B has ${k} elements. How many ordered pairs are in A × B?`),
        type: 'number', answer: m * k, hint: 'Every element of A is paired with every element of B.', solution: `|A × B| = |A| × |B| = ${m} × ${k} = ${m * k}.`,
      };
    }
    const both = rnd(2, 8), a = both + rnd(3, 10), b = both + rnd(3, 10), neither = rnd(1, 6), total = a + b - both + neither;
    const [X, Y] = pick([['soccer', 'tennis'], ['cats', 'dogs'], ['maths', 'art'], ['tea', 'coffee']]);
    const sol = survey2({ a, b, both, total });
    const ask = pick([
      { q: `like only ${X}`, v: sol.regions[1], s: `${a} − ${both} = ${sol.regions[1]}` },
      { q: `like ${X} or ${Y} (or both)`, v: sol.either, s: `${a} + ${b} − ${both} = ${sol.either}` },
      { q: 'like neither', v: sol.regions[0], s: `${total} − (${a} + ${b} − ${both}) = ${sol.regions[0]}` },
    ]);
    return {
      prompt: h('p', {}, `In a group of ${total} people, ${a} like ${X}, ${b} like ${Y}, and ${both} like both. How many ${ask.q}?`),
      type: 'number', answer: ask.v, hint: 'Sketch two overlapping circles and put the "both" number in the middle first.', solution: `${ask.s}.`,
    };
  },
  'Logic': () => {
    const text = pick(['p ∧ q', 'p ∨ q', '¬p ∨ q', 'p ⊕ q', 'p → q', '¬(p ∧ q)', '¬p ∧ ¬q', 'p ↔ q']);
    const env = { p: Math.random() < 0.5, q: Math.random() < 0.5 }, ast = parse(text, 'bool');
    const word = (v) => (v ? 'true' : 'false');
    return {
      prompt: h('p', {}, `If p is ${word(env.p)} and q is ${word(env.q)}, what is `, h('span', { class: 'math big' }, format(ast, 'bool')), '?'),
      type: 'choice', choices: ['True', 'False'], answer: evaluate(ast, env) ? 'True' : 'False',
      hint: '∧ needs both to be true. ∨ needs at least one. ⊕ needs exactly one. → is only false when true leads to false. ↔ is true when both sides match.',
      solution: `With p ${word(env.p)} and q ${word(env.q)}, ${format(ast, 'bool')} is ${word(evaluate(ast, env))}.`,
    };
  },
};

const STORE = 'settheory-practice';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export default {
  id: 'practice',
  title: 'Practice',
  render(root) {
    const topics = Object.keys(GENERATORS);
    let topic = 'All topics', score = { right: 0, tried: 0, streak: 0, best: 0, ...load() };
    const stage = h('div', {}), board = h('div', { class: 'scoreboard', 'aria-live': 'polite' });
    const topicButtons = ['All topics', ...topics].map((t) => h('button', { type: 'button', class: 'chip', onclick: () => { topic = t; next(); } }, t));

    const drawScore = () => clear(board).append(
      h('span', {}, h('strong', {}, `${score.right} / ${score.tried}`), ' correct'), h('span', {}, 'Streak: ', h('strong', {}, String(score.streak))), h('span', {}, 'Best streak: ', h('strong', {}, String(score.best))),
      h('button', { type: 'button', class: 'btn btn-small', onclick: () => { score = { right: 0, tried: 0, streak: 0, best: 0 }; save(score); drawScore(); } }, 'Reset score'));

    function next() {
      topicButtons.forEach((b) => b.classList.toggle('chip-on', b.textContent === topic));
      const name = topic === 'All topics' ? pick(topics) : topic;
      const q = GENERATORS[name]();
      const feedback = h('div', {}), hint = h('div', {});
      let done = false;

      const grade = (given) => {
        if (done) return;
        let ok;
        if (q.type === 'set') {
          let got;
          try { got = parseSet(given); } catch (e) { clear(feedback).append(note('error', e.message)); return; }
          ok = got.length === q.answer.length && got.every((x) => q.answer.includes(x));
        } else if (q.type === 'number') {
          if (String(given).trim() === '' || isNaN(Number(given))) { clear(feedback).append(note('error', 'Type a number first.')); return; }
          ok = Number(given) === q.answer;
        } else ok = given === q.answer;
        done = true;
        score.tried++;
        if (ok) { score.right++; score.streak++; score.best = Math.max(score.best, score.streak); } else score.streak = 0;
        save(score);
        drawScore();
        const nextBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: next }, 'Next question →');
        clear(feedback).append(note(ok ? 'ok' : 'error', h('strong', {}, ok ? 'Correct! ' : 'Not quite. '), q.solution), nextBtn);
        nextBtn.focus();
      };

      let answerUI;
      if (q.type === 'choice') {
        answerUI = h('div', { class: 'choices' }, q.choices.map((c) => h('button', {
          type: 'button', class: 'btn choice math', onclick: (e) => {
            if (done) return;
            grade(c);
            [...e.currentTarget.parentNode.children].forEach((b) => { b.disabled = true; b.classList.toggle('choice-right', b.textContent === q.answer); });
            if (c !== q.answer) e.currentTarget.classList.add('choice-wrong');
          },
        }, c)));
      } else {
        const input = textInput('', { placeholder: q.type === 'set' ? 'e.g. 1, 2, 3   (leave empty for ∅)' : 'Type a number', inputmode: q.type === 'number' ? 'numeric' : null, 'aria-label': 'Your answer' });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') grade(input.value); });
        answerUI = h('div', { class: 'answer-row' }, input, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => grade(input.value) }, 'Check'));
      }

      clear(stage).append(card(name, q.prompt, answerUI,
        h('div', { class: 'player-bar' },
          h('button', { type: 'button', class: 'btn', onclick: () => clear(hint).append(note('tip', h('strong', {}, 'Hint: '), q.hint)) }, 'Show a hint'),
          h('button', { type: 'button', class: 'btn', onclick: next }, 'Skip')),
        hint, feedback));
    }

    root.append(
      pageHeader('Practice', 'Fresh questions every time. Use a hint if you are stuck — and if you miss one, read the worked solution before moving on.'),
      board, h('div', { class: 'chips' }, topicButtons), stage);
    drawScore();
    next();
  },
};
