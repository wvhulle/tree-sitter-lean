{
  description = "Tree-sitter grammar for Lean 4";

  nixConfig = {
    extra-substituters = [ "https://wvhulle.cachix.org" ];
    extra-trusted-public-keys = [ "wvhulle.cachix.org-1:heXx8DZMiRsKUx6l1TxNoF+Nmtmz66QEdsonQzc1ir0=" ];
  };
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    {
      self,
      nixpkgs,
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (
        pkgs:
        let
          grammar = pkgs.tree-sitter.buildGrammar {
            language = "lean";
            version = "0.0.8";
            src = pkgs.lib.cleanSource ./.;
            generate = true;
          };
        in
        {
          inherit grammar;
          default = grammar;
        }
      );

      devShells = forAllSystems (
        pkgs:
        let
          grammar = self.packages.${pkgs.stdenv.hostPlatform.system}.grammar;
        in
        {
          default = pkgs.mkShell {
            inputsFrom = [ grammar ];
            packages = with pkgs; [
              tree-sitter
              nodejs
              cargo
              rustc
              ast-grep
            ];
            shellHook = ''
              rm -f tree-sitter-lean.so
              ln -sf ${grammar}/parser tree-sitter-lean.so
            '';
          };
        }
      );

      overlays.default = final: prev: {
        tree-sitter = prev.tree-sitter // {
          builtGrammars = prev.tree-sitter.builtGrammars // {
            tree-sitter-lean = final.tree-sitter.buildGrammar {
              language = "lean";
              version = "0.0.3";
              src = final.lib.cleanSource ./.;
              generate = true;
            };
          };
        };
      };
    };
}
