# tree-sitter-lean4-source

Tree-sitter grammar for Lean 4. Generates `parser.c` at build time from `grammar.js`.

## Rust Usage

```toml
[dependencies]
tree-sitter-lean4-source = { git = "https://github.com/wvhulle/tree-sitter-lean" }
```

**Requires `tree-sitter` CLI at build time** (for parser generation).

### With Nix

```nix
# flake.nix
{
  devShells.default = pkgs.mkShell {
    buildInputs = [ pkgs.tree-sitter pkgs.nodejs ];
  };
}
```

### Without Nix

```sh
npm install -g tree-sitter-cli
# or: cargo install tree-sitter-cli
```

## Development

```sh
nix develop          # Enter dev shell
tree-sitter test     # Run grammar tests
tree-sitter generate # Regenerate parser (automatic on cargo build)
```

## License

MIT
