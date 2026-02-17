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
  word: $ => $._identifier,

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

  // Minimal conflicts - only where truly necessary
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

    import: $ => seq('import', field('module', $.identifier)),

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
    ),

    namespace: $ => seq('namespace', field('name', $.identifier)),
    
    section: $ => seq('section', optional(field('name', $.identifier))),
    
    end: $ => seq('end', optional(field('name', $.identifier))),

    open: $ => seq(
      'open',
      optional('scoped'),
      repeat1(field('namespace', $.identifier)),
      optional(field('hiding', seq('hiding', repeat1($.identifier)))),
      optional(field('only', seq('(', repeat1($.identifier), ')'))),
    ),

    variable: $ => seq('variable', repeat1($._bracketed_binder)),

    universe: $ => seq('universe', repeat1($.identifier)),

    // ============================================================
    // Declarations
    // ============================================================

    _declaration: $ => choice(
      $.def,
      $.theorem,
      $.lemma,
      $.abbrev,
      $.structure,
      $.inductive,
      $.instance,
    ),

    def: $ => seq(
      'def',
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      optional($._type_spec),
      ':=',
      field('body', $._expression),
    ),

    theorem: $ => seq(
      'theorem',
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      $._type_spec,
      ':=',
      field('body', $._expression),
    ),

    lemma: $ => seq(
      'lemma',
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      $._type_spec,
      ':=',
      field('body', $._expression),
    ),

    abbrev: $ => seq(
      'abbrev',
      field('name', $.identifier),
      optional(field('binders', $.binders)),
      optional($._type_spec),
      ':=',
      field('body', $._expression),
    ),

    instance: $ => seq(
      'instance',
      optional(field('name', $.identifier)),
      optional(field('binders', $.binders)),
      $._type_spec,
      ':=',
      field('body', $._expression),
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
      $.binary_expression,
      $.unary_expression,
      $.projection,
      $.arrow,
      $.fun,
      $.forall,
      $.let,
      $.if,
      $.if_let,
      $.match,
      $.do,
    ),

    // Atoms: self-delimiting expressions that can appear as function arguments
    _atom: $ => choice(
      $.identifier,
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
      field('argument', $._atom),
    )),

    // Projection: `x.foo` or `x.1` or `x.«name»`
    projection: $ => prec.left(PREC.proj, seq(
      field('object', $._expression),
      token.immediate('.'),
      field('field', choice($._identifier, $._escaped_identifier, $.number)),
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
        [PREC.compare, choice('==', '!=', '<', '>', '<=', '>=', '≤', '≥')],
        [PREC.cons, '::'],
        [PREC.add, choice('+', '-', '++')],
        [PREC.mul, choice('*', '/', '%')],
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

    // Unary operators
    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('!', '¬', '-')),
      field('operand', $._expression),
    )),

    // Lambda: `fun x => e` or `fun (x : T) => e`
    fun: $ => prec.right(seq(
      choice('fun', 'λ'),
      field('binders', repeat1(choice($.identifier, $._bracketed_binder))),
      '=>',
      field('body', $._expression),
    )),

    // Universal quantifier: `∀ x, P x`
    forall: $ => prec.right(seq(
      choice('forall', '∀'),
      field('binders', repeat1(choice($.identifier, $._bracketed_binder))),
      ',',
      field('body', $._expression),
    )),

    // Let binding: `let x := e` in do-blocks, or `let x := e; body` in expressions
    // Body is optional - in do-blocks the continuation is the next do element
    let: $ => prec.right(seq(
      'let',
      field('pattern', $._pattern),
      optional($._type_spec),
      ':=',
      field('value', $._expression),
      optional(seq(';', field('body', $._expression))),
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
      $.let_bind,
      $.let_mut,
      $.reassign,
      $.do_return,
      $.for_in,
      $._expression,
    ),

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

    // Reassignment: `x := e` (higher precedence to prefer over identifier as expression)
    reassign: $ => prec(PREC.app + 1, seq(
      field('name', $.identifier),
      ':=',
      field('value', $._expression),
    )),

    // Using prec.left to prefer NOT consuming the next expression
    // (let the do-block parse it as a separate element)
    do_return: $ => prec.left(seq('return', optional(field('value', $._expression)))),

    // For loop: `for x in xs do ...` or `for h : x in xs do ...`
    // Body is a do-block (nested do)
    for_in: $ => seq(
      'for',
      optional(seq(field('bound', $.identifier), ':')),
      field('var', $.identifier),
      'in',
      field('iterable', $._expression),
      'do',
      field('body', $._do_seq),
    ),

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
    // Using prec.left to avoid ambiguity when identifier appears before `.field`
    identifier: $ => prec.left(choice(
      seq($._identifier, repeat(seq(token.immediate('.'), $._identifier))),
      $._escaped_identifier,
    )),

    _identifier: _ => /[_a-zA-Zα-ωΑ-Ωℕℤℚℝℂ∇][_a-zA-Z0-9'α-ωΑ-Ωℕℤℚℝℂ∇?!]*/,

    _escaped_identifier: _ => /«[^»]*»/,

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

    hole: _ => '_',
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
