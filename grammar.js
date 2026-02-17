/**
 * @file Lean 4 grammar for tree-sitter
 * @license MIT
 * 
 * Based on best practices from tree-sitter-javascript and tree-sitter-rust
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Centralized precedence levels (higher = binds tighter)
// Based on Lean 4's actual precedence: https://leanprover.github.io/lean4/doc/operators.html
const PREC = {
  // Expression precedences
  arrow: 25,        // → (right assoc)
  or: 30,           // ||
  and: 35,          // &&
  compare: 40,      // == != < > <= >=
  cons: 50,         // ::
  add: 55,          // + - ++
  mul: 60,          // * / %
  product: 65,      // × (type product)
  unary: 70,        // ! ¬ -
  app: 80,          // function application
  proj: 90,         // .field
  atom: 100,        // literals, identifiers
};

// Helper functions
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function sep(rule, separator) {
  return optional(sep1(rule, separator));
}

function commaSep1(rule) {
  return sep1(rule, ',');
}

function commaSep(rule) {
  return sep(rule, ',');
}

module.exports = grammar({
  name: 'lean',

  extras: $ => [
    $.comment,
    /\s/,
  ],

  // External scanner for layout-sensitive constructs (indentation-based parsing)
  externals: $ => [
    $._layout_start,      // Start a layout block (after `do`, `where`, etc.)
    $._layout_semicolon,  // Virtual semicolon between elements at same indent
    $._layout_end,        // End of layout block (indent decreased)
  ],

  // Keyword extraction improves error detection and compile time
  word: $ => $.identifier,

  // Supertype nodes for better queries
  supertypes: $ => [
    $._expression,
    $._command,
    $._declaration,
  ],

  // Inline rules to reduce tree depth
  inline: $ => [
    $._atom,
    $._type_spec,
  ],

  conflicts: $ => [],

  rules: {
    // ============================================================
    // Module Structure
    // ============================================================
    
    module: $ => seq(
      optional($.prelude),
      repeat($.import),
      repeat($._command),
    ),

    prelude: _ => 'prelude',

    // Import: `import Lean.Data.Json`
    // Module path is parsed as identifier or projection chain
    import: $ => seq('import', field('module', $._expression)),

    // ============================================================
    // Commands
    // ============================================================

    _command: $ => choice(
      $._declaration,
      $.namespace,
      $.section,
      $.end,
      $.open,
      $.variable,
      $.universe,
      $.attribute,
      $.notation,
      $.hash_command,
      $.example,
    ),

    // Namespace: `namespace Foo` or `namespace Foo.Bar.Baz`
    namespace: $ => seq('namespace', field('name', $.name)),
    
    section: $ => seq('section', optional(field('name', $.identifier))),
    
    // End: `end` or `end Foo` or `end Foo.Bar.Baz`
    end: $ => seq('end', optional(field('name', $.name))),

    // Open: `open Foo.Bar` or `open Foo Bar Baz` or `open Foo hiding x` or `open Foo (x y)`
    open: $ => seq(
      'open',
      optional('scoped'),
      repeat1(field('namespace', $.name)),
      optional(choice(
        seq('hiding', repeat1(field('hiding', $.name))),
        seq('(', repeat1(field('only', $.name)), ')'),
        seq('in', $._expression),
      )),
    ),

    variable: $ => seq('variable', repeat1($._bracketed_binder)),

    universe: $ => seq('universe', repeat1($.identifier)),

    // `attribute [simp] Nat.add_zero`
    attribute: $ => seq(
      'attribute',
      '[', commaSep1($.identifier), ']',
      repeat1($._expression),
    ),

    // `notation:10000 n "!" => factorial n`
    notation: $ => seq(
      choice('notation', 'macro_rules', 'syntax', 'macro', 'elab',
             'prefix', 'infix', 'infixl', 'infixr', 'postfix'),
      optional(seq(':', $.number)),  // priority
      repeat(choice($._expression, '=>', ':=')),
    ),

    // `#check`, `#eval`, `#print`, etc.
    hash_command: $ => seq(
      field('command', $.hash_ident),
      repeat($._expression),
    ),

    hash_ident: _ => /#[a-zA-Z_]\w*/,

    // `example : 1 + 1 = 2 := by rfl`
    example: $ => seq(
      'example',
      optional(field('binders', $.binders)),
      optional($._type_spec),
      ':=',
      field('body', $._expression),
    ),

    // ============================================================
    // Declarations
    // ============================================================

    _declaration: $ => choice(
      $.definition,
      $.structure,
      $.inductive,
    ),

    // Unified definition rule for def, theorem, lemma, abbrev, instance
    // Supports both `:= body` and pattern-matching `| pat => body` syntax.
    definition: $ => seq(
      field('kind', choice('def', 'theorem', 'lemma', 'abbrev', 'instance')),
      field('name', $.name),
      optional(field('binders', $.binders)),
      optional($._type_spec),
      choice(
        seq(':=', $._layout_start, field('body', $._expression), optional($._layout_end)),
        repeat1($.match_arm),
      ),
    ),

    structure: $ => seq(
      choice('structure', 'class'),
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      optional(field('extends', seq('extends', commaSep1($._expression)))),
      optional($._type_spec),
      optional(seq(
        choice(':=', 'where'),
        $._layout_start,
        repeat(seq($.structure_field, optional($._layout_semicolon))),
        optional($._layout_end),
      )),
      optional(seq('deriving', commaSep1($.identifier))),
    ),

    // Structure fields are separated by layout semicolons (newlines at same indent)
    structure_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._expression),
      optional(seq(':=', field('default', $._expression))),
    ),

    inductive: $ => seq(
      'inductive',
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      optional($._type_spec),
      optional(choice(':=', 'where')),
      repeat($.constructor),
      optional(seq('deriving', commaSep1($.identifier))),
    ),

    constructor: $ => seq(
      '|',
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      optional($._type_spec),
    ),

    // ============================================================
    // Binders
    // ============================================================

    binders: $ => repeat1($._bracketed_binder),

    _bracketed_binder: $ => choice(
      $.explicit_binder,
      $.implicit_binder,
      $.instance_binder,
    ),

    explicit_binder: $ => seq(
      '(',
      repeat1(field('name', $.identifier)),
      $._type_spec,
      optional(seq(':=', field('default', $._expression))),
      ')',
    ),

    implicit_binder: $ => seq(
      '{',
      repeat1(field('name', $.identifier)),
      optional($._type_spec),
      '}',
    ),

    instance_binder: $ => seq(
      '[',
      optional(seq(field('name', $.identifier), ':')),
      field('type', $._expression),
      ']',
    ),

    _type_spec: $ => seq(':', $._expression),

    // ============================================================
    // Expressions
    // ============================================================

    _expression: $ => choice(
      $._atom,
      $.application,
      $.subscript,
      $.binary_expression,
      $.unary_expression,
      // postfix ! and ? are handled by subscript modifier and notation
      $.projection,
      $.arrow,
      $.fun,
      $.forall,
      $.exists,
      $.let,
      $.have,
      $.if,
      $.if_let,
      $.match,
      $.do,
      $.by,
    ),

    // Atoms: self-delimiting expressions that can appear as function arguments
    _atom: $ => choice(
      $.identifier,
      $.escaped_identifier,
      $.number,
      $.string,
      $.char,
      $.parenthesized,
      $.tuple,
      $.anonymous_constructor,
      $.structure_instance,
      $.array,
      $.list,
      $.range,
      $.hole,
      $.sorry,
      $._boolean,
    ),

    // Function application: `f x y z`
    // Uses prec.left to parse `f x y` as `(f x) y`
    application: $ => prec.left(PREC.app, seq(
      field('function', $._expression),
      field('argument', choice(
        $._atom,
        $.fun,
        $.if,
        $.if_let,
        $.match,
        $.do,
        $.by,
      )),
    )),

    // Array/list subscript: `arr[i]` or `arr[i]!` or `arr[i]?`
    subscript: $ => prec.left(PREC.proj, seq(
      field('object', $._expression),
      token.immediate('['),
      field('index', $._expression),
      ']',
      optional(field('modifier', choice('!', '?'))),
    )),

    // Qualified name: `foo` or `Foo.Bar.baz` - used for declarations and references
    name: $ => sep1($.identifier, token.immediate('.')),

    // Projection: `x.foo` or `x.1` or `x.«name»` or `.field` (leading dot)
    projection: $ => prec.left(PREC.proj, seq(
      optional(field('object', $._expression)),
      choice(
        token.immediate('.'),  // For `x.field` where x is an expression
        '.',                   // For `.field` (leading dot)
      ),
      field('field', choice($.identifier, $.escaped_identifier, $.number)),
    )),

    // Arrow type: `A → B`
    arrow: $ => prec.right(PREC.arrow, seq(
      field('domain', $._expression),
      choice('->', '→'),
      field('codomain', $._expression),
    )),

    // Binary operators with table-driven precedence
    binary_expression: $ => {
      const table = [
        [PREC.or, choice('||', '∨')],
        [PREC.and, choice('&&', '∧')],
        [PREC.compare, choice('==', '!=', '=', '<', '>', '<=', '>=', '≤', '≥', '≠',
                               '∣')],  // divisibility
        [PREC.cons, '::'],
        [PREC.add, choice('+', '-', '++', '∪', '∩')],
        [PREC.mul, choice('*', '/', '%', '∘')],
        [PREC.product, '×'],
        // Pipeline operators
        [PREC.arrow, choice('|>', '<|', '|>.', '$')],
      ];

      return choice(...table.map(([precedence, operator]) =>
        prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression),
        )),
      ));
    },

    // Prefix operators
    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('!', '¬', '-')),
      field('operand', $._expression),
    )),

    // Note: postfix `!` and `?` are handled by:
    // - subscript modifier: `arr[i]!`, `arr[i]?`
    // - notation system: `n !` (user-defined, parsed as application)

    // Lambda: `fun x => e` or `fun (x : T) => e` or `fun (a, b) => e`
    // Body gets layout context so `let` bindings work properly
    fun: $ => prec.right(seq(
      choice('fun', 'λ'),
      field('binders', repeat1(choice($._pattern, $._bracketed_binder))),
      '=>',
      $._layout_start,
      field('body', $._expression),
      optional($._layout_end),
    )),

    // Universal quantifier: `∀ x, P x`
    forall: $ => prec.right(seq(
      choice('forall', '∀'),
      field('binders', repeat1(choice($.identifier, $._bracketed_binder))),
      ',',
      field('body', $._expression),
    )),

    // Existential quantifier: `∃ x, P x`
    exists: $ => prec.right(seq(
      choice('exists', '∃'),
      field('binders', repeat1(choice($.identifier, $._bracketed_binder))),
      ',',
      field('body', $._expression),
    )),

    // Have expression: `have h : T := proof; body`
    have: $ => prec.right(seq(
      'have',
      optional(field('name', $.identifier)),
      optional($._type_spec),
      ':=',
      field('value', $._expression),
      optional(seq(
        choice(';', $._layout_semicolon),
        field('body', $._expression),
      )),
    )),

    // ============================================================
    // Tactic mode (entered via `by`)
    // Tactics are a separate syntactic category from expressions.
    // Expressions can contain `by` blocks, but never raw tactics.
    // ============================================================

    // `by` is the only entry point from expression world into tactic world.
    by: $ => prec.right(seq(
      'by',
      $._layout_start,
      $._tactic_seq,
      optional($._layout_end),
    )),

    // Tactics separated by `;`, `<;>` (broadcast), or newlines
    _tactic_seq: $ => prec.right(seq(
      $._tactic,
      repeat(seq(
        choice($._layout_semicolon, ';', '<;>', '<;'),
        $._tactic,
      )),
    )),

    // ── Tactic primitives ─────────────────────────────────────
    // Each rule here lives exclusively inside `by` blocks.
    // None of these appear in `_expression`.

    _tactic: $ => choice(
      $.tactic_apply,
      $.tactic_focus,
      $.tactic_case,
      $.tactic_rewrite,
      $.tactic_have,
      $.tactic_let,
      $.tactic_show,
      $.tactic_calc,
    ),

    // Most tactics: `intro n`, `simp [lemma]`, `apply foo`, `exact bar`, `omega`
    tactic_apply: $ => prec.right(PREC.app, seq(
      field('tactic', $.identifier),
      repeat(field('arg', choice(
        $.identifier, $.number, $.hole,
        $.parenthesized, $.anonymous_constructor,
        $.tactic_config, $.by,
      ))),
    )),

    // Configuration list: `[lemma1, ←lemma2, *]`
    // Only appears in tactic context — no ambiguity with `list`.
    tactic_config: $ => seq(
      '[', commaSep(seq(optional('←'), $._expression)), ']',
    ),

    // Focus: `· tactic1; tactic2`
    tactic_focus: $ => prec.right(seq(
      '·',
      $._layout_start,
      $._tactic_seq,
      optional($._layout_end),
    )),

    // Case split: `case name => ...` or `next => ...`
    tactic_case: $ => prec.right(seq(
      choice('case', 'next'),
      repeat($.identifier),
      '=>',
      $._layout_start,
      $._tactic_seq,
      optional($._layout_end),
    )),

    // `rw`/`rewrite` always take a config list, optionally with `at`
    tactic_rewrite: $ => prec.right(seq(
      choice('rw', 'rewrite'),
      $.tactic_config,
      optional(seq('at', repeat1(choice($.identifier, '*')))),
    )),

    // `have h : T := proof` in tactic mode
    tactic_have: $ => prec.right(seq(
      choice('have', 'obtain', 'suffices'),
      optional(field('name', $._pattern)),
      optional($._type_spec),
      ':=',
      field('value', $._expression),
    )),

    // `let x := e` in tactic mode
    tactic_let: $ => prec(1, seq(
      'let',
      field('pattern', $._pattern),
      optional($._type_spec),
      ':=',
      field('value', $._expression),
    )),

    // `show T`
    tactic_show: $ => seq('show', $._expression),

    // `calc` block with steps
    tactic_calc: $ => prec.right(seq(
      'calc',
      $._layout_start,
      repeat1($.calc_step),
      optional($._layout_end),
    )),

    calc_step: $ => prec.right(seq(
      $._expression,
      ':=',
      $._expression,
    )),

    // Let binding: `let x := e` in do-blocks, or `let x := e; body` in expressions
    // Body is separated by `;` or layout semicolon (newline at same indent)
    let: $ => prec.right(seq(
      'let',
      field('pattern', $._pattern),
      optional($._type_spec),
      ':=',
      field('value', $._expression),
      optional(seq(
        choice(';', $._layout_semicolon),
        field('body', $._expression),
      )),
    )),

    // If expression: `if cond then t else e`
    // Also handles `if h : cond then t else e` (dependent if with hypothesis)
    if: $ => prec.right(seq(
      'if',
      optional(seq(field('hyp', $.identifier), ':')),
      field('condition', $._expression),
      'then',
      field('then', $._expression),
      optional(seq('else', field('else', $._expression))),
    )),

    // If-let pattern matching: `if let some x := e then ...`
    // Parsed as do-element or standalone, uses `let` keyword after `if`
    if_let: $ => prec.right(seq(
      'if',
      'let',
      field('pattern', $._pattern),
      choice(':=', '<-', '←'),
      field('value', $._expression),
      'then',
      field('then', $._expression),
      optional(seq('else', field('else', $._expression))),
    )),

    // Patterns for let, if-let, and match
    // Includes: identifiers, holes, tuples, constructor applications
    _pattern: $ => choice(
      $.identifier,
      $.hole,
      $.tuple_pattern,
      $.constructor_pattern,
    ),

    // Tuple pattern: `(a, b)` or `(a, b, c)`
    tuple_pattern: $ => seq(
      '(',
      $._pattern,
      ',',
      sep1($._pattern, ','),
      ')',
    ),

    // Constructor pattern: `some x`, `none`, `Foo.bar x y`
    // An identifier alone is just an identifier, not a constructor_pattern
    constructor_pattern: $ => prec.left(PREC.app, seq(
      field('constructor', $.identifier),
      repeat1(field('arg', $._pattern)),
    )),

    // Match expression (prec.left to consume as many arms as possible)
    match: $ => prec.left(seq(
      'match',
      field('scrutinees', commaSep1($._expression)),
      'with',
      repeat1($.match_arm),
    )),

    match_arm: $ => seq(
      '|',
      field('patterns', commaSep1($._expression)),
      '=>',
      field('body', $._expression),
    ),

    // Do notation with layout-sensitive parsing
    // Elements are separated by newlines at the same indentation level
    do: $ => prec.right(seq(
      'do',
      $._layout_start,
      $._do_seq,
      optional($._layout_end),
    )),

    // Sequence of do elements separated by layout semicolons or explicit semicolons
    _do_seq: $ => prec.right(seq(
      $._do_element,
      repeat(seq(
        choice($._layout_semicolon, ';'),
        $._do_element,
      )),
    )),

    _do_element: $ => choice(
      $.do_let,
      $.let_bind,
      $.let_mut,
      $.reassign,
      $.do_return,
      $.for_in,
      $.do_while,
      $.do_if,
      $.do_if_let,
      $.do_match,
      $._expression,
    ),

    // Let in do-block: `let x := e` without consuming the body
    // (the do-sequencing handles the body via _layout_semicolon)
    do_let: $ => prec(1, seq(
      'let',
      field('pattern', $._pattern),
      optional($._type_spec),
      ':=',
      field('value', $._expression),
    )),

    // Monadic bind: `let x ← e`
    let_bind: $ => seq(
      'let',
      field('name', $.identifier),
      choice('<-', '←'),
      field('value', $._expression),
    ),

    // Mutable let: `let mut x := e` or `let mut x : Type := e`
    let_mut: $ => seq(
      'let',
      'mut',
      field('name', $.identifier),
      optional($._type_spec),
      choice('<-', '←', ':='),
      field('value', $._expression),
    ),

    // Reassignment: `x := e`
    // Low precedence so binary operators (+, *, etc.) shift into the value expression
    // rather than reducing the reassign early. The `:=` token already disambiguates
    // reassign from a bare expression in _do_element.
    reassign: $ => prec.right(1, seq(
      field('name', $.identifier),
      ':=',
      field('value', $._expression),
    )),

    // Using prec.left to prefer NOT consuming the next expression
    // (let the do-block parse it as a separate element)
    // Return should consume its value expression
    do_return: $ => prec.right(seq('return', optional(field('value', $._expression)))),

    // For loop: `for x in xs do body`
    // The `do` at the end starts a full do-block with its own layout.
    for_in: $ => prec.right(1, seq(
      'for',
      optional(seq(field('bound', $.identifier), ':')),
      field('var', $.identifier),
      'in',
      field('iterable', $._expression),
      field('body', $.do),
    )),

    // If in do-block: branches are do-sequences (can contain reassignment etc.)
    do_if: $ => prec.right(1, seq(
      'if',
      optional(seq(field('hyp', $.identifier), ':')),
      field('condition', $._expression),
      'then',
      $._layout_start,
      field('then', $._do_seq),
      optional($._layout_end),
      optional(seq(
        'else',
        $._layout_start,
        field('else', $._do_seq),
        optional($._layout_end),
      )),
    )),

    // If-let in do-block: `if let some x := e then ...`
    do_if_let: $ => prec.right(1, seq(
      'if',
      'let',
      field('pattern', $._pattern),
      choice(':=', '<-', '←'),
      field('value', $._expression),
      'then',
      $._layout_start,
      field('then', $._do_seq),
      optional($._layout_end),
      optional(seq(
        'else',
        $._layout_start,
        field('else', $._do_seq),
        optional($._layout_end),
      )),
    )),

    // Match in do-block: arms have do-sequences as bodies.
    // Arms are delimited by `|` — the scanner suppresses LAYOUT_SEMICOLON
    // before `|` so that _do_seq doesn't consume it.
    do_match: $ => prec.left(1, seq(
      'match',
      field('scrutinees', commaSep1($._expression)),
      'with',
      repeat1($.do_match_arm),
    )),

    // Match arm body uses layout to support multi-line do-sequences.
    // The `|` at the start of the next arm triggers layout_end for the current arm body.
    do_match_arm: $ => prec.right(seq(
      '|',
      field('patterns', commaSep1($._expression)),
      '=>',
      $._layout_start,
      field('body', $._do_seq),
      optional($._layout_end),
    )),

    // While loop in do-block: `while cond do body`
    do_while: $ => prec.right(1, seq(
      'while',
      field('condition', $._expression),
      field('body', $.do),
    )),

    // ============================================================
    // Delimited Expressions
    // ============================================================

    parenthesized: $ => seq('(', optional($._expression), ')'),

    tuple: $ => seq(
      '(',
      $._expression,
      ',',
      commaSep1($._expression),
      ')',
    ),

    anonymous_constructor: $ => seq('⟨', commaSep($._expression), '⟩'),

    structure_instance: $ => seq(
      '{',
      optional(seq(field('extends', $._expression), 'with')),
      sep($.field_assignment, choice(',', /\n/)),
      optional($._type_spec),
      '}',
    ),

    field_assignment: $ => choice(
      // Full form: `name := value`
      seq(
        field('name', $.identifier),
        ':=',
        field('value', $._expression),
      ),
      // Short form: `name` (when variable name matches field name)
      field('name', $.identifier),
    ),

    array: $ => seq('#[', commaSep($._expression), ']'),

    list: $ => seq('[', commaSep($._expression), ']'),

    // Range syntax: `[:n]`, `[start:end]`, `[start:end:step]`
    range: $ => seq(
      '[',
      optional(field('start', $._expression)),
      ':',
      optional(field('end', $._expression)),
      optional(seq(':', field('step', $._expression))),
      ']',
    ),

    // ============================================================
    // Atoms
    // ============================================================

    // Identifier with optional dot-separated parts: `Foo.Bar.baz`
    // Simple identifier without dots - projection handles qualified access
    identifier: _ => /[_a-zA-Zα-ωΑ-Ωℕℤℚℝℂ∇][_a-zA-Z0-9'α-ωΑ-Ωℕℤℚℝℂ∇?!]*/,

    // Escaped identifier: `«name with spaces»`
    escaped_identifier: _ => /«[^»]*»/,

    number: _ => choice(
      /\d+/,                    // decimal
      /0x[0-9a-fA-F]+/,         // hex
      /0b[01]+/,                // binary
      /0o[0-7]+/,               // octal
    ),

    string: $ => seq(
      '"',
      repeat(choice(
        $._string_content,
        $.escape_sequence,
        $.interpolation,
      )),
      '"',
    ),

    _string_content: _ => token.immediate(prec(1, /[^"\\{]+/)),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[\\'"nrt0]/,
        /x[0-9a-fA-F]{2}/,
        /u[0-9a-fA-F]{4}/,
        /u\{[0-9a-fA-F]+\}/,
      ),
    )),

    interpolation: $ => seq('{', $._expression, '}'),

    char: _ => seq("'", choice(/[^'\\]/, /\\./), "'"),

    // Hole/placeholder: `_` or `·` (cdot, for anonymous functions)
    hole: _ => choice('_', '·'),
    sorry: _ => 'sorry',

    _boolean: $ => choice($.true, $.false),
    true: _ => choice('true', 'True'),
    false: _ => choice('false', 'False'),

    // ============================================================
    // Comments
    // ============================================================

    comment: _ => token(choice(
      seq('--', /.*/),
      seq('/-', /[^-]*(-+[^-/][^-]*)*-*/, '-/'),
    )),
  },
});
