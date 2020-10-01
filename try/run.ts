type Actor = Worker
type ActorMessage<Payload> = {
  msgType: string
  payload: Payload
}

type HandlerFunction<Payload> = (actor: Actor, msg: ActorMessage<Payload>) => void
type HandlerMap<Payload> = Record<string, HandlerFunction<Payload>>


function errorHandler<Payload>(_actor: Actor, msg: ActorMessage<Payload>): void {
  throw new Error(`${msg.msgType}: "${msg.payload}"`)
}

function unknownMessageHandler<Payload>(_actor: Actor, msg: ActorMessage<Payload>): void {
  throw new Error(`Unknown message type: "${msg.msgType}"`)
}

function terminateActorHandler<Payload>(actor: Actor, _msg: ActorMessage<Payload>): void {
  actor.terminate()
}

function initializeWorkerHandler<Payload>(_actor: Actor, _msg: ActorMessage<Payload>): void {
  ;
}

const DefaultHandlers = {
  _done: terminateActorHandler,
  _error: errorHandler,
  _actorRunning: initializeWorkerHandler,
  _unknownMessage: unknownMessageHandler,
}

function Runner<Payload>(workerPath: string, messageHandlers: HandlerMap<Payload>) {
  const pathAsURL = new URL(workerPath, import.meta.url).href
  const worker = new Worker(pathAsURL, { type: "module" })
  const handlers: HandlerMap<Payload> = Object.assign({}, DefaultHandlers, messageHandlers)

  worker.addEventListener("message", (m: Event) => {
    console.dir(m)
    const data = m.data
    const handler = handlers[data.msgType] || handlers["_unknownMessage"]
    handler(worker, data)
  })
  
  worker.addEventListener("error", (m) => {
    handlers["_error"](worker, { msgType: "error", payload: m})
  })

  worker.addEventListener("messageerror", (m) => {
    handlers["_error"](worker, { msgType: "messageerror", payload: m})
  })
}

const HelicopterCount = 5
const GuestCount      = 100

Runner(
  "./dispatcher.js",
  {
    _actorRunning,
    dispatchHelicopter
  })

function _actorRunning(dispatcher: Actor) {
  makeAllHelicoptersAvailable(dispatcher)
  startGuestPickupRequests(dispatcher)
}

function dispatchHelicopter(actor: Actor, { payload: { chopper, guest }}) {
  console.log(`Sending ${chopper.tailNumber} to pick up ${guest.name} (distance ${guest.distance})`)
  setTimeout(
    () => { helicopterAvailable(actor, chopper) }, 
    guest.distance*50
  )
}

/////////////  helper

function helicopterAvailable(dispatcher: Actor, helicopter) {
  dispatcher.postMessage({ type: "helicopterAvailable", payload: helicopter })
}

////////////   and these two are the "simulation"
function makeAllHelicoptersAvailable(dispatcher: Actor) {
  for (let i = 1; i <= HelicopterCount; i++) {
    const helicopter = {
      tailNumber: `NH${i}`
    }
    helicopterAvailable(dispatcher, helicopter)
  }
  console.log("Helicopters now available")
}

function startGuestPickupRequests(dispatcher: Actor) {
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

