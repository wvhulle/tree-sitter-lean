; highlights.scm — for tree-sitter-lean (wvhulle fork)

; ── Variables ────────────────────────────────────────────────

(identifier) @variable

; Capitalize → type by convention
((identifier) @type
 (#match? @type "^[A-Z]"))

; ── Modifiers ──────────────────────────────────────────────────

[
  "noncomputable"
  "partial"
  "protected"
  "private"
  "unsafe"
] @keyword.storage.modifier

; ── Declarations ─────────────────────────────────────────────

(definition
  name: (identifier) @function)

(structure
  name: (identifier) @type)

(inductive
  name: (identifier) @type)

(class_inductive
  name: (identifier) @type)

(opaque
  name: (identifier) @function)

(constructor
  name: (identifier) @constructor)

(constant
  name: (identifier) @constant)

(axiom
  name: (identifier) @function)

(structure_field
  name: (identifier) @variable.other.member)

; ── Namespaces & imports ─────────────────────────────────────

(namespace
  name: (identifier) @namespace)

(open
  namespace: (identifier) @namespace)

(section
  name: (identifier) @namespace)

(import
  module: (_) @namespace)

; ── Explicit (@) ───────────────────────────────────────────────

(explicit
  "@" @operator)

; ── Patterns ─────────────────────────────────────────────────

(constructor_pattern
  constructor: (identifier) @constructor)

; ── Projections ──────────────────────────────────────────────

(projection
  name: (identifier) @variable.other.member)

(projection
  name: (number) @variable.other.member)

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

(exists
  binders: (identifier) @variable.parameter)

(for_in
  var: (identifier) @variable.parameter)

; ── Let / have / mut / bind ──────────────────────────────────

(let
  name: (identifier) @variable)

(do_let
  pattern: (identifier) @variable)

(have
  name: (identifier) @variable)

(let_mut
  name: (identifier) @variable)

(let_bind
  name: (identifier) @variable)

(reassign
  name: (identifier) @variable)

; ── Field assignment ─────────────────────────────────────────

(field_assignment
  name: (identifier) @variable.other.member)

; ── Tactics ──────────────────────────────────────────────────

(tactic_apply
  tactic: (identifier) @function.builtin)

(tactic_have
  name: (identifier) @variable)

(tactic_let
  pattern: (identifier) @variable)

(tactic_case
  "case" @keyword)

(tactic_case
  "next" @keyword)

(tactic_rewrite
  "rw" @function.builtin)

(tactic_rewrite
  "rewrite" @function.builtin)

(hash_command) @keyword.directive

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
  "example"
  "attribute"
  "constant"
  "axiom"
  "opaque"
  "extends"
] @keyword

(prelude) @keyword

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
  "have"
  "fun"
  "λ"
  "forall"
  "∀"
  "exists"
  "∃"
  "where"
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

[
  "by"
  "show"
  "calc"
  "obtain"
  "suffices"
] @keyword

"return" @keyword.control.return

(sorry) @error

; ── Operators ────────────────────────────────────────────────

[
  "!"  "¬"
  "+"  "-"  "*"  "/"  "%"
  "++"  "∘"
  "::"
  "×"  "∪"  "∩"
  "&&"  "∧"
  "||"  "∨"
  "="  "=="  "!="  "≠"  "∣"
  "<"  ">"  "<="  ">="  "≤"  "≥"
  "|>"  "<|"  "|>."  "$"
  "<|>"
  "<;>"  "<;"
  "->"  "→"
  "<-"  "←"
  ":="
  "=>"
] @operator

; ── Literals ─────────────────────────────────────────────────

(number) @constant.numeric.integer
(float) @constant.numeric.float
(string) @string
(char) @constant.character
(hole) @variable.builtin
[(true) (false)] @constant.builtin.boolean

; ── String internals ─────────────────────────────────────────

(escape_sequence) @constant.character.escape

(interpolation
  "{" @punctuation.special
  (_) @none
  "}" @punctuation.special)

; ── Comments ─────────────────────────────────────────────────

(comment) @comment

; ── Punctuation ──────────────────────────────────────────────

["(" ")" "[" "]" "{" "}" "⟨" "⟩"] @punctuation.bracket
["|" "," "." ":" ";"] @punctuation.delimiter
