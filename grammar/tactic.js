const {PREC} = require('./basic.js')

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

  // Tactic-specific have - high precedence to prefer over expression-level have
  have_tactic: $ => prec.right(PREC.lead + 1, seq(
    'have',
    choice(
      // have name : type := value
      seq(
        field('name', $.identifier),
        ':',
        field('type', $._expression),
        ':=',
        field('value', $._expression),
      ),
      // have : type := value  
      seq(
        ':',
        field('type', $._expression),
        ':=',
        field('value', $._expression),
      ),
      // have name := value (no type annotation)
      seq(
        field('name', $.identifier),
        ':=',
        field('value', $._expression),
      ),
    ),
  )),

  // Tactic-specific let - high precedence
  let_tactic: $ => prec.right(PREC.lead + 1, seq(
    'let',
    field('name', $.identifier),
    choice(
      seq(':', field('type', $._expression), ':=', field('value', $._expression)),
      seq(':=', field('value', $._expression)),
    ),
  )),

  // Fallback for user-defined tactics
  _user_tactic: $ => $._expression,

  _tactic: $ => choice(
    // Tactic-specific binders (must come before _user_tactic fallback)
    $.have_tactic,
    $.let_tactic,

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

    // Fallback for user-defined tactics
    $._user_tactic,
  ),
}
