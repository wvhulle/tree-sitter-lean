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
          src = pkgs.lib.cleanSource ./.;
          version = "0.1.1";

          # Run tree-sitter generate once, reuse the C sources for all targets
          generatedSrc = pkgs.stdenvNoCC.mkDerivation {
            pname = "tree-sitter-lean-generated";
            inherit version src;
            nativeBuildInputs = [
              pkgs.nodejs
              pkgs.tree-sitter
            ];
            buildPhase = ''
              tree-sitter generate
            '';
            installPhase = ''
              cp -r . $out
            '';
          };
        in
        rec {
          native = pkgs.tree-sitter.buildGrammar {
            language = "lean";
            inherit version;
            src = generatedSrc;
            generate = false;
            postInstall = ''
              mv $out/parser $out/lean.so
            '';
          };

          wasm =
            let
              wasiCC = pkgs.pkgsCross.wasi32.stdenv.cc;
            in
            pkgs.stdenvNoCC.mkDerivation {
              pname = "tree-sitter-lean-wasm";
              inherit version;
              src = generatedSrc;

              nativeBuildInputs = [
                wasiCC
                pkgs.lld
              ];

              buildPhase = ''
                wasm32-unknown-wasi-cc -fPIC -Os -c src/parser.c -o parser.o -I src
                wasm32-unknown-wasi-cc -fPIC -Os -c src/scanner.c -o scanner.o -I src
                wasm-ld --no-entry --export=tree_sitter_lean --allow-undefined -o lean.wasm *.o
              '';

              installPhase = ''
                mkdir -p $out
                mv lean.wasm $out/
                if [ -d queries ]; then
                  cp -r queries $out/
                fi
              '';
            };

          source = generatedSrc;

          default = native;
        }
      );

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            tree-sitter
            rustup
          ];
        };
      });

    };
}
