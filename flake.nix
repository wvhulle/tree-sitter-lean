{
  description = "Tree-sitter grammar for Lean 4";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    let
      # Helper to build grammar for a given system
      mkGrammar =
        pkgs:
        pkgs.tree-sitter.buildGrammar {
          language = "lean";
          version = "0.0.1-${self.shortRev or "dirty"}";
          src = ./.;
          generate = true;
        };
    in
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        grammar = mkGrammar pkgs;
      in
      {
        packages = {
          default = grammar;
          grammar = grammar;

          # Rust crate source with generated parser.c
          # Structured for crane's vendorCargoDeps overrideVendorGitCheckout
          rust-crate = pkgs.stdenv.mkDerivation {
            pname = "tree-sitter-lean-crate";
            version = "0.0.1";
            src = ./.;

            nativeBuildInputs = [
              pkgs.tree-sitter
              pkgs.nodejs
            ];

            buildPhase = "tree-sitter generate";

            installPhase = ''
              # Create directory structure expected by cargo vendoring:
              # <name>-<version>/
              mkdir -p $out/tree-sitter-lean-0.0.1
              cp -r . $out/tree-sitter-lean-0.0.1/
              rm -rf $out/tree-sitter-lean-0.0.1/.git

              # Add cargo checksum file (empty checksums for local vendoring)
              echo '{"files":{}}' > $out/tree-sitter-lean-0.0.1/.cargo-checksum.json
            '';
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            tree-sitter
            nodejs
            cargo
            rustc
          ];

          shellHook = ''
            echo "tree-sitter-lean development shell"
            echo ""
            echo "Commands:"
            echo "  tree-sitter generate  - Regenerate parser from grammar"
            echo "  tree-sitter test      - Run grammar tests"
            echo "  tree-sitter parse <file>  - Parse a Lean file"
            echo "  cargo build           - Build Rust bindings"
            echo ""
            echo "Nix outputs:"
            echo "  nix build             - Build the grammar (.so)"
            echo ""

            # Generate parser if missing
            if [ ! -f src/parser.c ]; then
              echo "Generating parser.c..."
              tree-sitter generate
            fi
          '';
        };
      }
    )
    // {
      # System-independent overlay for consumers
      overlays.default = final: prev: {
        tree-sitter = prev.tree-sitter // {
          grammars = prev.tree-sitter.grammars // {
            tree-sitter-lean = mkGrammar final;
          };
        };
      };
    };
}
