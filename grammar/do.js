const PREC = require('./constants.js')
const {sep1, sep1_} = require('./util.js')

// src/Lean/Parser/Do.lean
// Only the .rules property is spread into grammar.js.
module.exports = {
  rules: {
    _left_arrow: $ => choice('<-', '←'),

    // src/Lean/Parser/Do.lean: doExpr uses notFollowedByRedefinedTermToken
    // to prevent expression-level `let` from matching in do blocks.
    // _do_expression mirrors _expression but without $.let.
    _do_expression: $ => choice(
      $.apply,
      $.comparison,
      $.tactics,
      $.binary_expression,
      $.neg,
      $.quoted_tactic,
      $.fun,
      $._term,
      $.do,
      $.unless,
    ),

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
      $.reassign_arrow,
      $.for_in,
      $.let_bind,
      $.let_mut,
      $.do_return,
      $._do_expression,
    ),
  },
}
