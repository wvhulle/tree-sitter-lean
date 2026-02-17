const {min1, sep1} = require('./util.js')

module.exports = {
  // src/Lean/Parser/Module.lean
  prelude: $ => 'prelude',
  import: $ => seq('import', field('module', $.identifier)),

  _visibility: $ => choice('private', 'protected'),
  _decl_modifiers: $ => seq(
    min1(
      $.attributes,
      repeat1(
        choice('noncomputable', 'partial', $._visibility, 'unsafe'),
      ),
    ),
  ),
  _decl_id: $ => field('name', prec(2, $.identifier)),
  _decl_sig: $ => seq(
    alias(
      repeat(prec.left(choice($._simple_binder_without_type, $._bracketed_binder))),
      $.binders,
    ),
    $._type_spec,
  ),
  _opt_decl_sig: $ => prec.left(min1(
    alias(
      repeat1(prec.left(choice($._simple_binder_without_type, $._bracketed_binder))),
      $.binders,
    ),
    $._type_spec,
  )),
  _decl_val_simple: $ => seq(':=', $._expression),
  _decl_val_equations: $ => $._match_alts_where_decls,
  _decl_val: $ => field('body', choice(
    $._decl_val_simple,
    $._decl_val_equations,
    $._where_decls,
  )),
  abbrev: $ => seq(
    'abbrev',
    $._decl_id,
    optional($._opt_decl_sig),
    $._decl_val,
  ),
  def: $ => seq(
    'def',
    $._decl_id,
    optional($._opt_decl_sig),
    $._decl_val,
  ),
  theorem: $ => seq(
    'theorem',
    $._decl_id,
    $._decl_sig,
    $._decl_val,
  ),
  constant: $ => seq(
    'constant',
    $._decl_id,
    $._decl_sig,
    optional($._decl_val_simple),
  ),
  instance: $ => seq(
    'instance',
    optional($._decl_id),
    $._decl_sig,
    $._decl_val,
  ),
  axiom: $ => seq('axiom', $._decl_id, $._decl_sig),
  example: $ => seq(
    'example',
    $._decl_sig,
    $._decl_val,
  ),
  constructor: $ => seq(
    '|',
    field('name', $.identifier),
    optional($._opt_decl_sig),
  ),
  _deriving: $ => field('deriving', seq('deriving', sep1($.identifier, ','))),
  inductive: $ => seq(
    'inductive',
    $._decl_id,
    optional($._opt_decl_sig),
    optional(choice(':=', 'where')),
    optional(field('constructors', repeat1($.constructor))),
    optional($._deriving),
  ),
  class_inductive: $ => seq(
    'class', 'inductive',
    $._decl_id,
    optional($._opt_decl_sig),
    optional(choice(':=', 'where')),
    optional(field('constructors', repeat1($.constructor))),
    optional($._deriving),
  ),
  _struct_explicit_binder: $ => seq(
    '(',
    field('name', repeat1($.identifier)),
    field('type', optional($._opt_decl_sig)),
    optional($._binder_default),
    ')',
  ),
  _struct_implicit_binder: $ => seq(
    '{',
    field('name', repeat1($.identifier)),
    field('type', $._decl_sig),
    '}',
  ),
  _struct_instance_binder: $ => seq(
    '[',
    field('name', repeat1($.identifier)),
    field('type', $._decl_sig),
    ']',
  ),
  _struct_simple_binder: $ => prec.left(seq(
    field('name', $.identifier),
    field('type', optional($._opt_decl_sig)),
    optional($._binder_default),
  )),
  _struct_field: $ => alias(
    choice(
      alias($._struct_explicit_binder, $.explicit_binder),
      alias($._struct_implicit_binder, $.implicit_binder),
      alias($._struct_instance_binder, $.instance_binder),
      $._struct_simple_binder,
    ), $.field,
  ),
  _struct_constructor: $ => seq($.identifier, '::'),
  _extends: $ => field('extends', seq('extends', sep1($._expression, ','))),
  structure: $ => seq(
    choice('structure', 'class'),
    $._decl_id,
    alias(repeat($._bracketed_binder), $.binders),
    optional($._extends),
    optional($._type_spec),
    optional(
      seq(
        choice(':=', 'where'),
        optional($._struct_constructor),
        field('fields', repeat($._struct_field)),
      ),
    ),
    optional($._deriving),
  ),
  declaration: $ => seq(
    optional($._decl_modifiers),
    choice(
      $.abbrev,
      $.def,
      $.theorem,
      $.constant,
      $.instance,
      $.axiom,
      $.example,
      $.inductive,
      $.class_inductive,
      $.structure,
    ),
  ),
  // src/Lean/Parser/Command.lean: section, namespace, end are separate commands.
  // In Lean 4, namespace/section do NOT contain their body;
  // `end` is a standalone command that closes the most recent scope.
  section: $ => seq(
    'section',
    optional(field('name', $.identifier)),
  ),
  namespace: $ => seq(
    'namespace',
    field('name', $.identifier),
  ),
  end: $ => seq(
    'end',
    optional(field('name', $.identifier)),
  ),
  variable: $ => seq('variable', repeat1($._bracketed_binder)),
  universe: $ => seq('universe', repeat1($.identifier)),
  hash_command: $ => seq(
    choice('#check', '#check_failure', '#eval', '#print', '#reduce'),
    $._expression,
  ),

  attribute: $ => seq(
    'attribute',
    '[',
    sep1(choice($._attribute, seq("-", $._attribute)), ','),
    ']',
    field('term', $.identifier),
  ),
  export: $ => seq(
    'export',
    field('class', $.identifier),
    '(',
    repeat1($.identifier),
    ')',
  ),

  // src/Lean/Parser/Command.lean: openDecl variants
  // openSimple: open Foo Bar
  // openOnly:   open Foo (bar baz)
  // openHiding: open Foo hiding bar
  // openScoped: open scoped Foo
  // openRenaming: open Foo renaming bar → baz
  open: $ => seq(
    'open',
    optional('scoped'),
    repeat1(field('namespace', $.identifier)),
    optional(choice(
      field('only', seq('(', repeat1($.identifier), ')')),
      field('hiding', seq('hiding', repeat1($.identifier))),
      seq('in', $._command),
    )),
  ),

  // Quoted commands for metaprogramming
  quoted: $ => seq('`(', choice($._term, repeat1($._command)), ')'),
  _command_term: $ => choice(
    $.quoted,
  ),

  builtin_initialize: $ => seq(
    optional($._visibility),
    'builtin_initialize',
    optional(seq($.identifier, $._type_spec, $._left_arrow)),
    $._do_seq,
  ),

  _command: $ => choice(
    $.declaration,
    $.section,
    $.namespace,
    $.end,
    $.variable,
    $.universe,
    $.hash_command,
    $.attribute,
    $.export,
    $.open,
    $.builtin_initialize,

    // src/Lean/Parser/Syntax.lean
    $.mixfix,
    $.notation,
    $.macro_rules,
    $.syntax,
    $.macro,
    $.elab,

    // Do-block elements reachable at top level so that
    // ast-grep patterns like `let $A ← increment` parse correctly.
    $.let_bind,
    $.do_return,
  ),
}
