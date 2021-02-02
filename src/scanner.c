#include <tree_sitter/parser.h>
#include <string.h>

enum TokenType {
	EOF,
	ATTRIBUTE_START,
	JUST_AT,
	ABILITY_START,
	JUST_PERCENT,
	DICE_ROLL_START,
	JUST_D,
	NOT_ROLL_COUNT,
	TABLE_ROLL_COUNT,
};

void * tree_sitter_roll20_script_external_scanner_create() { return NULL; }
void tree_sitter_roll20_script_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_roll20_script_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_roll20_script_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

char advance(TSLexer *lexer) {
	lexer->advance(lexer, false);
	return lexer->lookahead;
}
bool check_for_closure(
	TSLexer *lexer,
	char start_char,
	char end_char
) {
	char c = lexer->lookahead;
	if (c == start_char) {
		c = advance(lexer);
		while (c != 0 && c != '\n' && c != end_char) {
			c = advance(lexer);
		}
		if (c == end_char) return true;
	}
	return false;
}

bool check_for_dice_roll_start(
	TSLexer *lexer,
	const bool *valid_symbols
) {
	char digit[] = "0123456789";
	char c = lexer->lookahead;
	if (strchr("fF", c) != NULL) {
		return true;
	}
	else if (strchr(digit, c) != NULL) {
		c = advance(lexer);
		while (c != 0 && strchr(digit, c) != NULL) {
			c = advance(lexer);
		}
		return true;
	}
	else if (c == '@') {
		advance(lexer);
		if (check_for_closure(lexer, '{', '}')) return true;
	}
	else if (c == '%') {
		advance(lexer);
		if (check_for_closure(lexer, '{', '}')) return true;
	}
	return false;
}

bool tree_sitter_roll20_script_external_scanner_scan(
	void *payload,
	TSLexer *lexer,
	//const bool *valid_symbols
	const bool *vs
) {
	lexer->mark_end(lexer);
	char c = lexer->lookahead;
	
	if (c == 0) {
		lexer->result_symbol = EOF;
		return vs[EOF];
	}
	else if (c == '@') {
		if (vs[ATTRIBUTE_START] || vs[JUST_AT]) {
			advance(lexer);
			lexer->mark_end(lexer);
			if (check_for_closure(lexer, '{', '}')) {
				if (vs[ATTRIBUTE_START]) {
					lexer->result_symbol = ATTRIBUTE_START;
					return true;
				}
			}
			else if (vs[JUST_AT]) {
				lexer->result_symbol = JUST_AT;
				return true;
			}
		}
	}
	else if (c == '%') {
		if (vs[ABILITY_START] || vs[JUST_PERCENT]) {
			advance(lexer);
			lexer->mark_end(lexer);
			if (check_for_closure(lexer, '{', '}')) {
				if (vs[ABILITY_START]) {
					lexer->result_symbol = ABILITY_START;
					return true;
				}
			}
			else if (vs[JUST_PERCENT]) {
				lexer->result_symbol = JUST_PERCENT;
				return true;
			}
		}
	}
	else if (c == 'd' || c == 'D') {
		if (vs[DICE_ROLL_START] || vs[JUST_D] || vs[NOT_ROLL_COUNT]) {
			c = advance(lexer);
			if (vs[DICE_ROLL_START] || vs[JUST_D]) {
				lexer->mark_end(lexer);
			}
			
			if (check_for_dice_roll_start(lexer, vs)) {
				if (vs[DICE_ROLL_START]) {
					lexer->result_symbol = DICE_ROLL_START;
					return true;
				}
			}
			else if (vs[JUST_D]) {
				lexer->result_symbol = JUST_D;
				return true;
			}
			else if (vs[NOT_ROLL_COUNT]) {
				lexer->result_symbol = NOT_ROLL_COUNT;
				return true;
			}
		}
	}
	else if (c == 't' || c == 'T') {
		if (vs[TABLE_ROLL_COUNT]) {
			lexer->result_symbol = TABLE_ROLL_COUNT;
			return true;
		}
	}
	else if (vs[NOT_ROLL_COUNT]) {
		lexer->result_symbol = NOT_ROLL_COUNT;
		return true;
	}
	
	return false;
}
