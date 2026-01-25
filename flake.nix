{
  description = "Tree-sitter grammar for Lean 4";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Build the grammar, generating parser.c from grammar.js
        tree-sitter-lean = pkgs.stdenv.mkDerivation {
          pname = "tree-sitter-lean";
          version = "0.1.0";
          src = ./.;

          nativeBuildInputs = [ pkgs.tree-sitter pkgs.nodejs ];

          buildPhase = ''
            tree-sitter generate
          '';

          installPhase = ''
            mkdir -p $out/src
            cp -r src/* $out/src/
            cp grammar.js $out/
            cp -r grammar $out/
            cp package.json $out/
          '';
        };
      in
      {
        packages = {
          default = tree-sitter-lean;
          tree-sitter-lean = tree-sitter-lean;
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

            # Generate parser if missing
            if [ ! -f src/parser.c ]; then
              echo ""
              echo "Generating parser.c..."
              tree-sitter generate
            fi
          '';
        };
      }
    );
}
