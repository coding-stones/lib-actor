const ActorImpl = require("../../src/actor_impl")

ActorImpl({
  _initialize,
  customerEnters,
  tellerAvailable,
  _afterEach
})

// set up the initial state
function _initialize(me, _defaults, _params) {
  const state = {
    customersInLine: [],
    availableTellers: []
  }
  return state
}

function customerEnters(me, state, { id }) {
  me.log(`customer ${id} enters line`)
  state.customersInLine.push(id)
  return state
}


function tellerAvailable(me, state, msg, { _from }) {
  state.availableTellers.push(_from)
  return state
}

function _afterEach(me, state, _) {
  if (state.customersInLine.length && state.availableTellers.length) {
    const customer = state.customersInLine.shift()
    const teller = state.availableTellers.shift()
    me.log(`sending customer ${customer} to ${teller}`)
    me.postTo(teller, "serveCustomer", {id: customer})
  }
  return state
}
