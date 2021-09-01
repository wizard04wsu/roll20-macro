
const chainOf = (rule) => prec.right(repeat1(rule));


module.exports = grammar({
	name: 'roll20_script',
	
	externals: $ => [
		$.__integer,
		
		$.__attribute_start,			// @
		
		$.__ability_start,				// %
		
		$.__macro_safe_start,				// #
		$.__macro_unsafe_start,				// #
		
		$.__html_entity,				// HTML entity
		
		$.__rollQuery_start,			// ?{  or equivalent HTML entity(ies)
		$.__rollQuery_pipe_hasDefault,	// |  or equivalent HTML entity
		$.__rollQuery_pipe_hasOptions,	// |  or equivalent HTML entity
		$.__rollQuery_end,				// }  or equivalent HTML entity
		
		$.__inlineRoll_start,
		$.__inlineRoll_end,
		
		//$.__parenthesized_start,
		//$.__parenthesized_end,
		
		//$.__groupRoll_start,
		//$.__groupRoll_end,
		
		$.__diceRoll_start,				// d or D  or equivalent HTML entity
		$.__diceRoll_modifiers_indeterminate,	// placeholders surrounded by potentially valid characters
		
		$.__tableRoll_start,			// t or T  or equivalent HTML entity
		
		
		$.__just_at,					// @
		$.__just_percent,				// %
		$.__just_hash,					// #
		$.__just_ampersand,				// &
		$.__just_d,						// d or D
		$.__just_t,						// t or T
		$.__just_questionmark,			// ?
		$.__just_leftBrace,				// {
		$.__just_pipe,					// |
		$.__just_comma,					// ,
		$.__just_rightBrace,			// }
		$.__just_leftBracket,			// [
		$.__just_rightBracket,			// ]
		$.__just_leftParen,				// (
		$.__just_rightParen,			// )
		
		$.__decimal_point,
		$.__just_period,
		
		$.__just_slash,
		$.__just_asterisk,
		$.__just_plus,
		$.__just_dash,
		$.__operator_positive,
		$.__operator_negative,
		
		$.__EOF,
	],
	
	extras: $ => [
		//(manually handle whitespace)
	],
	
	conflicts: $ => [],
	
	inline: $ => [
		//$.formula,
	],
	
	rules: {
		
		/*╔════════════════════════════════════════════════════════════
		  ║ General Notes
		  ╚╤═══════════════════════════════════════════════════════════*/
		 /*│ Roll20 appears to evaluate script elements in this order:
		   │ 1. abilities
		   │ 2. macros (skip ones that have an attribute in their name)
		   │ 3. attributes
		   │ 4. repeat steps 1 to 3 if necessary
		   │ 5. roll queries
		   │    a. prompt for a value or a choice from a dropdown box
		   │    b. if a dropdown box was used, unescape HTML character entities
		   │       in the option value (once)
		   │    c. repeat step 5 if needed
		   │ 6. inline rolls (most deeply nested first)
		   │    a. group rolls (most deeply nested first)
		   │       i. rolls (dice, table)
		   │       ii. repeat step 6.a if needed
		   │    b. remaining rolls (dice, table)
		   │    c. math (order of operations is below)
		   │    d. repeat step 6 if needed
		   │ 7. remaining group rolls (most deeply nested first)
		   │    a. rolls (dice, table)
		   │    b. repeat step 7 if needed
		   │ 8. remaining rolls (dice, table)
		   │ 9. math
		   │ 
		   │ Order of math operations:
		   │ 1. parentheses (most deeply nested first)
		   │    a. floor/ceil/abs/round functions (most deeply nested first)
		   │       i.   exponentiation
		   │       ii.  multiplication, division, modulus
		   │       iii. addition, subtraction
		   │       iv.  repeat step 1.a as needed
		   │    b. repeat step 1 as needed
		   │ 3. unescape HTML character entities (again)
		   └───────────────────────────────────────────────────────────*/
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Start rule
		  ╚════════════════════════════════════════════════════════════*/
		
		roll20_script: $ => prec.right(repeat(
			choice(
				//$._placeholders,
				$._attribute_or_invalid,
				$._ability_or_invalid,
				$._root_macro_and_wsp,
				$.rollQuery,
				$._root_inlineRoll,
				//TODO:
				//template
				//property
				//ability command button
				//tracker
				$.htmlEntity,
				$._stringNL,
			),
		)),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Strings and Characters
		  ╚════════════════════════════════════════════════════════════*/
		
		_stringNL: $ => chainOf(choice( /[^#]|\r\n|\n/, $.__just_hash )),
		
		_wsp_inline: $ => /\s+/,
		
		htmlEntity: $ => $.__html_entity,
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Numbers
		  ╚╤═══════════════════════════════════════════════════════════*/
		 /*│ Numbers are combined with attributes, abilities, and inline rolls.
		   └───────────────────────────────────────────────────────────*/
		
		_number: $ => choice(
			$._number_signable,
			$._number_fraction,
		),
		
		_number_signable: $ => prec.right(seq(
			$._number_integer,
			optional($._number_fraction),
		)),
		_number_fraction: $ => seq(
			$.__decimal_point,
			$._number_integer,
		),
		_number_integer: $ => prec.right(repeat1(
			prec.right(1, choice(
				$.__integer,
				$._placeholders,
				$._inlineRoll,
			))
		)),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Attributes and Abilities (here, referred to as "placeholders")
		  ╚════════════════════════════════════════════════════════════*/
		
		/*┌──────────────────────────────
		  │ helper rules
		  └┬─────────────────────────────*/
		 /*│ Note that the website sometimes allows special characters in
		   │   names, even though it would prevent the property from being
		   │   accessed from within a script.
		   └─────────────────────────────*/
		
		_propertyName: $ => repeat1(choice(
			/[^@%#&}|\r\n]+/,
			$._macro_and_wsp,
			$.htmlEntity,
			$.__just_at,
			$.__just_percent,
			$.__just_hash,
			$.__just_ampersand,
		)),
		_selector: $ => choice(
			alias("target", $.token),
			alias("selected", $.token),
			alias($._propertyName, $.character),
		),
		
		
		/*┌──────────────────────────────
		  │ Placeholders
		  └──────────────────────────────*/
		
		_placeholders: $ => prec.right(repeat1(
			prec(1, choice(
				$.attribute,
				$.ability,
			))
		)),
		
		
		/*┌──────────────────────────────
		  │ Attributes
		  └┬─────────────────────────────*/
		 /*│ For an attribute, the character name and/or attribute name:
		   │ • can contain spaces and tabs.
		   │ • cannot contain new lines, pipes, closing curly braces, or the
		   │   character sequences "@{" and "%{".
		   │ • cannot include attributes or abilities.
		   │ • can include macros, but the space required after each macro name
		   │   must also be part of the character/attribute name itself. (So the
		   │   name has to have a space in it for each macro you want to
		   │   include.)
		   │ • can contain hash characters that do not reference an existing
		   │   macro.
		   │ 
		   │ @{name}
		   │ @{selected|name}
		   │ @{selected|name|max}
		   │ @{target|name}
		   │ @{target|name|max}
		   │ @{character|name}
		   │ @{character|name|max}
		   └─────────────────────────────*/
		
		_attribute_or_invalid: $ => prec.right(1, choice(
			$.attribute,
			alias($._attribute_empty, $.invalid),
			alias($._attribute_invalid, $.invalid),
		)),
		
		attribute: $ => prec(2, seq(
			$._$attributeLeft,
			$._attribute_content,
			$._$braceRight,
		)),
		_attribute_content: $ => choice(
			alias($._propertyName, $.name),
			seq(
				$._selector,
				$._$pipe,
				choice(
					alias($._propertyName, $.name),
					seq(
						alias($._propertyName, $.name),
						$._$pipe,
						choice(
							alias("max", $.keyword),
							alias(/max[^}]+/, $.invalid),
							alias(chainOf(/[^}]/), $.invalid),
						),
					),
					seq(
						alias($._propertyName, $.name),
						alias($.__just_pipe, $.invalid),
					),
					alias(chainOf(/[^}]/), $.invalid),
				),
			),
			seq(
				$._selector,
				alias($.__just_pipe, $.invalid),
			),
			alias(chainOf(/[^}]/), $.invalid),
		),
		
		_attribute_empty: $ => "@{}",
		_attribute_invalid: $ => "@{",
		
		
		/*┌──────────────────────────────
		  │ Abilities
		  └┬─────────────────────────────*/
		 /*│ For an ability, the character name and/or ability name:
		   │ • can contain spaces, tabs, and hash characters.
		   │ • cannot contain new lines, pipes, closing curly braces, or the
		   │   character sequences "@{" and "%{".
		   │ • cannot include attributes, abilities, or macros.
		   │ 
		   │ %{selected|name}
		   │ %{target|name}
		   │ %{character|name}
		   └─────────────────────────────*/
		
		_ability_or_invalid: $ => prec.right(1, choice(
			$.ability,
			alias($._ability_empty, $.invalid),
			alias($._ability_invalid, $.invalid),
		)),
		
		ability: $ => prec(2, seq(
			$._$abilityLeft,
			$._ability_content,
			$._$braceRight,
		)),
		_ability_content: $ => choice(
			alias($._propertyName, $.name),
			seq(
				$._selector,
				$._$pipe,
				choice(
					alias($._propertyName, $.name),
					alias(seq(
						alias($._propertyName, ""),
						chainOf(/[^}]/),
					), $.invalid),
					alias(chainOf(/[^}]/), $.invalid),
				),
			),
			seq(
				$._selector,
				alias($.__just_pipe, $.invalid),
			),
			alias(chainOf(/[^}]/), $.invalid),
		),
		
		_ability_empty: $ => "%{}",
		_ability_invalid: $ => "%{",
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Macros
		  ╚╤═══════════════════════════════════════════════════════════*/
		 /*│ This grammar will sometimes just pick out the hash character that
		   │   could refer to a macro (tagged as $.macroHash). It's impossible
		   │   to know whether it actually does, since we can't check a name
		   │   against the list of defined macros.
		   │ 
		   │ For example, "&#124;_" could refer to either:
		   │ • an ampersand followed by a macro named "124;_".
		   │ • an HTML entity of a pipe, followed by an underscore.
		   │ If the macro is defined, Roll20 will go with the first option.
		   │   Otherwise, Roll20 sticks with the second option.
		   │ 
		   │ The macro name:
		   │ • cannot contain spaces, new lines, or the character sequence
		   │  "@{" or "%{".
		   │ • if inside a roll query, cannot contain pipes or closing curly
		   │   braces.
		   │ • cannot include macros (additional hashes are part of the name).
		   │ • can include attributes and abilities.
		   │ 
		   │ To call the macro, its name must be followed by either a space or
		   │   a new line, or be at the end of the script.
		   │ 
		   │ #macroName 
		   └─────────────────────────────*/
		
		_root_macro_and_wsp: $ => prec.right(1, choice(
			seq(
				alias($._root_macro_safe, $.macro),
				choice(
					/ |\r\n|\n/,
					$.__EOF,
				),
			),
			seq(
				$._$macroHash_unsafe,
				$._root_macro_name_safe,
			),
		)),
		_root_macro_safe: $ => seq(
			$._$macroHash_safe,
			alias($._root_macro_name_safe, $.name),
		),
		_root_macro_name_safe: $ => prec.right(choice(
			$.__just_leftBracket,
			seq(
				optional($.__just_leftBracket),
				repeat1(
					prec.right(seq(
						prec.right(repeat1(choice(
							/[^@%\[ \r\n]/,
							$.attribute,
							$.ability,
							$.__just_at,
							$.__just_percent,
						))),
						optional($.__just_leftBracket),
					)),
				),
			),
		)),
		
		_macro_and_wsp: $ => prec.right(1, choice(
			seq(
				alias($._macro_safe, $.macro),
				choice(
					/ |\r\n|\n/,
					$.__EOF,
				),
			),
			seq(
				$._$macroHash_unsafe,
				$._macro_name_safe,
			),
		)),
		_macro_safe: $ => seq(
			$._$macroHash_safe,
			alias($._macro_name_safe, $.name),
		),
		_macro_name_safe: $ => prec.right(repeat1(choice(
			/[^@%\[({/*+\-})\] \r\n]+/,
			$.attribute,
			$.ability,
			$.__just_at,
			$.__just_percent,
		))),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Roll Queries
		  ╚════════════════════════════════════════════════════════════*/
		
		rollQuery: $ => choice(
			seq(
				$.__rollQuery_start,	//?{
				$._rollQuery_content,
				$.__rollQuery_end,	//}
			),
		),
		_rollQuery_content: $ => prec.right(choice(
			$.prompt,
			seq(
				optional($.prompt),
				choice(
					seq(
						$.__rollQuery_pipe_hasDefault,
						optional($.defaultValue),
					),
					seq(
						$.__rollQuery_pipe_hasOptions,
						optional($.option),
						$.__just_pipe,
						optional($.option),
						repeat(
							seq(
								$.__just_pipe,
								optional($.option),
							),
						),
					),
				),
			),
		)),
		
		_rollQuery_invalid: $ => prec.right(seq(
			$.__rollQuery_start,
			optional($.__rollQuery_end),
		)),
		
		prompt: $ => repeat1(choice(
			/[^@%#&}|]+/,	//new lines are allowed, but replaced with a space
			$._attribute_or_invalid,
			$._ability_or_invalid,
			$._macro_and_wsp,
			$.htmlEntity,
			$.__just_at,
			$.__just_percent,
			$.__just_hash,
			$.__just_ampersand,
		)),
		
		defaultValue: $ => repeat1(choice(
			/[^@%#&}|]+/,	//new lines are allowed, but removed
			$._attribute_or_invalid,
			$._ability_or_invalid,
			$._macro_and_wsp,
			$.htmlEntity,
			$.__just_at,
			$.__just_percent,
			$.__just_hash,
			$.__just_ampersand,
		)),
		
		option: $ => choice(
			$.optionName,
			prec.right(seq(
				optional($.optionName),
				$._$comma,
				optional($.optionValue),
			)),
		),
		optionName: $ => prec.right(1, repeat1(choice(
			/[^@%#&}|,]+/,	//new lines are allowed, but replaced with a space
			$._attribute_or_invalid,
			$._ability_or_invalid,
			$._macro_and_wsp,
			$.htmlEntity,
			$.__just_at,
			$.__just_percent,
			$.__just_hash,
			$.__just_ampersand,
//		)))($),
		))),
		optionValue: $ => prec.right(1, repeat1(choice(
			/[^@%#&}|,?]+/,	//new lines are allowed
			$._attribute_or_invalid,
			$._ability_or_invalid,
			$._macro_and_wsp,
			$.htmlEntity,
			$.rollQuery,
			//$.property,
			//$.button,
			$.__just_at,
			$.__just_percent,
			$.__just_hash,
			$.__just_ampersand,
			$.__just_questionmark,
//		)))($),
		))),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Inline Rolls
		  ╚╤═══════════════════════════════════════════════════════════*/
		 /*│ An inline roll may be used as a root element or in place of a
		   │   number, and contains its own formula. When evaluated, it is
		   │   reduced to a number.
		   └─────────────────────────────*/
		
		_root_inlineRoll: $ => choice(
			$.inlineRoll,
			alias($._inlineRoll_unclosed, $.inlineRoll),
			alias($._inlineRoll_invalid, $.invalid),
		),
		
		_inlineRoll: $ => choice(
			$.inlineRoll,
			alias($._inlineRoll_unclosed, $.inlineRoll),
		),
		_inlineRoll_unclosed: $ => seq(
			alias($._$inlineRollStart, $.invalid),
			$.formula,
			optional(alias($._$bracketRight, $.invalid)),
			$.__EOF,
		),
		
		inlineRoll: $ => seq(
			$._$inlineRollStart,
			$.formula,
			$._$inlineRollEnd,
		),
		
		_inlineRoll_invalid: $ => seq(
			$._$inlineRollStart,
			optional($._wsp_inline),
			choice(
				$._$inlineRollEnd,
				seq(
					optional($._$bracketRight),
					$.__EOF,
				),
			),
		),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Formulas
		  ╚╤═══════════════════════════════════════════════════════════*/
		 /*│ Used within an inline roll and within nested elements (i.e., within
		   │   nested inline rolls, parentheses, math functions, or group rolls).
		   │
		   │ A formula consisting of only whitespace and/or labels is invalid. 
		   │ 
		   │ Labels can only be the first items in a formula if the following
		   │   item is a dice roll or table roll (or attribute/ability/macro
		   │   that evaluates to one of those).
		   │   This implementation does not detect that.
		   └─────────────────────────────*/
		
		formula: $ => prec.right(choice(
			alias($._labels_with_wsp, $.invalid),
			seq(
				//In Roll20, a label here will cause an error if it's followed
				//   by anything but a dice roll or table roll. I haven't found
				//   a decent way to check that since placeholders make things
				//   so indeterminate.
				optional($._labels_or_wsp),
				
				alias($._term_first, $.term),
				prec.right(repeat(choice(
					seq(
						$._operator,
						alias($._term, $.term),
					),
					seq(
						$._labels_or_wsp,
						alias($._term, $.invalid),	//missing an operator before it
					),
				))),
				optional($._labels_or_wsp),
			),
		)),
		
		_term_first: $ => prec.right(seq(
			optional($._operators_invalid_before_first_term),
			choice(
				prec(1, seq(
					prec.right(choice(
						seq(
							optional(alias(choice(
								$.__operator_positive,
								$.__operator_negative,
							), $.operator)),
							alias($._number_signable, $.number),
							optional(alias($._term_remainder_number_invalid, $.invalid)),
						),
						seq(
							alias($._number_fraction, $.number),
							optional(alias($._term_remainder_number_invalid, $.invalid)),
						),
						seq(
							$.diceRoll,
							optional($._placeholders),
							optional(alias($._term_remainder_diceRoll_invalid, $.invalid)),
						),
						seq(
							$._groupRoll,
							optional($._placeholders),
							optional(alias($._term_remainder_groupRoll_invalid, $.invalid)),
						),
						seq(
							choice(
								$.rollQuery,
								$._parenthesized,
								$._function,
								$._tableRoll,
							),
							optional(alias($._term_remainder_general_invalid, $.invalid)),
						),
						seq(
							alias($._term_invalid, $.invalid),
						),
					)),
					optional($._macro_and_wsp),
				)),
				prec(1, $._macro_and_wsp),
				seq(
					alias($._term_invalid_and_unrecognized, $.invalid),
					optional($._term_first),
				),
			),
		)),
		
		_term: $ => choice(
			prec(1, seq(
				prec.right(choice(
					seq(
						alias($._number, $.number),	//numbers, attributes, abilities, and inline rolls
						optional(alias($._term_remainder_number_invalid, $.invalid)),
					),
					seq(
						$.diceRoll,
						optional($._placeholders),
						optional(alias($._term_remainder_diceRoll_invalid, $.invalid)),
					),
					seq(
						$._groupRoll,
						optional($._placeholders),
						optional(alias($._term_remainder_groupRoll_invalid, $.invalid)),
					),
					seq(
						choice(
							$.rollQuery,
							$._parenthesized,
							$._function,
							$._tableRoll,
						),
						optional($._placeholders),
						optional(alias($._term_remainder_general_invalid, $.invalid)),
					),
					alias($._term_invalid, $.invalid),
				)),
				optional($._macro_and_wsp),
			)),
			prec(1, $._macro_and_wsp),
			seq(
				alias($._term_invalid_and_unrecognized, $.invalid),
				optional($._term),
			),
		),
		
		_term_invalid: $ => prec.left(choice(
			seq(
				$._groupRoll_invalid,
				repeat(choice(
					$.attribute,
					$.ability,
					$._attribute_empty,
					$._ability_empty,
				)),
				optional($._term_remainder_groupRoll_invalid),
			),
			seq(
				choice(
					$._attribute_invalid,
					$._ability_invalid,
					$._rollQuery_invalid,
					$._inlineRoll_invalid,
					$._parenthesized_invalid,
					$._function_invalid,
					$._tableRoll_invalid,
				),
				repeat(choice(
					$.attribute,
					$.ability,
					$._attribute_empty,
					$._ability_empty,
				)),
				optional($._term_remainder_general_invalid),
			),
		)),
		
		_term_remainder_number_invalid: $ => seq(
			choice(
				/[^#\[%/*+\-})\]dDtT\s\r\n]/,
				$.__ability_start,
				$.__just_d,
				$.__just_t,
				//TODO:
				//just right brace
				//just right paren
				//just right bracket
			),
			optional($._term_remainder_general_invalid_continue),
		),
		_term_remainder_diceRoll_invalid: $ => seq(
			choice(
				/[^#\[/*+\-})\]acdfhklmoprstACDFHKLMOPRST<=>!\d\s\r\n]/,
				//TODO:
				//just right brace
				//just right paren
				//just right bracket
			),
			optional($._term_remainder_general_invalid_continue),
		),
		_term_remainder_groupRoll_invalid: $ => seq(
			choice(
				/[^#\[%/*+\-})\]dfhklDFHKL<=>\d\s\r\n]/,
				$.__ability_start,
				//TODO:
				//just right brace
				//just right paren
				//just right bracket
			),
			optional($._term_remainder_general_invalid_continue),
		),
		_term_remainder_general_invalid: $ => seq(
			choice(
				/[^@%#\[/*+\-})\]\s\r\n]/,
				$.__just_at,
				//TODO:
				//just right brace
				//just right paren
				//just right bracket
			),
			optional($._term_remainder_general_invalid_continue),
		),
		_term_remainder_general_invalid_continue: $ => repeat1(choice(
			/[^@%#\[/*+\-})\]\s\r\n]/,
			$._number,
			$.__just_at,
			//TODO:
			//just right brace
			//just right paren
			//just right bracket
		)),
		
		_term_invalid_and_unrecognized: $ => prec.left(repeat1(
			choice(
				/[^@%#&\[{(/*+\-})\]dDtT\d.\s\r\n]/,
				$.__just_at,
				$.__just_ampersand,
				$.__just_d,
				$.__just_t,
				$.__just_questionmark,
				$.__just_period,
			),
		)),
		
		
		/*┌──────────────────────────────
		  │ Operator
		  └┬─────────────────────────────*/
		 /*│ `+-` and `-+` are evaluated as subtraction.
		   │ 
		   │ The only place a unary negative/positive operator can be is as a
		   │   prefix of a number, attribute, ability, or inline roll that is
		   │   the first element in a formula.
		   └─────────────────────────────*/
		
		_operator: $ => seq(
			optional($._labels_or_wsp),
			choice(
				seq(
					$._operator_summation,
					optional($._operators_invalid_after_valid),
				),
				seq(
					$._operator_multiplication,
					optional(choice(
						seq(
							$._operator_summation,
							optional($._operators_invalid_after_valid),
						),
						$._operators_invalid_after_valid,
					)),
				),
			),
		),
		
		_operator_multiplication: $ => prec.right(seq(
			alias(choice(
				$.__just_slash,
				seq(
					$.__just_asterisk,
					optional($.__just_asterisk),
				),
				$.__just_percent,
			), $.operator),
			optional($._labels_or_wsp),
		)),
		_operator_summation: $ => prec.right(choice(
			seq(
				alias($._operator_plus, $.operator),
				optional($._labels_or_wsp),
				optional($._operators_invalid_after_plus),
			),
			seq(
				alias($._operator_minus, $.operator),
				optional($._labels_or_wsp),
				optional($._operators_invalid_after_minus),
			),
			seq(
				repeat1(seq(
					alias($._operator_plus, $.operator),
					optional($._labels_or_wsp),
					alias($._operator_minus, $.operator),
					optional($._labels_or_wsp),
				)),
				optional(choice(
					seq(
						alias($._operator_plus, $.operator),
						optional($._labels_or_wsp),
						optional($._operators_invalid_after_plus),
					),
					$._operators_invalid_after_minus,
				)),
			),
			seq(
				repeat1(seq(
					alias($._operator_minus, $.operator),
					optional($._labels_or_wsp),
					alias($._operator_plus, $.operator),
					optional($._labels_or_wsp),
				)),
				optional(choice(
					seq(
						alias($._operator_minus, $.operator),
						optional($._labels_or_wsp),
						optional($._operators_invalid_after_minus),
					),
					$._operators_invalid_after_plus,
				)),
			),
		)),
		_operator_plus: $ => choice(
			$.__just_plus,
			$.__operator_positive,
		),
		_operator_minus: $ => choice(
			$.__just_dash,
			$.__operator_negative,
		),
		
		_operators_invalid_before_first_term: $ => prec.right(repeat1(
			prec.right(seq(
				alias(repeat1(choice(
					$.__just_slash,
					$.__just_asterisk,
					$.__just_percent,
					$.__just_plus,
					$.__just_dash,
				)), $.invalid),
				optional($._labels_or_wsp),
			)),
		)),
		
		_operators_invalid_after_valid: $ => prec.right(seq(
			alias(choice(
				$.__just_slash,
				$.__just_asterisk,
				$.__just_percent,
			), $.invalid),
			optional($._labels_or_wsp),
			repeat(seq(
				alias(choice(
					$.__just_slash,
					$.__just_asterisk,
					$.__just_percent,
					$._operator_plus,
					$._operator_minus,
				), $.invalid),
				optional($._labels_or_wsp),
			)),
		)),
		_operators_invalid_after_plus: $ => prec.right(seq(
			alias($._operator_plus, $.invalid),
			optional($._labels_or_wsp),
			repeat(seq(
				alias(choice(
					$.__just_slash,
					$.__just_asterisk,
					$.__just_percent,
					$._operator_plus,
					$._operator_minus,
				), $.invalid),
				optional($._labels_or_wsp),
			)),
		)),
		_operators_invalid_after_minus: $ => prec.right(seq(
			alias($._operator_minus, $.invalid),
			optional($._labels_or_wsp),
			repeat(seq(
				alias(choice(
					$.__just_slash,
					$.__just_asterisk,
					$.__just_percent,
					$._operator_plus,
					$._operator_minus,
				), $.invalid),
				optional($._labels_or_wsp),
			)),
		)),
		
		/*┌──────────────────────────────
		  │ Inline Label
		  └┬─────────────────────────────*/
		 /*│ An inline label:
		   │ • cannot contain new lines or closing square brackets.
		   │ • can include attributes, abilities, and macros.
		   └─────────────────────────────*/
		
		label: $ => seq(
			$._$bracketLeft,
//			optional(name(
			optional(prec.right(repeat1(
				prec(1, choice(
					/[^@%#&\]\r\n]+/,	//new lines are not allowed
					$.attribute,
					$.ability,
					$._macro_and_wsp,
					$.htmlEntity,
					$.__just_at,
					$.__just_percent,
					$.__just_hash,
					$.__just_ampersand,
				))
//			)($)),
			))),
			$._$bracketRight,
		),
		
		_labels_or_wsp: $ => prec.right(1, choice(
			$._wsp_inline,
			$._labels_with_wsp,
		)),
		_labels_with_wsp: $ => prec.right(seq(
			optional($._wsp_inline),
			repeat1(seq(
				$.label,
				optional($._wsp_inline),
			)),
		)),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Parenthesized Formulas and Math Functions
		  ╚╤═══════════════════════════════════════════════════════════*/
		 /*│ A nested formula, wrapped in parentheses, or a math function with a
		   │   formula as its argument.
		   └─────────────────────────────*/
		
		/*┌──────────────────────────────
		  │ Parenthesized Formulas
		  └──────────────────────────────*/
		
		_parenthesized: $ => choice(
			$.parenthesized,
			alias($._parenthesized_unclosed, $.parenthesized),
		),
		_parenthesized_unclosed: $ => seq(
			alias($._$parenLeft, $.invalid),
			$.formula,
			$.__EOF,
		),
		
		parenthesized: $ => seq(
			$._$parenLeft,
			$.formula,
			$._$parenRight,
		),
		
		_parenthesized_invalid: $ => seq(
			$._$parenLeft,
			optional($._wsp_inline),
			choice(
				$._$parenRight,
				$.__EOF,
			),
		),
		
		
		/*┌──────────────────────────────
		  │ Math Functions
		  └──────────────────────────────*/
		
		_function: $ => prec.right(choice(
			$.function,
			alias($._function_unclosed, $.function),
		)),
		_function_unclosed: $ => seq(
			alias($._function_start, $.invalid),
			$.formula,
			$.__EOF,
		),
		
		function: $ => seq(
			$._function_start,
			$.formula,
			$._$parenRight,
		),
		
		_function_start: $ => seq(
			alias(/abs|ceil|floor|round/, $.name),
			$._$parenLeft,
		),
		
		_function_invalid: $ => seq(
			$._function_start,
			optional($._wsp_inline),
			choice(
				$._$parenRight,
				$.__EOF,
			),
		),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Rolls
		  ╚════════════════════════════════════════════════════════════*/
		
		/*┌──────────────────────────────
		  │ Roll Modifiers
		  └┬─────────────────────────────*/
		 /*│ Roll modifiers can be injected with attributes and abilities, but
		   │   this script doesn't allow for those.
		   └─────────────────────────────*/
		
		_integer_or_inlineRoll: $ => choice(
			$.__integer,
			$._inlineRoll,
		),
		
		_modifier_comparison_strict: $ => prec.right(choice(
			seq(
				/[<=>]/,
				choice(
					$._integer_or_inlineRoll,
					$._placeholders,
				),
			),
			seq(
				$._placeholders,
				optional($._integer_or_inlineRoll),
			),
		)),
		_modifier_comparison_lazy: $ => prec.right(choice(
			$._integer_or_inlineRoll,
			$._modifier_comparison_strict,
		)),
		
		_shared_modifier: $ => choice(
			alias($._modifier_countSuccesses, $.successes),
			alias($._modifier_countFailures, $.failures),
			alias($._modifier_keepOrDrop, $.keep_or_drop),
		),
		
		_diceRoll_modifiers: $ => prec(1, repeat1(
			prec.right(1, choice(
				alias($._modifier_critical, $.critical),
				alias($._modifier_exploding, $.exploding),
				alias($._modifier_matches, $.matches),
				$._shared_modifier,
				alias($._modifier_reroll, $.reroll),
				alias($._modifier_sort, $.sort),
				seq(
					$._placeholders,
					optional(choice(
						seq(
							/[ssFF]/,
							$._modifier_comparison_lazy,
						),
						$._integer_or_inlineRoll,
						seq(
							/[<=>]/,
							choice(
								$._integer_or_inlineRoll,
								$._placeholders,
							),
						),
						seq(
							/[!pP]/,
							optional($._modifier_comparison_lazy),
						),
						seq(
							/[tT]/,
							optional($._integer_or_inlineRoll),
							optional($._modifier_comparison_strict),
						),
						seq(
							$._integer_or_inlineRoll,
							optional($._modifier_comparison_strict),
						),
						seq(
							/[hHlL]/,
							choice(
								$._integer_or_inlineRoll,
								$._placeholders,
							),
						),
						seq(
							/[oO]/,
							$._modifier_comparison_lazy
						),
						/[aAdD]/,
					)),
				),
			)),
		)),
		/*_diceRoll_modifiers: $ => repeat1(choice(
			/[aAcCdDfFhHkKlLmMoOpPrRsStT!<=>]/,
			$._number,
		)),*/
		
		_groupRoll_modifiers: $ => prec(1, repeat1(
			prec.right(1, choice(
				$._shared_modifier,
				seq(
					$._placeholders,
					optional(choice(
						$._integer_or_inlineRoll,
						seq(
							/[<=>]/,
							choice(
								$._integer_or_inlineRoll,
								$._placeholders,
							),
						),
						seq(
							/[hHlL]/,
							choice(
								$._integer_or_inlineRoll,
								$._placeholders,
							),
						),
					)),
				),
			)),
		)),
		/*_groupRoll_modifiers: $ => repeat1(choice(
			/[dDfFhHkKlL<=>]/,
			$._number,
		)),*/
		
		_modifier_critical: $ => seq(
			/[cC][sSfF]/,
			$._modifier_comparison_lazy,
		),
		_modifier_countSuccesses: $ => seq(
			$._modifier_comparison_strict,
		),
		_modifier_countFailures: $ => seq(
			/[fF]/,
			$._modifier_comparison_lazy,
		),
		_modifier_exploding: $ => prec.right(seq(
			"!",
			optional(/[!pP]/),
			optional($._modifier_comparison_lazy),
		)),
		_modifier_matches: $ => prec.right(seq(
			/[mM]/,
			optional(/[tT]/),
			optional($._integer_or_inlineRoll),
			optional($._modifier_comparison_strict),
		)),
		_modifier_keepOrDrop: $ => seq(
			/[kKdD]/,
			optional(/[hHlL]/),
			$._integer_or_inlineRoll,
		),
		_modifier_reroll: $ => seq(
			/[rR]/,
			optional(/[oO]/),
			$._modifier_comparison_lazy
		),
		_modifier_sort: $ => seq(
			/[sS]/,
			choice(
				/[aAdD]/,
				$._placeholders,
			),
		),
		
		
		/*┌──────────────────────────────
		  │ Dice Roll
		  └──────────────────────────────*/
		
		diceRoll: $ => prec.right(1, seq(
			//number of dice to roll
			optional(alias($._number, $.count)),
			//keyword (the letter 'd')
			$._$diceRoll,
			//number of sides per die
			alias($._diceRoll_sides, $.sides),
			//modifiers
			optional(alias($._diceRoll_modifiers, $.modifiers)),
			//optional(alias($._diceRoll_modifiers_both, $.modifiers)),
		)),
		_diceRoll_sides: $ => choice(
			$._number,
			alias(/[fF]/, $.fate),
		),
		
		
		/*┌──────────────────────────────
		  │ Table Roll
		  └──────────────────────────────*/
		
		_tableRoll: $ => choice(
			$.tableRoll,
			alias($._tableRoll_unclosed, $.tableRoll),
		),
		_tableRoll_unclosed: $ => seq(
			alias($._$tableRoll, $.invalid),
			$.tableName,
			$.__EOF,
		),
		
		tableRoll: $ => prec.right(seq(
			//number of "dice"
			optional(alias($._number, $.count)),
			//keyword ("t[")
			$._$tableRoll,
			//table name
			$.tableName,
			$._$bracketRight,
		)),
		tableName: $ => prec.right(repeat1(choice(
			/[^@%#\]\r\n]+/,
			$.attribute,
			$.ability,
			$._macro_and_wsp,
			//TODO: make sure these aren't needed:
			//prec(1, "@{"),
			//prec(1, "%{"),
			$.__just_at,
			$.__just_percent,
			$.__just_hash,
//		))($),
		))),
		
		_tableRoll_invalid: $ => seq(
			optional(alias($._number, $.count)),
			$._$tableRoll,
			optional($._wsp_inline),
			choice(
				$._$bracketRight,
				$.__EOF,
			),
		),
		
		
		/*┌──────────────────────────────
		  │ Group Roll
		  └──────────────────────────────*/
		
		_groupRoll: $ => choice(
			$.groupRoll,
			alias($._groupRoll_unclosed, $.groupRoll),
		),
		_groupRoll_unclosed: $ => prec.right(seq(
			alias($._$braceLeft, $.invalid),
			$._groupRoll_content,
			$.__EOF,
		)),
		
		groupRoll: $ => prec.right(seq(
			$._$braceLeft,
			$._groupRoll_content,
			$._$braceRight,
			optional(alias($._groupRoll_modifiers, $.modifiers)),
			//optional(alias($._groupRoll_modifiers_both, $.modifiers)),
		)),
		_groupRoll_content: $ => seq(
			optional(alias($._groupRoll_invalid_commas, $.invalid)),
			$.formula,
			repeat(seq(
				$.__just_comma,
				optional(alias($._groupRoll_invalid_commas, $.invalid)),
				$.formula,
			)),
			optional(alias($._groupRoll_invalid_commas_last, $.invalid)),
		),
		
		_groupRoll_invalid_commas: $ => repeat1(seq(
			optional($._labels_or_wsp),
			$.__just_comma,
		)),
		_groupRoll_invalid_commas_last: $ => prec.right(repeat1(
			prec.right(seq(
				$.__just_comma,
				optional($._labels_or_wsp),
			))
		)),
		
		_groupRoll_invalid: $ => prec.right(seq(
			$._$braceLeft,
			optional(choice(
				seq(
					$._groupRoll_invalid_commas,
					optional($._labels_or_wsp),
				),
				$._labels_or_wsp,
			)),
			choice(
				seq(
					$._$braceRight,
					optional(alias($._groupRoll_modifiers, $.modifiers)),
					//optional(alias($._groupRoll_modifiers_both, $.modifiers)),
				),
				$.__EOF,
			),
		)),
		
		
		/*╔════════════════════════════════════════════════════════════
		  ║ Delimiters
		  ╚════════════════════════════════════════════════════════════*/
		
		_$attributeLeft: $ => alias($._$_attributeLeft, $.delimiter),
		_$_attributeLeft: $ => seq( $.__attribute_start, $.__just_leftBrace ),
		
		_$abilityLeft: $ => alias($._$_abilityLeft, $.delimiter),
		_$_abilityLeft: $ => seq( $.__ability_start, $.__just_leftBrace ),
		
		_$macroHash_safe: $ => alias($.__macro_safe_start, $.delimiter),
		_$macroHash_unsafe: $ => alias($.__macro_unsafe_start, $.macroHash),
		
		
		_$inlineRollStart: $ => alias($.__inlineRoll_start, $.delimiter),
		_$inlineRollEnd: $ => alias($.__inlineRoll_end, $.delimiter),
		
		
		_$rollQueryLeft: $ => alias($.__rollQuery_start, $.delimiter),
		_$rollQueryPipeDefault: $ => alias($.__rollQuery_pipe_hasDefault, $.delimiter),
		_$rollQueryPipeFirstOption: $ => alias($.__rollQuery_pipe_hasOptions, $.delimiter),
		_$comma: $ => alias($.__just_comma, $.delimiter),
		_$rollQueryRight: $ => alias($.__rollQuery_end, $.delimiter),
		
		
		_$diceRoll: $ => alias($.__diceRoll_start, $.delimiter),
		
		_$tableRoll: $ => alias($._$_tableRoll, $.delimiter),
		_$_tableRoll: $ => seq( $.__tableRoll_start, $.__just_leftBracket ),
		
		
		_$pipe: $ => alias($.__just_pipe, $.delimiter),
		_$braceLeft: $ => alias($.__just_leftBrace, $.delimiter),
		_$braceRight: $ => alias($.__just_rightBrace, $.delimiter),
		_$bracketLeft: $ => alias($.__just_leftBracket, $.delimiter),
		_$bracketRight: $ => alias($.__just_rightBracket, $.delimiter),
		_$parenLeft: $ => prec.left(alias($.__just_leftParen, $.delimiter)),
		_$parenRight: $ => alias($.__just_rightParen, $.delimiter),
		
		
	},
});
