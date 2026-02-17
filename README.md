# Tree-Sitter-Lean4

Lean4 is a programming language, commonly used for mathematical theorem proving as a [proof assistant](https://en.wikipedia.org/wiki/Proof_assistant).

This project contains:

- Tree-Sitter grammar for parsing [Lean 4](github.com/leanprover/lean4) source code.
- Rust crate that can be used in combination with `tree-sitter` crate with bindings for parsing Lean
- Nix flake for using the compiled parser in other tools in the Tree-Sitter ecosystem such as AST-Grep

**Important**: Lean is a very extensible language. Therefore, the Tree-Sitter grammar is of limited use. For parsing advanced Lean programs you will need to use the Lean kernel. See also [Metaprogramming in Lean](https://github.com/leanprover-community/lean4-metaprogramming-book).

## Usage

### Rust

Add this crate as a normal dependency in your `Cargo.toml` file.

```bash
cargo add tree-sitter-lean4
```

The binary Lean parser is automatically compiled Cargo if it is missing. If it is missing, you will need these binaries for compilation with Cargo:

- `tree-sitter` CLI tool for generating Tree-Sitter parsers

Then instantiate the parser:

```rust
use tree_sitter::{InputEdit, Language, Parser, Point};

let mut parser = Parser::new();
parser.set_language(&tree_sitter_lean4::LANGUAGE.into()).expect("Error loading Rust grammar");
```

See [Tree-Sitter-Rust](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_rust).

### Nix Flake

This is the recommended approach for reproducible builds.

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    tree-sitter-lean.url = "github:wvhulle/tree-sitter-lean";
  };

  outputs = { nixpkgs, tree-sitter-lean, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        # If you want to use ast-grep (see next section)
        packages = [ pkgs.ast-grep ];
        shellHook = ''
          # Create a symlink in the working directory for easy access (add to .gitignore)
          ln -sf ${tree-sitter-lean.packages.${system}.grammar}/parser tree-sitter-lean.so
        '';
      };
    };
}
```

See [`nixpkgs` tree-sitter documentation](https://nixos.org/manual/nixpkgs/stable/#tree-sitter) for more Tree-Sitter with Nix examples.

### AST-Grep

[AST-Grep](https://ast-grep.github.io/reference/sgconfig.html) is a tool for quick large refactors. To set it up to use this Lean grammar, add to your `flake.nix`:
Create `sgconfig.yml`:

```yaml
customLanguages:
  lean:
    libraryPath: tree-sitter-lean.so
    extensions: [lean]
    expandoChar: _
```

Now use `ast-grep`:

```bash
nix develop
ast-grep --lang lean --pattern 'def $A := $B' your-file.lean
```

## Development

Based on <https://github.com/Julian/lean.nvim>.

Debug using AST-Grep with:

```bash
ast-grep run -p <PATTERN> --debug-query ast
```

Add tests to [./test/corpus](./test/corpus).

## License

MIT
