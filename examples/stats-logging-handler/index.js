require("colors")
const Actor = require("../../src/actor.js")

const statistician = new Actor(
  "./statistician.js",
  {
    _log,

    stats: reportStats // this is defining both the type of an incoming message and the name of a handler
  }
)

for (let i = 1; i < 20; i++) {
  statistician.post("number", { value: i })
  if (i % 3 == 0)
    statistician.post("report")
}


function reportStats(_actor, { count, sum, average }) {
  console.log(" ", { count, sum, average})
}

function _log(_actor, { name, msg }) {
  const timestamp =  new Date().toLocaleTimeString('en-US', { hour12: false })
  name = name + ":"
  if (name.length < 16)
    name = name.padEnd(16)

  console.info(`  ${timestamp.brightGreen} ${name.magenta} ${msg}`)
}

