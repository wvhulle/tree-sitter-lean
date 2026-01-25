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

        # Runnable apps for common tasks
        apps = {
          # Run all tests: nix run .#test
          test = {
            type = "app";
            program = toString (
              pkgs.writeShellScript "test" ''
                cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
                ${pkgs.tree-sitter}/bin/tree-sitter test "$@"
              ''
            );
          };

          # Run tests matching a filter: nix run .#test-filter -- "Have"
          test-filter = {
            type = "app";
            program = toString (
              pkgs.writeShellScript "test-filter" ''
                cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
                ${pkgs.tree-sitter}/bin/tree-sitter test -f "$@"
              ''
            );
          };

          # Update test expectations: nix run .#test-update
          test-update = {
            type = "app";
            program = toString (
              pkgs.writeShellScript "test-update" ''
                cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
                ${pkgs.tree-sitter}/bin/tree-sitter test -u "$@"
              ''
            );
          };

          # Regenerate parser: nix run .#generate
          generate = {
            type = "app";
            program = toString (
              pkgs.writeShellScript "generate" ''
                cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
                ${pkgs.tree-sitter}/bin/tree-sitter generate "$@"
              ''
            );
          };

          # Parse a file: nix run .#parse -- file.lean
          parse = {
            type = "app";
            program = toString (
              pkgs.writeShellScript "parse" ''
                cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
                ${pkgs.tree-sitter}/bin/tree-sitter parse "$@"
              ''
            );
          };
        };

        # Check runs tests as part of nix flake check
        checks = {
          grammar-tests = pkgs.stdenv.mkDerivation {
            name = "tree-sitter-lean-tests";
            src = ./.;
            nativeBuildInputs = [
              pkgs.tree-sitter
              pkgs.nodejs
            ];
            buildPhase = ''
              tree-sitter generate
              tree-sitter test
            '';
            installPhase = "touch $out";
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
            echo "Quick commands (no parser regeneration):"
            echo "  tree-sitter test              - Run all grammar tests"
            echo "  tree-sitter test -f 'Have'    - Run tests matching 'Have'"
            echo "  tree-sitter test -u           - Update test expectations"
            echo "  tree-sitter parse file.lean   - Parse a Lean file"
            echo ""
            echo "Grammar development:"
            echo "  tree-sitter generate          - Regenerate parser from grammar.js"
            echo "  cargo build                   - Build Rust bindings"
            echo ""
            echo "Nix commands:"
            echo "  nix run .#test                - Run all tests"
            echo "  nix run .#test-filter -- 'X'  - Run tests matching 'X'"
            echo "  nix run .#test-update         - Update test expectations"
            echo "  nix run .#generate            - Regenerate parser"
            echo "  nix run .#parse -- file.lean  - Parse a file"
            echo "  nix flake check               - Run full CI checks"
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
