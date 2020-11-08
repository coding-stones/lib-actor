// the director side of things interacts with the Actor thread. See
// ../README.md for details

let WorkerWrapper

if (typeof fs) {  // ---------------------------------------------------------- NODE 
  const { Worker, isMainThread, MessageChannel } = require("worker_threads")
  if (!isMainThread)
    throw new Error("You can't run the director in a worker thread")

  WorkerWrapper = class WorkerWrapper {
    constructor(path) {
      this.worker = new Worker(path)
    }

    connectTo(otherWorker, connectionName) {
      const channel = new MessageChannel()
      this.post("_channel", { port: channel.port1, name: connectionName }, [channel.port1])
      otherWorker.post("_channel", { port: channel.port2, name: connectionName }, [channel.port2])
    }

    post(type, payload, transfer) {
      this.worker.postMessage({ _type: type, _from: null, type, payload }, transfer)
    }

    onError(cb) {
      this.worker.on("error", cb)
    }

    onMessageError(cb) {
      this.worker.on("messageerror", cb)
    }

    onMessage(cb) {
      this.worker.on("message", cb)
    }

    terminate() {
      this.worker.terminate()
    }

    // unhandled:  `online`
  }
}
else {
  WorkerWrapper = class WorkerWrapper {
    constructor(path) {
      const pathAsURL = path //new URL(path, import.meta.url).href
      this.worker = new Worker(pathAsURL, { type: "module" })
    }

    postMessage(msg) {
      this.worker.postMessage(msg)
    }

    onError(cb) {
      this.worker.onerror = cb
    }

    onMessageError(cb) {
      this.worker.onmessageerror = cb
    }

    onMessage(cb) {
      this.worker.onmessage = cb
    }

    terminate() {
      this.worker.terminate()
    }
  }
  throw new Error("Unknown run time environment")
}

module.exports = class Actor extends WorkerWrapper {

  constructor(actorPath, messageHandlers) {
    super(actorPath)
    const handlers = { ...DefaultHandlers, ...messageHandlers }

    this.name = actorPath.replace(/\.\w+$/, "").replace(/^.*\//, "").replace(/_/g, " ")

    this.onMessage((m) => {
      const data = (m["data"] ? m.data : m) // handle both node and WS
      let handler = handlers[data._type]
      if (!handler && data._type) {
        console.error(`No handler available for message type ${data._type}`)
        handler = unknownMessageHandler
      }
      handler(this, data.payload)
    })

    this.onError(function(e) {
      console.log("ERROR", e)
    })

    this.onMessageError((m) => {
      handlers["_error"](this, { type: "messageerror", payload: m})
    })
  }
}


const DefaultHandlers = {
  _done: terminateActorHandler,
  _error: errorHandler,
  _actorWantsName: giveActorName,
  _actorRunning: initializeWorkerHandler,
  _log: logMessageHandler,
  _unknownMessage: unknownMessageHandler,
}

function errorHandler(_actor, msg) {
  throw new Error(`${msg.type}: "${msg.payload}"`)
}

function giveActorName(actor, _msg) {
  actor.post("_yourNameIs", actor.name)
}

function logMessageHandler(_actor, { name, msg }) {
  console.log(`${name}: ${msg}`)
}

function unknownMessageHandler(_actor, msg) {
  throw new Error(`Unknown message: "${JSON.stringify(msg)}"`)
}

function terminateActorHandler(actor, _msg) {
  actor.terminate()
}

function initializeWorkerHandler(_actor, _msg) {
  ;
}

