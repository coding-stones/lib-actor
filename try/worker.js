import FIFO from "https://raw.githubusercontent.com/coding-stones/lib-fifo/main/src/index.js";
import PriorityQueue from "https://raw.githubusercontent.com/coding-stones/lib-priority-queue/main/src/index.js";

let me

if (self) {
  me = self
}
else {
  console.log("Running in debug mode")
  me = {
    addEventListener: (_type, _fn) => {},
    postMessage: (msg) => { console.log("postMessage: ", msg) }
  }
}

function afterEachHandler(_me, whatever, _) {
  return whatever
}

function initializeHandler(__me, whatever, _) {
  return whatever
}

function _unknownMessageHandler(_me, _, msg) {
  throw new Error(`actor received unknown message ${JSON.stringify(msg)}`)
}

const DefaultHandlers = {
  _afterEach: afterEachHandler,
  _initialize: initializeHandler,
  _unknownMessage: _unknownMessageHandler,
}

function Worker(messageHandlers) {

  const handlers= Object.assign({}, DefaultHandlers, messageHandlers)
  let state = handlers._initialize(null, null)
  
  me.addEventListener("message", (e) => {
    const msg = e.data
    const handler = handlers[msg.type]
    
    if (handler) {
      state = handler(me, state, msg.payload)
      state = handlers._afterEach(me, state, msg.payload)
    }
    else {
     handlers._unknownMessage(me, state, msg)
    }
  })

  me.postMessage({ type: "_actorRunning", payload: null })
}

// import { Worker }    from "https://deno.land/x/./actor_using_worker.js"

Worker({
  _initialize,
  pickMeUp,
  helicopterAvailable,
  _afterEach
})

// set up the initial state
export function _initialize() {
  return {
    availableChoppers: new FIFO(),
    waitingGuests: new PriorityQueue()
  }
}

// a guest has notified us that they want picking up
export function pickMeUp(caller, state, guest) {
  state.waitingGuests.add(guest, guest.distance)
  return state
}

// We've been told that there's a helicopter available transport a guest
export function helicopterAvailable(caller, state, helicopter) {
  state.availableChoppers.add(helicopter)
  return state
}

// Called automatically after all requests, we 
// 1. Check the state to see if have someone waiting and a helicopter free get
//    get them, and
// 2. Display a little tracing
export function _afterEach(caller, state, _msg)  {
  tryToSchedule(caller, state)
  displayStats(state)
  return state
}


function tryToSchedule(caller, state) {
  if (state.availableChoppers.size() > 0 && state.waitingGuests.size() > 0) {
    const chopper = state.availableChoppers.take()
    const guest   = state.waitingGuests.take()
    caller.postMessage({ 
      type: "dispatchHelicopter",  
      payload: { chopper, guest }
    })
  }
}

function displayStats(state) {
  console.log(`helicopters: ${state.availableChoppers.size()}, guests waiting: ${state.waitingGuests.size()}`)
}
