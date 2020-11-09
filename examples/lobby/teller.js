const ActorImpl = require("../../src/actor_impl")

ActorImpl({
  start,
  serveCustomer
})

// set up the initial state
function start(me, state, options /* = { id, serviceTime }*/) {
  tellerAvailable(me, options)
  state.id = options.id
  state.serviceTime = options.serviceTime
  return state
}

function serveCustomer(me, state, { id }) {
  me.log(`start serving customer ${id}`)
  setTimeout(() => {
    me.log(`finished with customer ${id}`)
    tellerAvailable(me, state.id)
    me.postTo("Front door", "customerLeaving", { id })
  }, 
  state.serviceTime*1000)
}


// helpers
function tellerAvailable(me, id) {
  me.log(`available`)
  me.postTo("Line", "tellerAvailable", { id })
}
