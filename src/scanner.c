/**
 * External scanner for Lean 4 tree-sitter grammar.
 * Handles layout/indentation-sensitive parsing similar to Haskell.
 *
 * Lean uses indentation to delimit:
 * - do blocks: `do\n  stmt1\n  stmt2`
 * - where clauses
 * - structure fields
 * - tactic blocks
 *
 * The scanner maintains a stack of layout contexts, each recording the
 * indentation level. When a newline is encountered, we check if the next
 * line's indentation is:
 * - Greater: continue current block (no token)
 * - Equal: emit semicolon (new statement in same block)
 * - Less: end current layout block
 */

#include "tree_sitter/parser.h"
#include "tree_sitter/alloc.h"
#include <string.h>

// Token types matching externals in grammar.js (ORDER MATTERS!)
enum TokenType {
  LAYOUT_START,       // 0: Start a new layout block (after `do`, `where`, etc.)
  LAYOUT_SEMICOLON,   // 1: Virtual semicolon between elements at same indent
  LAYOUT_END,         // 2: End of layout block (indent decreased)
};

// Maximum nesting depth for layout contexts
#define MAX_LAYOUT_DEPTH 64

// Scanner state persisted across parse calls
typedef struct {
  uint32_t indents[MAX_LAYOUT_DEPTH];
  uint8_t depth;
} Scanner;

// ============================================================
// Scanner lifecycle
// ============================================================

void *tree_sitter_lean_external_scanner_create() {
  Scanner *scanner = ts_calloc(1, sizeof(Scanner));
  scanner->depth = 0;
  return scanner;
}

void tree_sitter_lean_external_scanner_destroy(void *payload) {
  ts_free(payload);
}

unsigned tree_sitter_lean_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  size_t size = sizeof(scanner->depth) + scanner->depth * sizeof(uint32_t);
  if (size > TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
    return 0;
  }
  memcpy(buffer, &scanner->depth, sizeof(scanner->depth));
  memcpy(buffer + sizeof(scanner->depth), scanner->indents, scanner->depth * sizeof(uint32_t));
  return size;
}

void tree_sitter_lean_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  if (length == 0) {
    scanner->depth = 0;
    return;
  }
  memcpy(&scanner->depth, buffer, sizeof(scanner->depth));
  if (scanner->depth > MAX_LAYOUT_DEPTH) {
    scanner->depth = 0;
    return;
  }
  memcpy(scanner->indents, buffer + sizeof(scanner->depth), scanner->depth * sizeof(uint32_t));
}

// ============================================================
// Helper functions
// ============================================================

static void skip_whitespace_sameline(TSLexer *lexer) {
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') {
    lexer->advance(lexer, true);
  }
}

static bool is_newline(int32_t c) {
  return c == '\n' || c == '\r';
}

static void push_indent(Scanner *scanner, uint32_t indent) {
  if (scanner->depth < MAX_LAYOUT_DEPTH) {
    scanner->indents[scanner->depth] = indent;
    scanner->depth++;
  }
}

static void pop_indent(Scanner *scanner) {
  if (scanner->depth > 0) {
    scanner->depth--;
  }
}

static uint32_t current_indent(Scanner *scanner) {
  if (scanner->depth > 0) {
    return scanner->indents[scanner->depth - 1];
  }
  return 0;
}

static bool in_layout(Scanner *scanner) {
  return scanner->depth > 0;
}

// ============================================================
// Main scanner function
// ============================================================

bool tree_sitter_lean_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;

  // First, skip any whitespace on the current line
  skip_whitespace_sameline(lexer);

  // LAYOUT_START: Grammar requests to start a layout block
  // This happens right after `do`, `where`, etc.
  if (valid_symbols[LAYOUT_START]) {
    // Skip newlines and whitespace to find the first element
    while (is_newline(lexer->lookahead)) {
      lexer->advance(lexer, true);
    }
    skip_whitespace_sameline(lexer);
    
    // Record the indent of the first element
    uint32_t indent = lexer->get_column(lexer);
    push_indent(scanner, indent);
    lexer->result_symbol = LAYOUT_START;
    return true;
  }

  // Handle newlines - this is where layout decisions are made
  if (is_newline(lexer->lookahead)) {
    // Mark the end before skipping
    lexer->mark_end(lexer);
    
    // Skip the newline(s) and following whitespace
    while (is_newline(lexer->lookahead)) {
      lexer->advance(lexer, true);
    }
    skip_whitespace_sameline(lexer);

    // Get the column of the next token
    uint32_t next_indent = lexer->get_column(lexer);

    // If we're in a layout context, make layout decisions
    if (in_layout(scanner)) {
      uint32_t layout_indent = current_indent(scanner);

      // Indent decreased: end the layout block
      if (next_indent < layout_indent && valid_symbols[LAYOUT_END]) {
        pop_indent(scanner);
        lexer->result_symbol = LAYOUT_END;
        return true;
      }
      
      // Same indent: emit virtual semicolon to separate elements
      if (next_indent == layout_indent && valid_symbols[LAYOUT_SEMICOLON]) {
        lexer->result_symbol = LAYOUT_SEMICOLON;
        return true;
      }
    }
  }

  // LAYOUT_END can also be triggered by certain closing tokens
  if (valid_symbols[LAYOUT_END] && in_layout(scanner)) {
    int32_t c = lexer->lookahead;
    // Closing brackets/parens end layout
    if (c == ')' || c == ']' || c == '}') {
      pop_indent(scanner);
      lexer->result_symbol = LAYOUT_END;
      return true;
    }
  }

  return false;
}
