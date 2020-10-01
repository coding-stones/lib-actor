const me: Worker = self as any

type Handler<State> = (state: State, msg: any) => State
type MessageHandlers<State> = Record<string, Handler<State>>

function afterEachHandler<State>(whatever: State, _): State {
  return whatever
}

function initializeHandler<State>(whatever: State, _): State {
  return whatever
}

function _unknownMessageHandler<State>(_: State, msg: any): State {
  throw new Error(`actor received unknown message ${msg}`)
}

const DefaultHandlers = {
  _afterEach: afterEachHandler,
  _initialize: initializeHandler,
  _unknownMessage: _unknownMessageHandler,
}

function Worker<State>(messageHandlers: MessageHandlers<State>) {

  const handlers: MessageHandlers<State> = Object.assign({}, DefaultHandlers, messageHandlers)

  let state = handlers._initialize(null, null)
  
  me.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data
    const handler = handlers[msg.msgType]
    if (handler) {
      state = handler(state, msg.payload)
      state = handlers._afterEach(state, msg.payload)
    }
    else {
     handlers._unknownMessage(state, msg)
    }
  })

  me.postMessage({ type: "_actorRunning", payload: null })
}

import FIFO          from "https://deno.land/x/gh:coding-stones/lib-fifo"
import PriorityQueue from "https://deno.land/x/gh:coding-stones/lib-priority-queue"
// import { Worker }    from "https://deno.land/x/./actor_using_worker.js"

Worker({
  _initialize,
  pickMeUp,
  helicopterAvailable,
  _afterHook
})

// set up the initial state
export function _initialize() {
  return {
    availableChoppers: new FIFO(),
    waitingGuests: new PriorityQueue()
  }
}

// a guest has notified us that they want picking up
export function pickMeUp(_caller, state, guest) {
  state.waitingGuests.add(guest, guest.distance)
}

// We've been told that there's a helicopter available transport a guest
export function helicopterAvailable(_caller, state, helicopter) {
  state.availableChoppers.add(helicopter)
}

// Called automatically after all requests, we 
// 1. Check the state to see if have someone waiting and a helicopter free get
//    get them, and
// 2. Display a little tracing
export function _afterHook(caller, state)  {
  tryToSchedule(caller, state)
  displayStats(state)
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
