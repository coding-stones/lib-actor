
import baretest from "baretest"
import assert from "assert"
import { Runner } from "../src/index.js"

const test = baretest("Actor using worker threads")


// function addChopper(dispatcher, tail) {
//   dispatcher.postMessage({
//     type: "helicopterAvailable",
//     payload: {
//       tailNumber: tail
//     }
//   })
// }

// function addGuestRequest(dispatcher, name, distance) {
//   dispatcher.postMessage({
//     type: "pickMeUp",
//     payload: {
//       name, 
//       distance
//     }
//   })
// }

function runScenario(callbacks) {
  return new Promise(resolve => {
    function _ready(dispatcher) {
      callbacks._ready(dispatcher)
    }

    function response(worker, payload) {
      callbacks.response(scenarioFinished, worker, payload)
    }

    function scenarioFinished(worker) {
      worker.terminate()
      resolve()
    }

    Runner(
      "./test/actor_under_test.js",
      {
        _ready,
        response,
      })

  })
}

test("an actor can be initialized", async () => {
  return runScenario({
    _ready(worker) {
      worker.postMessage({ type: "add", payload: 9 })
    },

    response(done, worker, result) {
      assert.equal(result.operationCount, 1)
      assert.equal(result.result, 9)
      done(worker)
    }
  })
})

test("an actor retains state", async () => {
  let opCount = 0
  const expectedResults = [ 9, 63, 68 ]

  return runScenario({
    _ready(worker) {
      worker.postMessage({ type: "add", payload: 9 })
      worker.postMessage({ type: "multiply", payload: 7 })
      worker.postMessage({ type: "add", payload: 5 })
    },

    response(done, worker, result) {
      const expected = expectedResults[opCount++]
      assert.equal(result.operationCount, opCount)
      assert.equal(result.result, expected)
      if (opCount == 3)
        done(worker)
    }
  })
})

// xt:.,-2gcest('single guest/helicopter, helicopter added first', async () => {
//   return runScenario({
//     _initialize(dispatcher) {
//       addChopper(dispatcher, "budgie")
//       addGuestRequest(dispatcher, "sam", 10)
//     },

//     dispatchHelicopter(done, _worker, { chopper, guest }) {
//       assert.equal(chopper.tailNumber, "budgie")
//       assert.equal(guest.name, "sam")
//       done()
//     }
//   })
// })

// xtest('single guest/helicopter, guest added first', async () => {
//   return runScenario({
//     _initialize(dispatcher) {
//       addGuestRequest(dispatcher, "sam", 10)
//       addChopper(dispatcher, "budgie")
//     },

//     dispatchHelicopter(done, _worker, { chopper, guest }) {
//       assert.equal(chopper.tailNumber, "budgie")
//       assert.equal(guest.name, "sam")
//       done()
//     }
//   })
// })

// xtest('three guests scheduled in distance order', async () => {
//   const guests = [
//     { name: 'number 3', distance: 1 },
//     { name: 'number 1', distance: 50 },
//     { name: 'number 2', distance: 10 },
//   ]

//   let count = 1

//   return runScenario({
//     _initialize(dispatcher) {
//       guests.forEach(({name, distance}) => addGuestRequest(dispatcher, name, distance))
//       addChopper(dispatcher, "budgie")
//     },

//     dispatchHelicopter(done, dispatcher, { chopper, guest }) {
//       assert.equal(chopper.tailNumber, "budgie")
//       assert.equal(guest.name, `number ${count++}`)
//       if (count > guests.length)
//         done()
//       else
//         addChopper(dispatcher, "budgie")
//     }
//   })
// })

// xtest('three guests three choppers scheduled in distance order', async () => {
//   const guests = [
//     { name: 'number 3', distance: 1 },
//     { name: 'number 1', distance: 50 },
//     { name: 'number 2', distance: 10 },
//   ]

//   const choppers = [ "budgie", "chuck", "lionel" ]
//   let count = 1

//   return runScenario({
//     _initialize(dispatcher) {
//       guests.forEach(({name, distance}) => addGuestRequest(dispatcher, name, distance))
//       choppers.forEach(name => addChopper(dispatcher, name))
//     },

//     dispatchHelicopter(done, dispatcher, { chopper, guest }) {
//       assert.equal(chopper.tailNumber, choppers.shift())
//       assert.equal(guest.name, `number ${count++}`)
//       if (count > guests.length)
//         done()
//       else
//         addChopper(dispatcher, chopper.tailNumber)
//     }
//   })
// })


test.run()
