import { Worker }    from "../src/index.js"

Worker({
  _initialize,
  add,
  multiply,
  _afterHook
})

// set up the initial state
export function _initialize() {
  return {
    result: 0,
    operationCount: 0,
  }
}

export function add(_caller, state, number) {
  state.result += number
}

export function multiply(_caller, state, number) {
  state.result *= number
}

export function _afterHook(caller, state)  {
  state.operationCount++
  console.dir(state)
  caller.postMessage({ type: "response", payload: state })
}

