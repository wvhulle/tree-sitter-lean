; tags.scm — Helix workspace-symbol / ctags queries for tree-sitter-lean
;
; Drives `Space-s` (document symbols) and `Space-S` (workspace symbols).

; ── Top-level declarations ────────────────────────────────────────────────────

(definition
  name: (name (identifier) @name .)) @definition.function

(example) @definition.function

; ── Type declarations ─────────────────────────────────────────────────────────

(structure
  name: (identifier) @name) @definition.type

(inductive
  name: (identifier) @name) @definition.type

; Constructors are definition-like within inductives
(constructor
  name: (identifier) @name) @definition.struct

; ── Namespaces / sections ────────────────────────────────────────────────────

(namespace
  name: (name (identifier) @name .)) @definition.module

(section
  name: (identifier) @name) @definition.module
