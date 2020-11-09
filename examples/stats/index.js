const Actor = require("../../src/actor.js")

const statistician = new Actor(
  "./statistician.js",
  {
    stats: reportStats // this is defining both the type of an incoming message and the name of a handler
  }
)

for (let i = 1; i < 20; i++) {
  statistician.post("number", { value: i })
  if (i % 3 == 0)
    statistician.post("report")
}


function reportStats(_actor, { count, sum, average }) {
  console.log({ count, sum, average})
}


