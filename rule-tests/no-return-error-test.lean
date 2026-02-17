-- Test file for no-return-error rule

abbrev MyIO := ExceptT String IO

-- ruleid: no-return-error
def bad1 : MyIO Unit := do
  return .error "something went wrong"

-- ruleid: no-return-error  
def bad2 : MyIO Unit := do
  let msg := "error"
  return .error msg

-- ruleid: no-return-error
def bad3 : MyIO Unit := do
  return .error state.errorMsg

-- ok: no-return-error
def good1 : MyIO Unit := do
  throw "error message"

-- ok: no-return-error
def good2 : MyIO Unit := do
  let x := .error "some value"
  return x

-- ok: no-return-error
def good3 : MyIO Unit := do
  let mut x := ()
  x := .error "value"
  return x

-- ok: no-return-error
def good4 : MyIO Unit := do
  let result := Except.error "msg"
  return result

-- ok: no-return-error (no argument case)
def good5 : MyIO Unit := do
  return .error
