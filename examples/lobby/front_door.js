const ActorImpl = require("../../src/actor_impl")

ActorImpl({
  start,
  customerLeaving,
})

// set up the initial state
function start(me, state, { count, rate }) {
  me.name = "Front door"
  startGenerating(me, count, rate)
  state.count = count
  state.processed = 0
  return state
}

function customerLeaving(me, state, { id }) {
  me.log(`customer ${id} leaves the building`)
  state.processed++
  if (state.processed == state.count) {
    me.done("all customers have left the building")
  }
}

function startGenerating(me, count, rate) {
  let n = 1
  const interval = 1/rate * 1000

  function generate() {
    me.log(`customer ${n} enters`)
    me.postTo("Line", "customerEnters", {id: n++})
    if (n <= count) {
      setTimeout(generate, interval)
    }
  }
  generate()

}
