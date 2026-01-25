module.exports = {
  tactics: $ => prec.left(
    seq('by', sep1_($._tactic, seq(optional(';'), $._newline))),
  ),

  // Core tactics
  apply_tactic: $ => seq('apply', $._expression),
  rewrite: $ => seq(choice('rewrite', 'rw'), $._expression),
  term: $ => seq('exact', $._expression),
  simp: $ => prec.right(seq(
    'simp',
    optional(field('extra', $.list)),
  )),
  simp_all: $ => prec.right(seq(
    'simp_all',
    optional(field('extra', $.list)),
  )),
  trivial: $ => 'trivial',
  intro: $ => prec.left(seq('intro', repeat($._expression))),
  rfl: $ => 'rfl',

  // Arithmetic/decision tactics
  grind: $ => prec.right(seq('grind', optional(field('extra', $.list)))),
  omega: $ => 'omega',
  ring: $ => 'ring',
  norm_num: $ => prec.right(seq('norm_num', optional(field('extra', $.list)))),
  decide: $ => 'decide',
  native_decide: $ => 'native_decide',

  // Logic tactics
  contradiction: $ => 'contradiction',
  exfalso: $ => 'exfalso',

  // Control tactics
  done: $ => 'done',
  admit: $ => 'admit',

  // Proof structure tactics (simple keywords only)
  constructor_tactic: $ => 'constructor',
  left_tactic: $ => 'left',
  right_tactic: $ => 'right',
  assumption: $ => 'assumption',

  // Fallback for user-defined tactics and complex forms (have, let, etc.)
  _user_tactic: $ => $._expression,

  _tactic: $ => choice(
    // Core
    $.apply_tactic,
    $.rewrite,
    $.simp,
    $.simp_all,
    $.term,
    $.trivial,
    $.intro,
    $.rfl,

    // Arithmetic/decision
    $.grind,
    $.omega,
    $.ring,
    $.norm_num,
    $.decide,
    $.native_decide,

    // Logic
    $.contradiction,
    $.exfalso,

    // Control
    $.done,
    $.admit,

    // Proof structure
    $.constructor_tactic,
    $.left_tactic,
    $.right_tactic,
    $.assumption,

    // Fallback (handles have, let, suffices, sorry, and user-defined tactics)
    $._user_tactic,
  ),
}
