const Actor = require("../../src/actor")

const line      = new Actor( "./waiting_line.js", "Line", { _actorRunning: doorsAreOpen })

const tellers   = [1,2,3].map(n => new Actor("./teller.js", `Teller ${n}`))

const frontDoor = new Actor("./front_door.js", "Front door", { _done })

frontDoor.connectTo(line)
tellers.forEach(teller => {
  teller.connectTo(line)
  teller.connectTo(frontDoor)
})

tellers.forEach((teller, n) => teller.post("start", {id: n+1, serviceTime: 2 }))

function doorsAreOpen() {
  frontDoor.post("start", {count: 5, rate: 1})
}

function _done() {
  console.log("all done")
  tellers.forEach(teller => teller.terminate())
  line.terminate()
  frontDoor.terminate()
}
