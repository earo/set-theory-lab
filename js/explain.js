import { format, parse, usesLogicOnlyOps, variables, ExprError, OP_NAMES } from './core/expr.js';

const f = (n) => format(n, 'set');

// How to work out one operation on lists of elements.
export function explainElements(node) {
  if (node.type === 'not') return `List everything in U that is not in ${f(node.arg)}.`;
  const L = f(node.left), R = f(node.right);
  switch (node.type) {
    case 'or': return `Keep every element that is in ${L} or in ${R} (or both). Write each one only once.`;
    case 'and': return `Keep only the elements that appear in both ${L} and ${R}.`;
    case 'diff': return `Start with ${L} and cross out anything that is also in ${R}.`;
    case 'xor': return `Keep the elements that are in exactly one of ${L} and ${R} — leave out any that are in both.`;
  }
}

// How to shade one operation on a Venn diagram.
export function explainShading(node) {
  if (node.type === 'not') return `Flip the shading of ${f(node.arg)}: everything that was shaded becomes clear and everything clear becomes shaded.`;
  const L = f(node.left), R = f(node.right);
  switch (node.type) {
    case 'or': return `Shade everything that is in ${L} or in ${R}. Put the two shadings on top of each other and keep it all.`;
    case 'and': return `Shade only where ${L} and ${R} overlap — the part they have in common.`;
    case 'diff': return `Start with ${L} shaded, then rub out any part that is also in ${R}.`;
    case 'xor': return `Shade what is in ${L} or ${R}, then rub out the part where they overlap.`;
  }
}

export const opTitle = (node) => `${OP_NAMES.set[node.type]}: ${f(node)}`;

// Parse a set expression and make sure it only uses the sets that exist on this page.
export function parseSetExpr(text, allowed) {
  const ast = parse(text, 'set');
  if (usesLogicOnlyOps(ast)) throw new ExprError('→ and ↔ are logic operators. Try them on the Boolean algebra page — here, use ∪, ∩, ′, − and Δ.');
  const bad = variables(ast).filter((v) => !allowed.includes(v));
  if (bad.length) throw new ExprError(`This page only knows the sets ${allowed.join(', ')}, but the expression uses ${bad.join(', ')}.`);
  return ast;
}
