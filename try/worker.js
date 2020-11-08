const Actor = require("../src/actor")

class FIFO {

  constructor() {
    this.queue = []
  }

  add(item) {
    this.queue.push(item)
  }

  take() {
    return this.queue.shift()
  }

  size() {
    return this.queue.length
  }
}

const byPriority = (a, b) => a.priority - b.priority

class PriorityQueue{

  constructor() {
    this.queue = []
  }

  add(item, priority) {
    this.queue.push({ item, priority })
  }

  take() {
    this.queue.sort(byPriority)
    const result = this.queue.pop()
    return result && result.item
  }

  size() {
    return this.queue.length
  }
}


Actor({
  _initialize,
  pickMeUp,
  helicopterAvailable,
  _afterEach
})

// set up the initial state
function _initialize() {
  return {
    availableChoppers: new FIFO(),
    waitingGuests: new PriorityQueue()
  }
}

// a guest has notified us that they want picking up
function pickMeUp(caller, state, guest) {
  state.waitingGuests.add(guest, guest.distance)
  return state
}

// We've been told that there's a helicopter available transport a guest
function helicopterAvailable(caller, state, helicopter) {
  state.availableChoppers.add(helicopter)
  return state
}

// Called automatically after all requests, we 
// 1. Check the state to see if have someone waiting and a helicopter free get
//    get them, and
// 2. Display a little tracing
function _afterEach(caller, state, _msg)  {
  tryToSchedule(caller, state)
  displayStats(state)
  return state
}


function tryToSchedule(caller, state) {
  if (state.availableChoppers.size() > 0 && state.waitingGuests.size() > 0) {
    const chopper = state.availableChoppers.take()
    const guest   = state.waitingGuests.take()
    caller.post({ 
      type: "dispatchHelicopter",  
      payload: { chopper, guest }
    })
  }
}

function displayStats(state) {
  console.log(`helicopters: ${state.availableChoppers.size()}, guests waiting: ${state.waitingGuests.size()}`)
}
