const { PREC } = require('./basic.js')

// Tactic grammar aligned with official Lean 4 parser
// Reference: src/Init/Tactics.lean, src/Lean/Parser/Term.lean

module.exports = {
  tactics: $ => prec.left(
    seq('by', sep1_($._tactic, seq(optional(';'), $._newline))),
  ),

  // ============================================================
  // Core tactics
  // ============================================================
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

  // ============================================================
  // Arithmetic/decision tactics
  // ============================================================
  grind: $ => prec.right(seq('grind', optional(field('extra', $.list)))),
  omega: $ => 'omega',
  ring: $ => 'ring',
  norm_num: $ => prec.right(seq('norm_num', optional(field('extra', $.list)))),
  decide: $ => 'decide',
  native_decide: $ => 'native_decide',

  // ============================================================
  // Logic tactics
  // ============================================================
  contradiction: $ => 'contradiction',
  exfalso: $ => 'exfalso',

  // ============================================================
  // Control tactics
  // ============================================================
  done: $ => 'done',
  admit: $ => 'admit',

  // ============================================================
  // Proof structure tactics (simple keywords only)
  // ============================================================
  constructor_tactic: $ => 'constructor',
  left_tactic: $ => 'left',
  right_tactic: $ => 'right',
  assumption: $ => 'assumption',

  // ============================================================
  // have tactic - aligned with official Lean 4 grammar
  // Official: syntax "have" letConfig letDecl : tactic
  // letDecl = letPatDecl | letIdDecl | letEqnsDecl
  // letIdDecl = letIdLhs ":=" termParser
  // letIdLhs = letId >> many letIdBinder >> optType
  // 
  // Simplified: We don't support binders in have/let tactics to avoid
  // conflicts. Use full function definitions for curried functions.
  //
  // High precedence (max) to prefer tactic-level have over term-level have
  // ============================================================
  have_tactic: $ => prec(PREC.max, seq(
    'have',
    $._tactic_let_decl,
  )),

  // ============================================================
  // let tactic - aligned with official Lean 4 grammar
  // Official: macro "let" c:letConfig d:letDecl : tactic
  // ============================================================
  let_tactic: $ => prec(PREC.max, seq(
    'let',
    $._tactic_let_decl,
  )),

  // Shared let declaration for have/let tactics
  // Supports:
  // - letIdDecl: name : type := value OR name := value (no binders for simplicity)
  // - letPatDecl: pattern := value
  // - anonymous: := value (uses 'this' implicitly)
  // - anonymous with type: : type := value
  _tactic_let_decl: $ => choice(
    // letIdDecl: name (simplified, no binders)
    $._tactic_let_id_decl,
    // letPatDecl: pattern := value (for destructuring)
    $._tactic_let_pat_decl,
    // Anonymous with type: : type := value
    seq(':', field('type', $._expression), ':=', field('value', $._expression)),
    // Anonymous without type: := value
    seq(':=', field('value', $._expression)),
  ),

  // letIdDecl = name optType ":=" termParser (simplified, no binders)
  _tactic_let_id_decl: $ => seq(
    field('name', $.identifier),
    optional(seq(':', field('type', $._expression))),
    ':=',
    field('value', $._expression),
  ),

  // letPatDecl = pattern optType ":=" termParser
  // Pattern is typically an anonymous constructor ⟨a, b, c⟩
  _tactic_let_pat_decl: $ => seq(
    field('pattern', $.anonymous_constructor),
    optional(seq(':', field('type', $._expression))),
    ':=',
    field('value', $._expression),
  ),

  // ============================================================
  // obtain tactic (Mathlib/Batteries)
  // Not in core Lean 4, but common in the ecosystem
  // obtain ⟨pattern⟩ := expr
  // ============================================================
  obtain: $ => prec.right(PREC.lead + 1, seq(
    'obtain',
    field('pattern', $._expression),
    optional(seq(':', field('type', $._expression))),
    ':=',
    field('value', $._expression),
  )),

  // ============================================================
  // suffices tactic - aligned with official Lean 4 grammar
  // Official: macro "suffices " d:sufficesDecl : tactic
  // sufficesDecl = (atomic (group (binderIdent >> " : ")) <|> hygieneInfo) >> termParser >> showRhs
  // showRhs = fromTerm <|> byTactic'
  // ============================================================
  suffices: $ => prec.right(PREC.lead + 1, seq(
    'suffices',
    optional(seq(field('name', $.identifier), ':')),
    field('type', $._expression),
    optional(choice(
      seq('by', field('proof', $._tactic)),
      seq('from', field('proof', $._expression)),
    )),
  )),

  // ============================================================
  // Fallback for user-defined tactics
  // ============================================================
  _user_tactic: $ => $._expression,

  _tactic: $ => choice(
    // Tactic-specific binders (must come before _user_tactic fallback)
    $.have_tactic,
    $.let_tactic,
    $.obtain,
    $.suffices,

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
