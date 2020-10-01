// the director side of things interacts with the Actor thread. See
// ../README.md for details

export default function Director(actorPath, messageHandlers) {
  const pathAsURL = new URL(actorPath, import.meta.url).href
  const worker = new Worker(pathAsURL, { type: "module" })
  const handlers = Object.assign({}, DefaultHandlers, messageHandlers)

  worker.addEventListener("message", (m) => {
    const data = m.data
    const handler = handlers[data.type] || handlers["_unknownMessage"]
    handler(worker, data)
  })
  
  worker.onerror = function(e) {
    console.log("ERROR", e)
  }

  worker.onmessageerror = (m) => {
    handlers["_error"](worker, { type: "messageerror", payload: m})
  }
}


const DefaultHandlers = {
  _done: terminateActorHandler,
  _error: errorHandler,
  _actorRunning: initializeWorkerHandler,
  _unknownMessage: unknownMessageHandler,
}

function errorHandler(_actor, msg) {
  throw new Error(`${msg.type}: "${msg.payload}"`)
}

function unknownMessageHandler(_actor, msg) {
  throw new Error(`Unknown message type: "${msg.type}"`)
}

function terminateActorHandler(actor, _msg) {
  actor.terminate()
}

function initializeWorkerHandler(_actor, _msg) {
  ;
}

