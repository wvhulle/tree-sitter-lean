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
      in
      {
        packages.default = mkGrammar pkgs;

        checks.grammar-tests = pkgs.stdenv.mkDerivation {
          name = "tree-sitter-lean-tests";
          src = ./.;
          nativeBuildInputs = [ pkgs.tree-sitter pkgs.nodejs ];
          buildPhase = "tree-sitter generate && tree-sitter test";
          installPhase = "touch $out";
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [ tree-sitter nodejs cargo rustc ];
        };
      }
    )
    // {
      overlays.default = final: prev: {
        tree-sitter = prev.tree-sitter // {
          grammars = prev.tree-sitter.grammars // {
            tree-sitter-lean = mkGrammar final;
          };
        };
      };
    };
}
