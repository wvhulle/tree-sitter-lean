-- Test file for no-discard-bind rule

abbrev BankM := ExceptT String (StateM Nat)

def deposit (amount : Nat) : BankM Nat := do
  let s ← get
  set (s + amount)
  pure amount

def withdraw (amount : Nat) : BankM Nat := do
  let s ← get
  if s < amount then
    throw "Insufficient funds"
  else
    set (s - amount)
    pure amount

-- ruleid: no-discard-bind
def example1 : BankM Nat := do
  let _ ← deposit 100
  let s ← get
  pure s

-- ruleid: no-discard-bind
def example2 : BankM Nat := do
  let _ ← deposit 100
  let _ ← withdraw 30
  let s ← get
  pure s

-- ok: no-discard-bind
def example3 : BankM Nat := do
  deposit 100
  withdraw 30
  get

-- ok: no-discard-bind
def example4 : BankM Nat := do
  let amount ← deposit 100
  pure amount
