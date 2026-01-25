================
tree-sitter-lean
================

Experimental start on a `Lean 4
<https://leanprover.github.io/lean4/doc/>`_ grammar for `tree-sitter
<https://github.com/tree-sitter/tree-sitter>`_.

|CI|

.. |CI| image:: https://github.com/Julian/tree-sitter-lean/workflows/CI/badge.svg
  :alt: Build status
  :target: https://github.com/Julian/tree-sitter-lean/actions?query=workflow%3ACI

Can be used standalone, or in neovim with `nvim-treesitter
<https://github.com/nvim-treesitter/nvim-treesitter>`_ via `lean.nvim
<https://github.com/Julian/lean.nvim>`_.

Development
-----------

NixOS / Nix (recommended)
~~~~~~~~~~~~~~~~~~~~~~~~~

This repository uses Nix flakes. The parser is generated at build time,
so ``src/parser.c`` is not tracked in git.

.. code-block:: sh

    # Enter development shell (auto-generates parser.c)
    $ nix develop

    # Or with direnv
    $ direnv allow

    # Build the grammar package
    $ nix build

Other Systems
~~~~~~~~~~~~~

Install `tree-sitter-cli <https://tree-sitter.github.io/tree-sitter/creating-parsers#installation>`_:

.. code-block:: sh

    $ npm install -g tree-sitter-cli
    $ tree-sitter generate  # Generate parser.c from grammar.js

Testing
-------

Tests live in ``test/corpus/*.txt``:

.. code-block:: sh

    $ tree-sitter test
