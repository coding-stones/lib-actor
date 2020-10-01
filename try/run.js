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

const DefaultHandlers = {
  _done: terminateActorHandler,
  _error: errorHandler,
  _actorRunning: initializeWorkerHandler,
  _unknownMessage: unknownMessageHandler,
}

function Runner(workerPath, messageHandlers) {
  const pathAsURL = new URL(workerPath, import.meta.url).href
  const worker = new Worker(pathAsURL, { type: "module" })
  const handlers = Object.assign({}, DefaultHandlers, messageHandlers)

  worker.addEventListener("message", (m) => {
    const data = m.data
    const handler = handlers[data.type] || handlers["_unknownMessage"]
    handler(worker, data)
  })
  
  // worker.addEventListener("error", (m) => {
  //   handlers["_error"](worker, { type: "error", payload: JSON.stringify(m)})
  // })

  worker.onerror = function(e) {
    console.log("ERROR", e)
  }

  worker.addEventListener("messageerror", (m) => {
    handlers["_error"](worker, { type: "messageerror", payload: m})
  })
}

const HelicopterCount = 5
const GuestCount      = 100

Runner(
  "./worker.js",
  {
    _actorRunning,
    dispatchHelicopter
  })

function _actorRunning(dispatcher) {
  makeAllHelicoptersAvailable(dispatcher)
  startGuestPickupRequests(dispatcher)
}

function dispatchHelicopter(actor, { payload: { chopper, guest }}) {
  console.log(`Sending ${chopper.tailNumber} to pick up ${guest.name} (distance ${guest.distance})`)
  setTimeout(
    () => { helicopterAvailable(actor, chopper) }, 
    guest.distance*50
  )
}

/////////////  helper

function helicopterAvailable(dispatcher, helicopter) {
  dispatcher.postMessage({ type: "helicopterAvailable", payload: helicopter })
}

////////////   and these two are the "simulation"
function makeAllHelicoptersAvailable(dispatcher) {
  for (let i = 1; i <= HelicopterCount; i++) {
    const helicopter = {
      tailNumber: `NH${i}`
    }
    helicopterAvailable(dispatcher, helicopter)
  }
  console.log("Helicopters now available")
}

function startGuestPickupRequests(dispatcher) {
  console.log("Start guest requests")
  let guestCount = 1

  function guestPickupRequest() {
    const payload = {
      name: `guest ${guestCount}`,
      address: `address ${guestCount}`,
      distance: Math.floor(50*Math.random() + 1)
    }

    dispatcher.postMessage({ type: "pickMeUp", payload: payload })
    if (guestCount++ <= GuestCount)
      setTimeout(guestPickupRequest, 200)
  }

  guestPickupRequest()
}

