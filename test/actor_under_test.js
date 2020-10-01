import Actor from "../src/actor.js"

Actor({
  _initialize,
  add,
  multiply,
  _afterHook
})

function _initialize() {
  return {
    result: 0,
    operationCount: 0,
  }
}

function add(_caller, state, number) {
  state.result += number
}

function multiply(_caller, state, number) {
  state.result *= number
}

function _afterHook(caller, state)  {
  state.operationCount++
  console.dir(state)
  caller.postMessage({ type: "response", payload: state })
}

