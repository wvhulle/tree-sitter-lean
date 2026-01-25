// Unified precedence constants used across the grammar
module.exports = {
  // Expression precedence (low to high)
  dollar: -5,
  equal: -3,
  compare: -2,
  apply: -1,
  multitype: -1,

  // Low precedence
  min: 10,

  // Operator precedence
  opop: 13,
  or: 14,
  and: 15,
  eqeq: 16,
  plus: 17,
  times: 18,
  power: 20,

  // High precedence
  name: 30,
  unary: 100,

  // Tactic/term precedence
  lead: 1022,
  arg: 1023,
  max: 1024,
}
