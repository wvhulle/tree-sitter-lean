# Plan: Fix tree-sitter-lean for Rust Usage

## Problems

1. **build.rs doesn't compile scanner.c** - causes linker errors
2. **Git history is 247MB** - `src/parser.c` (~100MB) committed 20+ times

## Fixes

### 1. Fix build.rs

Edit `bindings/rust/build.rs` - uncomment lines 17-19:

```rust
// Remove the /* and */ around these lines:
let scanner_path = src_dir.join("scanner.c");
c_config.file(&scanner_path);
println!("cargo:rerun-if-changed={}", scanner_path.to_str().unwrap());
```

### 2. Squash Git History

Replace the 275-commit history with a single commit:

```bash
# Create orphan branch with current state
git checkout --orphan fresh
git add -A
git commit -m "Initial commit: tree-sitter-lean with scanner.c fix"

# Replace main branch
git branch -D main
git branch -m main

# Force push (this is a fork, so safe)
git push -f origin main
```

This reduces repo size from ~250MB to ~100MB (just the current parser.c).

### 3. Optional: Add .gitattributes for LFS

For future: consider Git LFS for parser.c to prevent history bloat:

```
src/parser.c filter=lfs diff=lfs merge=lfs -text
```

## After Fixes

Update lean-tui-diff's `Cargo.toml`:

```toml
tree-sitter = "0.17"
tree-sitter-lean = { git = "https://github.com/wvhulle/tree-sitter-lean" }
```
