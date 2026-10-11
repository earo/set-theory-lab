import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, format, evaluate, variables, subexpressions, equivalent, assignments, ExprError } from '../js/core/expr.js';
import { parseSet, parseSetInfo, evalSet, subsetCheck, powerSet, cartesian, survey2, survey3, SetError } from '../js/core/sets.js';
import { simplify } from '../js/core/simplify.js';
import { regionsWhere, regionName } from '../js/core/venn.js';

const U = parseSet('1..10'), A = parseSet('1,2,3,4,5'), B = parseSet('4,5,6,7');
const ev = (src) => evalSet(parse(src), { A, B }, U).join(' ');

test('parses sets, ranges and duplicates', () => {
  assert.deepEqual(parseSet('{3, 1, 2}'), ['1', '2', '3']);
  assert.deepEqual(parseSet('b a c'), ['b', 'a', 'c']);
  assert.deepEqual(parseSet(''), []);
  assert.deepEqual(parseSet('∅'), []);
  assert.deepEqual(parseSetInfo('1, 2, 2, 3').duplicates, ['2']);
  assert.equal(parseSet('-2..2').length, 5);
  assert.throws(() => parseSet('5..1'), SetError);
});

test('set operations', () => {
  assert.equal(ev('A ∪ B'), '1 2 3 4 5 6 7');
  assert.equal(ev('A ∩ B'), '4 5');
  assert.equal(ev('A − B'), '1 2 3');
  assert.equal(ev('A Δ B'), '1 2 3 6 7');
  assert.equal(ev("A'"), '6 7 8 9 10');
  assert.equal(ev('(A ∪ B)′'), '8 9 10');
  assert.equal(ev('U'), U.join(' '));
  assert.equal(ev('∅'), '');
});

test('ASCII and word aliases parse to the same thing', () => {
  for (const [a, b] of [['A or B', 'A ∪ B'], ['A & B', 'A ∩ B'], ['not A', 'A′'], ['A + B', 'A ∪ B'], ['A - B', 'A − B'], ['A xor B', 'A Δ B'], ["(A | B)'", '(A ∪ B)′']]) {
    assert.equal(format(parse(a)), format(parse(b)));
  }
  assert.equal(format(parse('p -> q', 'bool'), 'bool'), 'p → q');
  assert.equal(format(parse('p v q', 'bool'), 'bool'), 'p ∨ q');
  assert.equal(format(parse('~p & q <-> r', 'bool'), 'bool'), '(¬p ∧ q) ↔ r');
});

test('precedence and formatting round-trip', () => {
  assert.equal(format(parse('A ∪ B ∩ C')), 'A ∪ (B ∩ C)');
  assert.equal(format(parse('A′′')), 'A′′');
  for (const src of ['(A ∪ B)′ ∩ C', 'A − (B − C)', '(A − B) − C', 'A ∩ B ∩ C', '(A Δ B) Δ C', 'A ∪ (B ∩ C′)′']) {
    const once = format(parse(src));
    assert.equal(format(parse(once)), once);
    assert.ok(equivalent(parse(src), parse(once)));
  }
});

test('friendly parse errors', () => {
  for (const bad of ['', 'A ∪', '(A ∪ B', 'A B', 'A ∪ ∩ B', 'A)', 'foo', 'A # B']) assert.throws(() => parse(bad), ExprError, bad);
});

test('variables, subexpressions, truth tables', () => {
  const ast = parse('¬(p ∧ q) ∨ r', 'bool');
  assert.deepEqual(variables(ast), ['p', 'q', 'r']);
  assert.deepEqual(subexpressions(ast).map((n) => format(n, 'bool')), ['p ∧ q', '¬(p ∧ q)', '¬(p ∧ q) ∨ r']);
  assert.equal(assignments(['p', 'q']).length, 4);
  assert.deepEqual(assignments(['p', 'q'])[0], { p: true, q: true });
  assert.equal(evaluate(parse('p → q', 'bool'), { p: true, q: false }), false);
  assert.equal(evaluate(parse('p ↔ q', 'bool'), { p: false, q: false }), true);
});

test("De Morgan's laws hold, and the common mistake does not", () => {
  assert.ok(equivalent(parse('(A ∪ B)′'), parse('A′ ∩ B′')));
  assert.ok(equivalent(parse('(A ∩ B)′'), parse('A′ ∪ B′')));
  assert.ok(!equivalent(parse('(A ∪ B)′'), parse('A′ ∪ B′')));
});

