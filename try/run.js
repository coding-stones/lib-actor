const Director = require("../src/director")

const HelicopterCount = 5
const GuestCount      = 100

Director(
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

