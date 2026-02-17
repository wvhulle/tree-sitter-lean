const attr = require('./grammar/attr.js')
const command = require('./grammar/command.js')
const do_ = require('./grammar/do.js')
const syntax = require('./grammar/syntax.js')
const tactic = require('./grammar/tactic.js')
const term = require('./grammar/term.js')

module.exports = grammar({
  name: 'lean',

  extras: $ => [
    $.comment,
    /\s/,
  ],

  externals: $ => [
    $._newline,
  ],

  conflicts: $ => [
    [$._binder_ident, $._term],
    [$._binder_ident, $.named_argument],
    [$._binder_ident, $.subtype],
    [$._binder_ident],
    [$._have_id_decl, $._expression],
    [$._have_id_lhs, $._term],
    [$._have_id_lhs],
    [$._let_id_lhs, $._term],
    [$._simple_binder],
    [$.assign, $._term],
    [$.identifier],
    [$.instance_binder, $._term],
    [$.instance_binder, $.list],
    [$.proj, $._expression],
    [$.proj, $._do_expression],
    [$._where_decls],
    [$.if_then_else],
    [$.let, $._do_let],
    [$._expression, $._do_expression],
  ],

  word: $ => $._identifier,

  rules: {
    // Start rule must be the first property and visible.
    // src/Lean/Parser/Module.lean
    module: $ => seq(
      optional($.prelude),
      repeat($.import),
      repeat($._command),
    ),

    _expression: $ => choice(
      $.apply,
      $.comparison,
      $.let,
      $.tactics,
      $.binary_expression,
      $.neg,
      $.quoted_tactic,
      $.fun,
      $._term,
      $.do,
      $.unless,
    ),

    ...command,
    ...attr,
    ...syntax,
    ...tactic,
    ...do_.rules,
    ...term.rules,
  }
})
