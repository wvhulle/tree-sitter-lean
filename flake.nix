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
            version = "0.1.1";
            src = pkgs.lib.cleanSource ./.;
            generate = true;
            postInstall = ''
              mv $out/parser $out/lean.so
            '';
          };
        in
        {
          inherit grammar;
          default = grammar;
        }
      );

      devShells = forAllSystems (
        pkgs: {
          default = pkgs.mkShell {
            packages = with pkgs; [
              tree-sitter
              nodejs
              cargo
              rustc
              ast-grep
            ];
          };
        }
      );

      overlays.default = final: prev: {
        tree-sitter = prev.tree-sitter // {
          builtGrammars = prev.tree-sitter.builtGrammars // {
            tree-sitter-lean = self.packages.${final.stdenv.hostPlatform.system}.grammar;
          };
        };
      };
    };
}
