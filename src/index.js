import{ Worker as NodeWorker } from 'worker_threads'

// The default handler for the `Runner.initialize` and `Runner.error` callbacks`

function defaultErrorHandler(error) {
  console.log("Error", error)
  process.exit(1)
}
function defaultAgentReady(_worker) {
  console.log("worker running")
}


// Create a new actor, implemented usinf a Node workwer thread.
// `handlers` is an object whose attributes are the names of messages
// that are generated by the worker, and whose values are functions
// that process those messages.
//
// Two special messages are generated automatically:
//
// `_ready` is generated when the worker thread is running and ready to receive requests.
//
// `_error_` is generated if an error is detected.

export function Runner(workerPath, handlers) {

  let worker = new NodeWorker(workerPath, { type: "module"})

  worker.on("error", (e) => {
    (handlers._error || defaultErrorHandler)(e)
  })

  worker.on("online", () => {
    (handlers._ready || defaultAgentReady)(worker)
  })

  worker.on("message", (message) => {
    const type = message.type
    if (type in handlers)
      handlers[type](worker, message.payload)
    else
      throw Error(`Runner doesn't recognize messaage type "${type}"`)
  })
}


// Default callback used by the actor to get its initial state. Override
// the `_initialize` handler to set up your own.
function localInitialize() {
  return {}
}

// The actor itself. It takes a set of message names/functions, which are invoked when
// the main thread sends this worker a message
//
// There are two pseudo messages that you can handle, `_initialize`, which is used to return
// the initial state, and `_afterHook`, which is called after any message from the main thread has been processed. 
// This might be used, for example, to trigger actions based on updated state.

export function Worker(handlers) {
  Promise.resolve()
    .then(async () => {

      const workerThread = await import('worker_threads')
      const caller = workerThread.parentPort

      if (!caller) {
        console.warn("Actor is not running in a worker. Running in test mode")
        return
      }


      const state = (handlers._initialize || localInitialize)()

      caller.on("message", (request) => {
        const type = request.type
        if (type in handlers) {
          handlers[type](caller, state, request.payload)
        }
        else {
          throw Error(`Worker can't handle message of type "${type}`)
        }

        if ("_afterHook" in handlers)
          handlers._afterHook(caller, state)
      })
    })
}

