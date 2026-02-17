const PREC = require('./constants.js')

module.exports = {
  tactics: $ => prec.left(
    seq('by', sep1_($._tactic, seq(optional(';'), $._newline))),
  ),

  // Core tactics with arguments
  apply_tactic: $ => seq('apply', $._expression),
  rewrite: $ => seq(choice('rewrite', 'rw'), $._expression),
  term: $ => seq('exact', $._expression),
  intro: $ => prec.left(seq('intro', repeat($._expression))),

  // Tactics with optional arguments
  simp: $ => prec.right(seq('simp', optional(field('extra', $.list)))),
  simp_all: $ => prec.right(seq('simp_all', optional(field('extra', $.list)))),
  grind: $ => prec.right(seq('grind', optional(field('extra', $.list)))),
  norm_num: $ => prec.right(seq('norm_num', optional(field('extra', $.list)))),

  // Simple keyword tactics
  _keyword_tactic: $ => choice(
    alias('trivial', $.trivial),
    alias('rfl', $.rfl),
    alias('omega', $.omega),
    alias('ring', $.ring),
    alias('decide', $.decide),
    alias('native_decide', $.native_decide),
    alias('contradiction', $.contradiction),
    alias('exfalso', $.exfalso),
    alias('done', $.done),
    alias('admit', $.admit),
    alias('constructor', $.constructor_tactic),
    alias('left', $.left_tactic),
    alias('right', $.right_tactic),
    alias('assumption', $.assumption),
  ),

  // Tactic-specific have
  have_tactic: $ => prec.right(PREC.lead + 1, seq(
    'have',
    choice(
      seq(field('name', $.identifier), ':', field('type', $._expression), ':=', field('value', $._expression)),
      seq(':', field('type', $._expression), ':=', field('value', $._expression)),
      seq(field('name', $.identifier), ':=', field('value', $._expression)),
      seq(':=', field('value', $._expression)),
    ),
  )),

  // Tactic-specific let
  let_tactic: $ => prec.right(PREC.lead + 1, seq(
    'let',
    field('name', $.identifier),
    choice(
      seq(':', field('type', $._expression), ':=', field('value', $._expression)),
      seq(':=', field('value', $._expression)),
    ),
  )),

  // obtain tactic (Mathlib/Batteries)
  obtain: $ => prec.right(PREC.lead + 1, seq(
    'obtain',
    field('pattern', $._expression),
    optional(seq(':', field('type', $._expression))),
    ':=',
    field('value', $._expression),
  )),

  _user_tactic: $ => $._expression,

  _tactic: $ => choice(
    $.have_tactic,
    $.let_tactic,
    $.obtain,

    $.apply_tactic,
    $.rewrite,
    $.simp,
    $.simp_all,
    $.term,
    $.intro,

    $.grind,
    $.norm_num,

    $._keyword_tactic,

    $._user_tactic,
  ),
}
