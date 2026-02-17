const min1 = (one, two) => choice(seq(one, optional(two)), seq(optional(one), two))
const sep1 = (rule, separator) => seq(rule, repeat(seq(separator, rule)))
const sep0 = (rule, separator) => optional(sep1(rule, separator))
const sep1_ = (rule, separator) => seq(sep1(rule, separator), optional(separator))

class Parser {
  constructor(rules_fn) {
    this.rules_fn = rules_fn
  }

  all($) {
    return choice(...this.rules_fn($));
  }

  forbid($, ...disallow) {
    const seen = new Set(disallow);
    const rules = this.rules_fn($)
    const filtered = rules.filter(rule => !seen.delete(rule.name));
    if (seen.size > 0) {
      throw `Disallowed rules that weren't present:\n\
       ${disallow.toString()}\n\
       ${rules.map(rule => rule.name).toString()}`;
    }
    return choice(...filtered);
  }
}

module.exports = {
  Parser,
  min1,
  sep0,
  sep1,
  sep1_,
}
