const attr = require('./grammar/attr.js')
const command = require('./grammar/command.js')
const PREC = require('./grammar/constants.js')
const do_ = require('./grammar/do.js')
const syntax = require('./grammar/syntax.js')
const tactic = require('./grammar/tactic.js')
const term = require('./grammar/term.js')
const {sep1, sep1_} = require('./grammar/util.js')

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
    [$.let, $._do_let],
    [$._expression, $._do_expression],
  ],

  word: $ => $._identifier,

  rules: {
    // src/Lean/Parser/Module.lean
    module: $ => seq(
      optional($.prelude),
      repeat($.import),
      repeat($._command),
    ),
    prelude: $ => 'prelude',
    import: $ => seq('import', field('module', $.identifier)),

    parameters: $ => seq(
      repeat1(
        choice(
          field('name', $.identifier),
          $.hole,
          $._bracketed_binder,
          $.anonymous_constructor,
        )
      ),
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

    // src/Lean/Parser/Term.lean: «let»
    // "let" >> letConfig >> letDecl >> optSemicolon termParser
    let: $ => prec.right(seq(
      'let',
      field('name', $.identifier),
      optional(field('parameters', $.parameters)),
      optional(seq(':', field('type', $._expression))),
      ':=',
      field('value', $._expression),
      choice($._newline, ';'),
      field('body', $._expression),
    )),

    // Do notation (simplified top-level; full do rules in do.js)
    _do_seq: $ => prec.right(sep1_($._do_element, $._newline)),
    do: $ => prec.right(seq('do', $._do_seq)),

    for_in: $ => seq(
      'for',
      choice($.identifier, $.anonymous_constructor),
      'in',
      field('iterable', $._expression),
      field('body', $.do),
    ),

    assign: $ => seq(
      field('name', $.identifier),
      ':=',
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

    fun: $ => prec.right(seq(
      choice('fun', 'λ'),
      choice(
        seq(
          $.parameters,
          '=>',
          $._expression,
        ),
        repeat(seq(
          '|',
          field('lhs', sep1($._expression, ',')),
          '=>',
          $._expression,
        )),
      ),
    )),

    apply: $ => choice($._apply, $._dollar),

    _apply: $ => prec(PREC.apply, seq(
      field('name', term.term.forbid($, 'match')),
      field('arguments', repeat1($._argument)),
    )),

    _dollar: $ => prec.right(PREC.dollar, seq(
      field('name', $._expression),
      '$',
      field('argument', $._expression),
    )),

    neg: $ => prec(PREC.unary, seq('-', $._expression)),

    binary_expression: $ => choice(
      prec.right(PREC.power, seq($._expression, '^', $._expression)),

      prec.left(PREC.times, seq($._expression, '*', $._expression)),
      prec.left(PREC.times, seq($._expression, '/', $._expression)),
      prec.left(PREC.times, seq($._expression, '%', $._expression)),

      prec.left(PREC.plus, seq($._expression, '+', $._expression)),
      prec.left(PREC.plus, seq($._expression, '-', $._expression)),
      prec.left(PREC.plus, seq($._expression, '++', $._expression)),
      prec.left(PREC.plus, seq($._expression, '::', $._expression)),
      prec.right(PREC.plus, seq($._expression, '∘', $._expression)),

      prec.left(PREC.eqeq, seq($._expression, '==', $._expression)),

      prec.left(PREC.and, seq($._expression, '&&', $._expression)),
      prec.left(PREC.or, seq($._expression, '||', $._expression)),

      prec.left(PREC.opop, seq($._expression, '∧', $._expression)),
      prec.left(PREC.opop, seq($._expression, '∨', $._expression)),
      prec.left(PREC.opop, seq($._expression, '/\\', $._expression)),
      prec.left(PREC.opop, seq($._expression, '\\/', $._expression)),
      prec.left(PREC.opop, seq($._expression, '↔', $._expression)),

      prec.left(PREC.opop, seq($._expression, '|>', $._expression)),
      prec.left(PREC.opop, seq($._expression, '|>.', $._expression)),
      prec.right(PREC.dollar, seq($._expression, '<|', $._expression)),
      prec.left(PREC.opop, seq($._expression, '<|>', $._expression)),
      prec.left(PREC.opop, seq($._expression, '>>', $._expression)),
      prec.left(PREC.opop, seq($._expression, '>>=', $._expression)),
      prec.left(PREC.opop, seq($._expression, '<*>', $._expression)),
      prec.left(PREC.opop, seq($._expression, '<*', $._expression)),
      prec.left(PREC.opop, seq($._expression, '*>', $._expression)),
      prec.left(PREC.opop, seq($._expression, '<$>', $._expression)),

      prec.left(PREC.equal, seq($._expression, '=', $._expression)),
      prec.left(PREC.equal, seq($._expression, '≠', $._expression)),
    ),

    comparison: $ => prec.left(PREC.compare, seq(
      $._expression,
      choice('<', '>', '≤', '≥', '<=', '>=', '∣'),
      $._expression,
    )),

    comment: $ => token(choice(
      seq('--', /.*/),
      seq(
        '/-',
        repeat(choice(
          /[^-]/,
          /-[^/]/
        )),
        '-/',
      ),
    )),

    _identifier: $ => /[_a-zA-ZͰ-ϿĀ-ſ\U0001D400-\U0001D7FF][_`'`a-zA-Z0-9Ͱ-ϿĀ-ſ∇!?\u2070-\u209F\U0001D400-\U0001D7FF]*/,
    _escaped_identifier: $ => /«[^»]*»/,

    ...attr,
    ...command,
    ...syntax,
    ...tactic,
    ...do_.rules,
    ...term.rules,
  }
})
