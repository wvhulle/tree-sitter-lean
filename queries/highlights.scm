; highlights.scm — for tree-sitter-lean (wvhulle fork)

; ── Variables ────────────────────────────────────────────────

(identifier) @variable

; Capitalize → type by convention
((identifier) @type
 (#match? @type "^[A-Z]"))

; ── Declarations ─────────────────────────────────────────────

(definition
  name: (name (identifier) @function))

(structure
  name: (identifier) @type)

(inductive
  name: (identifier) @type)

(constructor
  name: (identifier) @constructor)

(structure_field
  name: (identifier) @variable.other.member)

; ── Namespaces & imports ─────────────────────────────────────

(namespace
  name: (name (identifier) @namespace))

(open
  namespace: (name (identifier) @namespace))

(section
  name: (identifier) @namespace)

(import
  module: (_) @namespace)

; ── Patterns ─────────────────────────────────────────────────

(constructor_pattern
  constructor: (identifier) @constructor)

; ── Projections ──────────────────────────────────────────────

(projection
  field: (identifier) @variable.other.member)

(projection
  field: (number) @variable.other.member)

; ── Binders ──────────────────────────────────────────────────

(explicit_binder
  name: (identifier) @variable.parameter)

(implicit_binder
  name: (identifier) @variable.parameter)

(instance_binder
  name: (identifier) @variable.parameter)

(fun
  binders: (identifier) @variable.parameter)

(forall
  binders: (identifier) @variable.parameter)

(for_in
  var: (identifier) @variable.parameter)

(for_in
  bound: (identifier) @variable.parameter)

; ── Let / mut / bind ─────────────────────────────────────────

(let
  pattern: (identifier) @variable)

(do_let
  pattern: (identifier) @variable)

(let_mut
  name: (identifier) @variable)

(let_bind
  name: (identifier) @variable)

(reassign
  name: (identifier) @variable)

; ── Field assignment ─────────────────────────────────────────

(field_assignment
  name: (identifier) @variable.other.member)

; ── Types ────────────────────────────────────────────────────

(arrow) @type

; ── Keywords ─────────────────────────────────────────────────

[
  "def"
  "theorem"
  "lemma"
  "abbrev"
  "instance"
  "inductive"
  "structure"
  "class"
  "deriving"
  "section"
  "namespace"
  "end"
  "prelude"
] @keyword

[
  "open"
  "import"
  "variable"
  "universe"
  "scoped"
  "hiding"
] @keyword.control.import

[
  "let"
  "mut"
  "fun"
  "λ"
  "forall"
  "∀"
  "where"
  "have"
] @keyword

[
  "if"
  "then"
  "else"
] @keyword.control.conditional

[
  "for"
  "in"
  "while"
  "do"
] @keyword.control.repeat

[
  "match"
  "with"
] @keyword.control.conditional

"return" @keyword.control.return

(sorry) @keyword

; ── Operators ────────────────────────────────────────────────

[
  "!"  "¬"
  "+"  "-"  "*"  "/"  "%"
  "++"
  "::"
  "×"
  "&&"  "∧"
  "||"  "∨"
  "=="  "!="
  "<"  ">"  "<="  ">="  "≤"  "≥"
  "|>"  "<|"  "|>."  "$"
  "->"  "→"
  "<-"  "←"
  ":="
  "=>"
] @operator

; ── Literals ─────────────────────────────────────────────────

(number) @constant.numeric.integer
(string) @string
(char) @constant.character
(hole) @variable.builtin
[(true) (false)] @constant.builtin.boolean

; ── String internals ─────────────────────────────────────────

(escape_sequence) @constant.character.escape

(interpolation
  "{" @punctuation.special
  "}" @punctuation.special)

; ── Comments ─────────────────────────────────────────────────

(comment) @comment

; ── Punctuation ──────────────────────────────────────────────

["(" ")" "[" "]" "{" "}" "⟨" "⟩"] @punctuation.bracket
["|" "," "." ":" ";"] @punctuation.delimiter
