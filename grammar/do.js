const PREC = require('./constants.js')
const {sep1, sep1_} = require('./util.js')

// src/Lean/Parser/Do.lean
// Only the .rules property is spread into grammar.js.
module.exports = {
  rules: {
    _left_arrow: $ => choice('<-', '←'),

    // Note: We use _expression directly instead of a separate _do_expression.
    // The key difference in do-blocks is that `let` without a body is allowed.
    // We handle this by giving _do_let higher precedence in _do_element.

    _do_seq: $ => prec.right(sep1_($._do_element, $._newline)),
    do: $ => prec.right(seq('do', $._do_seq)),

    // src/Lean/Parser/Do.lean: doFor
    // Supports optional bound variable (h : idx) and multiple iterables.
    for_in: $ => seq(
      'for',
      sep1(
        seq(
          optional(seq($.identifier, ':')),
          choice($.identifier, $.anonymous_constructor),
          'in',
          field('iterable', $._expression),
        ),
        ',',
      ),
      field('body', $.do),
    ),

    // src/Lean/Parser/Do.lean: doReassign (x := e without let keyword)
    assign: $ => seq(
      field('name', $.identifier),
      ':=',
      field('value', $._expression),
    ),

    // src/Lean/Parser/Do.lean: doReassignArrow (x ← e without let keyword)
    reassign_arrow: $ => seq(
      field('name', $.identifier),
      $._left_arrow,
      field('value', $._expression),
    ),

    let_mut: $ => seq(
      'let', 'mut',
      $.parameters,
      choice($._left_arrow, ':='),
      field('value', $._expression),
    ),

    let_bind: $ => seq(
      'let',
      field('name', $.identifier),
      $._left_arrow,
      field('value', $._expression),
    ),

    unless: $ => seq('unless', $._expression, $.do),

    do_return: $ => prec.left(PREC.lead,
      seq('return', optional(field('value', $._expression))),
    ),

    // src/Lean/Parser/Do.lean: doLet
    // Unlike expression-level `let`, doLet does NOT consume a body.
    // Aliased as $.let for backward-compatible AST node names.
    // Using prec.left with lower precedence than subarray (PREC.max=1024) so that
    // `let x := arr[0]` parses the subarray as part of the expression, not as a new element.
    _do_let: $ => prec.left(PREC.lead, seq(
      'let',
      field('name', $.identifier),
      optional(field('parameters', $.parameters)),
      optional(seq(':', field('type', $._expression))),
      ':=',
      field('value', $._expression),
    )),

    // Do-block elements. Order matters for precedence when using choice().
    // _do_let has high precedence to be preferred over expression-level let.
    _do_element: $ => choice(
      alias($._do_let, $.let),
      $.assign,
      $.reassign_arrow,
      $.for_in,
      $.let_bind,
      $.let_mut,
      $.do_return,
      $._expression,  // Use _expression directly instead of _do_expression
    ),
  },
}