test('simplifier reaches the expected form', () => {
  const cases = {
    'A ∨ (A ∧ B)': 'A', '¬(¬A ∨ ¬B)': 'A ∧ B', '(A ∧ B) ∨ (A ∧ ¬B)': 'A', 'A ∨ (¬A ∧ B)': 'A ∨ B',
    '(A ∨ B) ∧ (A ∨ C)': 'A ∨ (B ∧ C)', 'A ∧ ¬A': '0', 'A ∨ ¬A': '1', 'A − (A − B)': 'A ∧ B', '(A ∧ 1) ∨ 0': 'A',
    'A → (B → A)': '1', '¬¬A': 'A', 'A ∧ (B ∨ C)': 'A ∧ (B ∨ C)', 'A ⊕ A': '0', '¬(A ∧ ¬B) ∧ A': 'B ∧ A',
  };
  for (const [src, want] of Object.entries(cases)) assert.equal(format(simplify(parse(src, 'bool')).result, 'bool'), want, src);
});

test('every simplifier step preserves meaning and names a law', () => {
  const exprs = ['(A ∨ B) ∧ (¬A ∨ C) ∧ (B ∨ C)', '¬(A ∧ (B ∨ ¬C)) ∨ (A ↔ B)', '(A ⊕ B) ⊕ C', '(A → B) ∧ (B → C) → (A → C)',
    '(A ∧ B ∧ C) ∨ (A ∧ B ∧ ¬C) ∨ (A ∧ ¬B)', '¬(A ∨ B) ∨ (¬A ∧ B)', 'A − (B ∪ C)', '(A ∧ B) ∨ (¬A ∧ ¬B) ∨ (A ∧ ¬B) ∨ (¬A ∧ B)'];
  for (const src of exprs) {
    const ast = parse(src, 'bool');
    const { steps, result } = simplify(ast);
    assert.ok(equivalent(ast, result), src);
    for (const st of steps) {
      assert.ok(st.law, src);
      assert.ok(equivalent(ast, st.after), `${src} → ${format(st.after, 'bool')}`);
      assert.ok(equivalent(ast, parse(format(st.after, 'bool'), 'bool')), 'printed form re-parses to the same meaning');
    }
    steps.forEach((st, i) => i && assert.equal(format(st.before, 'bool'), format(steps[i - 1].after, 'bool')));
  }
});

test('subsets, power sets, products', () => {
  assert.equal(subsetCheck(['1', '2'], ['1', '2', '3']).proper, true);
  assert.equal(subsetCheck(['1', '2'], ['2', '1']).equal, true);
  assert.deepEqual(subsetCheck(['1', '9'], ['1', '2']).missing, ['9']);
  assert.equal(subsetCheck([], ['1']).isSubset, true);
  assert.equal(powerSet(['a', 'b', 'c']).length, 8);
  assert.deepEqual(powerSet([]), [[]]);
  assert.deepEqual(cartesian(['1', '2'], ['x']), [['1', 'x'], ['2', 'x']]);
});

test('survey problems', () => {
  const two = survey2({ a: 18, b: 15, both: 8, total: 30 });
  assert.deepEqual(two.regions, { 0: 5, 1: 10, 2: 7, 3: 8 });
  assert.equal(two.either, 25);
  const three = survey3({ a: 25, b: 22, c: 18, ab: 10, ac: 7, bc: 6, abc: 3, total: 50 });
  assert.deepEqual(three.regions, { 0: 5, 1: 11, 2: 9, 3: 7, 4: 8, 5: 4, 6: 3, 7: 3 });
  assert.equal(three.either, 25 + 22 + 18 - 10 - 7 - 6 + 3);
  assert.equal(survey2({ a: 5, b: 5, both: 2, total: null }).regions[0], undefined);
  assert.throws(() => survey2({ a: 5, b: 5, both: 6, total: 20 }), SetError);
  assert.throws(() => survey2({ a: 5, b: 5, both: 2, total: 3 }), SetError);
  assert.throws(() => survey3({ a: 5, b: 22, c: 18, ab: 10, ac: 7, bc: 6, abc: 3, total: 50 }), SetError);
});

test('venn regions', () => {
  assert.deepEqual([...regionsWhere(2, (e) => e.A && e.B)], [3]);
  assert.deepEqual([...regionsWhere(2, (e) => !e.A)].sort(), [0, 2]);
  assert.equal(regionsWhere(3, () => true).size, 8);
  assert.equal(regionName(0, 2), 'outside all sets');
  assert.equal(regionName(1, 2), 'A only');
  assert.equal(regionName(3, 3), 'A and B only');
  assert.equal(regionName(7, 3), 'in all three');
});
