// This little stanza handles the fact that web workers have
// `self` set to the worker instance during execution of the module
//
// This code lets us run the worker code directly by setting `me` to 
// a mock worker is `self` isn't set.

// let me

// if (self.postMessage) {
//   console.log("actor is", self.postMessage)
//   me = self
// }
// else {
//   console.log("Running in debug mode")
//   me = {
//     addEventListener: (_type, _fn) => {},
//     postMessage: (msg) => { console.log("postMessage: ", msg) }
//   }
// }

// Are we running in node.js?

let WW

if (typeof fs) {  // ---------------------------------------------------------- NODE 
  const { parentPort, isMainThread } = require("worker_threads")
  if (isMainThread)
    throw new Error("This is worker code, but it is not running in a worker")

  WW = class NodeWorker {

    constructor() {
      this.name = ""
      this._channels = {}
    }

    onMessage(callback) {
      this.onMessageCallback = callback
      parentPort.on("message", callback)
    }

    postToDirector(type, payload) {
      parentPort.postMessage({ _type: type, _from: null, payload })
    }

    postTo(name, type, payload) {
      this.log(`post to ${name}: ${type}`)
      const channel = this._channels[name]
      if (!channel) {
        throw new Error("Unknown channel name: " + name)
      }
      this.log(JSON.stringify({ _type: type, _from: name, payload }))
      channel.postMessage({ _type: type, _from: name, payload })
    }

    addChannel(port, name) {
      this.log(`added channel ${name}`)
      this._channels[name] = port
      port.on("message", this.onMessageCallback)
    }

    log(msg) {
      this.postToDirector("_log", { name: this.name, msg: msg })
    }
  }
}
else {
  throw new Error("Unknown run time environment")
}
///////////////////////// entry point ////////////////////////////

module.exports = function ActorImpl(messageHandlers) {

  const me = new WW()

  const handlers= { ...DefaultHandlers,  ...messageHandlers }
  let state = handlers._initialize(me, null)

  // We use this field to verify that handlers remember to return
  // state. If they don't we leave the old state unchanged
  
  const StateSecret = Symbol("valid-state")
  state.__secret = StateSecret

  function maybeUpdate(state, newState) {
    if (newState && newState["__secret"] == StateSecret)
      return newState
    else
      return state
  }

  me.onMessage((e) => {
    const msg = e["data"] ? e.data : e // handle node and ws
    const handler = handlers[msg._type]
    
    if (handler) {
      state = maybeUpdate(state, handler(me, state, msg.payload, msg))

      if (!msg._type.startsWith("_")) {
        state = maybeUpdate(state, handlers._afterEach(me, state, msg.payload, msg))
      }
    }
    else {
     handlers._unknownMessage(me, state, msg)
    }
  })

  if (me.name)
    me.postToDirector("_actorRunning", { payload: null })
  else 
    me.postToDirector("_actorWantsName", { payload: null })

  return me
}

const DefaultHandlers = {
  _afterEach: afterEachHandler,
  _channel:    channelConnectionHandler,
  _initialize: initializeHandler,
  _unknownMessage: _unknownMessageHandler,
  _yourNameIs:  setMyName,
}

function afterEachHandler(_me, whatever, _) {
  return whatever
}

function channelConnectionHandler(me, state, { port, name }) {
  me.addChannel(port, name)
  return state
}

function setMyName(me, state, name) {
  me.name = name
  me.postToDirector("_actorRunning", { payload: null })
  return state
}

function initializeHandler(__me, _whatever, _) {
  return {}
}

function _unknownMessageHandler(me, _, msg) {
  throw new Error(`${me.name} received unknown message ${JSON.stringify(msg)}`)
}


