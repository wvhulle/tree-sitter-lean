; indents.scm — Helix indentation queries for tree-sitter-lean
;
; Lean uses layout-based parsing (virtual semicolons/blocks via the external
; scanner), so most structural indentation is already encoded in the tree.
; These rules handle bracket-based indentation and a few common patterns.

; ── Indent scopes (entering these nodes increases indent) ────────────────────

[
  (parenthesized)
  (tuple)
  (anonymous_constructor)
  (structure_instance)
  (array)
  (list)
  (tactic_config)

  (by)
  (do)
  (match)
  (fun)
  (forall)
  (for_in)
  (if)
  (if_let)

  (tactic_focus)
  (tactic_case)
  (tactic_calc)
] @indent

; ── Outdent tokens (these tokens cancel the current indent level) ─────────────

[
  ")"
  "]"
  "}"
  "⟩"
] @outdent
