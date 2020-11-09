const ActorImpl = require("../../src/actor_impl.js")

ActorImpl({
  _initialize,
  
  number,
  report
})

// set up the initial state
function _initialize() {
  const state = {
    count: 0,
    sum: 0
  }
  return state
}

function number(_me, state, { value: n }) {
  // update and return state
  state.count++
  state.sum += n
  return state
}

function report(me, { sum, count }) {
  const reply = { count, sum }
  if (count > 0)
    reply.average = sum/count
  else
    reply.average = 0

  me.postToDirector("stats", reply)
  // no change of state, so no return value
}
