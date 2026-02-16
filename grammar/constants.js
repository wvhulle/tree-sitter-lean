module.exports = {
  // Expression-level precedence (low to high)
  dollar: -5,
  equal: -3,
  compare: -2,
  apply: -1,

  // Operator precedence
  min: 10,
  opop: 13,
  or: 14,
  and: 15,
  eqeq: 16,
  plus: 17,
  times: 18,
  power: 20,
  name: 30,
  unary: 1000,

  // Tactic/term precedence
  lead: 1022,
  arg: 1023,
  max: 1024,
}
