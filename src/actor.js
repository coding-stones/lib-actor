// This little stanza handles the fact that web workers have
// `self` set to the worker instance during execution of the module
//
// This code lets us run the worker code directly by setting `me` to 
// a mock worker is `self` isn't set.

let me

if (self.postMessage) {
  console.log("actor is", self.postMessage)
  me = self
}
else {
  console.log("Running in debug mode")
  me = {
    addEventListener: (_type, _fn) => {},
    postMessage: (msg) => { console.log("postMessage: ", msg) }
  }
}

///////////////////////// entry point ////////////////////////////

/**
 * The `Actor` function is used in the source file of an actor
 * module. It does two main things:
 *
 * 1. It handles the protocol with the `Director` module
 * 2. It dispatches messagges received from the director to
 *    the appropriate handler function.
 *   
 * Messages between the director and actor all have the format:
 *
 *     {
 *        type:  string,    
 *        payload: any
 *     }
 *
 * The `type` attribute identifies the handler that is used to process
 * the message, and the payload is an opaque blog passed to that handler.
 *
 * The mapping of message types to handler functions is specified 
 * by the `messageHandlers` parameter. It's a map from message types to 
 * functions.
 *
 * Handler functions all take three parameters:
 *
 * * the object representing this actor. Using this, the handler
 *    can terminate the actor or post a message to the this actor's 
 *    director.
 *
 * * the current state (see below)
 *
 * * the payload from the received message
 *
 * All handlers functions *must* return the (potentially updated) state.
 *
 * ### Special Handlers
 *
 * You define handlers for each of the message types to pass to the Actor. In
 * addition, every actor has a small set of predefined message types and
 * handlers. The names of these all start with an underscore.
 *
 * `_afterEach` is a handler called after any message has been handled 
 *  by its regular handler. The default `_afterEach` handler simply returns
 *  the state it was passed. However, you can override this to perform 
 *  things such as state invariant checking, logging, and so on. 
 *
 * `_initialize` is invoked once, when the actor first starts and before
 * and messages are processed. Override this to provide the initial state for
 * the actor.
 *
 * `_unknownMessage` is invoked if the actor is sent a message whose
 * type is not listed in `messagehandlers`. It's default behavior 
 * is to throw an exception.
 *
 * If you override any of these handlers, remember to return the state.
 *
 * ## State
 *
 * Each instance of an actor has it's own state. The state is passed to message
 * handlers (along with the message payload), and is updated using the return
 * value of the function.
 *
 * The initial state is set using the special handler `_initialize`.
 *
 * @param {Record<name, handler>} messageHandlers - map of msgs to handlers
 */

export default function Actor(messageHandlers) {

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

const DefaultHandlers = {
  _afterEach: afterEachHandler,
  _initialize: initializeHandler,
  _unknownMessage: _unknownMessageHandler,
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


