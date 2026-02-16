const PREC = require('./constants.js')

// src/Lean/Parser/Do.lean
// Only the .rules property is spread into grammar.js.
module.exports = {
  rules: {
    _left_arrow: $ => choice('<-', '←'),
    do_return: $ => prec.left(PREC.lead,
      seq('return', optional(field('value', $._expression))),
    ),
    _do_element: $ => choice(
      $._expression,
      $.assign,
      $.for_in,
      $.let_bind,
      $.let_mut,
      $.do_return,
    ),
  },
}
