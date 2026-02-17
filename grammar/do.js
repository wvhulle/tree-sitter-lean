const PREC = require('./constants.js')

// src/Lean/Parser/Do.lean
// Only the .rules property is spread into grammar.js.
module.exports = {
  rules: {
    _left_arrow: $ => choice('<-', '←'),
    do_return: $ => prec.left(PREC.lead,
      seq('return', optional(field('value', $._expression))),
    ),
    // src/Lean/Parser/Do.lean: doLet
    // "let " >> optional "mut " >> letDecl
    // Unlike expression-level `let`, doLet does NOT consume a body.
    // Sequencing is handled by _do_seq / _do_element.
    // Aliased as $.let for backward-compatible AST node names.
    _do_let: $ => prec.dynamic(1, seq(
      'let',
      field('name', $.identifier),
      optional(field('parameters', $.parameters)),
      optional(seq(':', field('type', $._expression))),
      ':=',
      field('value', $._expression),
    )),
    _do_element: $ => choice(
      alias($._do_let, $.let),
      $.assign,
      $.for_in,
      $.let_bind,
      $.let_mut,
      $.do_return,
      $._do_expression,
    ),
  },
}
