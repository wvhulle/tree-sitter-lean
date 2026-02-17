#include "tree_sitter/parser.h"

enum TokenType {
  NEWLINE,
};

static void skip(TSLexer *lexer) {
  lexer->advance(lexer, true);
}

static bool scan(TSLexer *lexer, const bool *valid_symbols) {
  // Newlines are both whitespace (/\s/ in extras) and statement separators
  // (let value/body, do-block elements, tactic sequences). A regex /\n/ in
  // grammar rules loses to /\s/ in extras. This scanner runs before extras,
  // matching \n only when the parser expects a _newline token.
  if (valid_symbols[NEWLINE]) {
    if (lexer->lookahead == '\n' || lexer->lookahead == 0) {
      // skip() produces a zero-width token in the tree.
      skip(lexer);
      lexer->result_symbol = NEWLINE;
      return true;
    }
  }
  return false;
}

void *tree_sitter_lean_external_scanner_create() {
  return NULL;
}

bool tree_sitter_lean_external_scanner_scan(void *payload, TSLexer *lexer,
                                            const bool *valid_symbols) {
  return scan(lexer, valid_symbols);
}

unsigned tree_sitter_lean_external_scanner_serialize(void *payload,
                                                     char *buffer) {
  return 0;
}

void tree_sitter_lean_external_scanner_deserialize(void *payload,
                                                   const char *buffer,
                                                   unsigned length) {}

void tree_sitter_lean_external_scanner_destroy(void *payload) {}
