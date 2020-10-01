import Director from "../src/director.js"


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

    Director(
      "../test/actor_under_test.js",
      {
        _ready,
        response,
      })

  })
}

Deno.test("an actor can be initialized", async () => {
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

Deno.test("an actor retains state", async () => {
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
