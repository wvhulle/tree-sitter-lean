; textobjects.scm — Helix textobject queries for tree-sitter-lean
;
; Enables `maf` (select around function), `mif` (inside), `mat` (around type),
; `maa` (around argument), `mac` (around comment), etc.

; ── Functions / theorems ─────────────────────────────────────────────────────
; `definition` covers def / theorem / lemma / abbrev / instance

(definition body: (_) @function.inside) @function.around

(example body: (_) @function.inside) @function.around

; ── Types (structures / inductives) ──────────────────────────────────────────

(structure
  (structure_field) @class.inside) @class.around

(inductive
  (constructor) @class.inside) @class.around

; ── Parameters / binders ─────────────────────────────────────────────────────
; Explicit binders `(x : T)`, implicit `{x : T}`, instance `[inst : C]`

(binders
  ((_) @parameter.inside . ","? @parameter.around) @parameter.around)

(explicit_binder) @parameter.around

(implicit_binder) @parameter.around

(instance_binder) @parameter.around

; ── Comments ─────────────────────────────────────────────────────────────────

(comment) @comment.inside

(comment)+ @comment.around

; ── Entries (items in a list-like context) ───────────────────────────────────
; Useful for navigating constructors, match arms, calc steps, tactic subgoals.

(match_arm) @entry.around

(constructor) @entry.around

(structure_field) @entry.around

(calc_step) @entry.around

; Focused tactic subgoals `· tactic` and case splits `case h => tactic`
(tactic_focus) @entry.around

(tactic_case) @entry.around
