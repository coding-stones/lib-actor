# Simple Actors using Node Worker Threads

----

~~~ session
$ ( npm import | yarn add ) https://github.com/coding-stones/lib-actor
~~~

----

This is a simple implementation of actors using Web Workers (or Worker Threads in node).

Each actor is an independent worker, with its own state. Actors communicate
by sending messages.

You define a _handler function_ for each message that an actor can receive.
Among other things, that handler function receives the current state and the
message payload. It can chose to return an updated state.

Here's a simple example of an actor that keeps track of the sum and average of
the numbers it receives.

First, the [top-level code](./examples/stats/index.js) that uses the actor:

``` javascript
const Actor = require("../../src/actor.js")

const statistician = new Actor(
  "Statistician",
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
```

Line 3 creates a new actor. The first parameter is the name of the source file
containing its code. This is followed by the actor's name and a map that enumerates the messages we
expect to receive _from_ the actor and the name of the handler function to call
for each. In this case, there's only one message, `stats`, and it is handled by
the function `reportStats`.

We then use the `post()` function to send the numbers 1 through 20 to the agent.
The first parameter to post is the type of the message, and the second is the
message payload.

After every third number, we also send the actor the message `report`, which
tells it to send us the statistics it has gathered so far.

It sends the stats to us in a message of type `stats`, which we will handle in
the `reportStats` function. This function receives the actor that sent us the
message (which we don't need to know) and a payload containing a count, sum, and
average.

Here's the [code for the actor](./examples/stats/statistician.js):

``` javascript
const ActorImpl = require("../../src/actor_impl.js")

ActorImpl({
  _initialize,
  
  number,
  report
})

// set up the initial state
function _initialize() {
  const state = {
    count: 0,
    sum: 0
  }
  return state
}

function number(_me, state, { value: n }) {
  // update and return state
  state.count++
  state.sum += n
  return state
}

function report(me, { sum, count }) {
  const reply = { count, sum }
  if (count > 0)
    reply.average = sum/count
  else
    reply.average = 0

  me.postToDirector("stats", reply)
  // no change of state, so no return value
}
```

Line 3 sets up this module as an actor implementation. Just like the `Actor`
function we used in the top level, the `ActorImpl` function takes a map of
message types and handler functions. Here I've chosen to use the same names for
the message types and the functions (which is what I normally do).

Notice we have a message called `_initialize`. Message types whose names start
`_` are reserved. They are used by the library for managing actor lifecycle
events, along with logging and other housekeeping.

The `_initialize` handler is called before the actor receives any other messages.
Its job is to return the initial state (in this case a count and a sum). If you
don't implement an `initialize` callback, the state is set to an empty object.

All callbacks in an actor (including the `_initialize` callback) are passed four parameters

* a reference to the actor implementation for this actor
* the current state
* the payload of the message that invoked this handler
* additional metadata about the message

The first parameter is an object that keeps track of this particular actor
implementation. Behind the scenes it is handling the receipt and dispatch of
messages. You use this object if you want to send a message from this actor.

For example, in the `report` handler, we call `me.postToDirector()` to send
statistics to the toplevel code that invoked us. (Actor. Director. ...sigh).

A handler function can update the state that it is passed, and should return
that updated state. If it returns nothing, or if the return value is not a
modified version of the original state, the actor's state remains unchanged.

We can run this code in the `examples/stats` directory:

``` session
$ node index.js
{ count: 3, sum: 6, average: 2 }
{ count: 6, sum: 21, average: 3.5 }
{ count: 9, sum: 45, average: 5 }
{ count: 12, sum: 78, average: 6.5 }
{ count: 15, sum: 120, average: 8 }
{ count: 18, sum: 171, average: 9.5 }
```
What we see if the toplevel's `reportStats()` function displaying the messages
it receives from the statistician actor.

### Logging

Because they run as web workers, actors are sandboxed, and have no access to the
console. Instead, they can use `me.log()`. 

Here's an [updated version](./examples/stats-logging/statistician.js) 
of the statistician `number()` function that logs each
number it receives. (Note that we're now using the `me` parameter.)

``` javascript
function number(me, state, { value: n }) {
  state.count++
  state.sum += n
  me.log(`#${state.count} is ${n}`)
  return state
}
```

If we run this (in the `examples/stats-logging` directory), we see the output:

``` session
$ node index.js
Statistician: #1 is 1
Statistician: #2 is 2
Statistician: #3 is 3
{ count: 3, sum: 6, average: 2 }
Statistician: #4 is 4
Statistician: #5 is 5
Statistician: #6 is 6
{ count: 6, sum: 21, average: 3.5 }
Statistician: #7 is 7
   :  :  :
```

When you have lots of actors running, you'll need a way to differentiate log
messages from each. That's one of the uses of the actor's _name_: it appears in every log message.

The `me.log()` function sends a `_log` message
to the toplevel, which by default writes the payload to the console.

However, because it's just a message, you can choose to write a handler for it. 
All you have to know is that the payload
is an object containing `name` and `msg` attributes.

Here's [an example](./examples/stats-logging-handler/index.js).

``` javascript
require("colors")
const Actor = require("../../src/actor.js")

const statistician = new Actor(
  "./statistician.js",
  {
    _log,             // say we're going to handle _log messages
    stats: reportStats 
  }
)

// .. as before

function _log(_actor, { name, msg }) {
  const timestamp =  new Date().toLocaleTimeString('en-US', { hour12: false })
  name = name + ":"
  if (name.length < 16)
    name = name.padEnd(16)

  console.info(`${timestamp.brightGreen} ${name.magenta} ${msg}`)
}
```

Run the code and you'll see:

![Colored log output](https://github.com/coding-stones/lib-actor/blob/main/doc-images/gratuitously_colored_log.png?raw=true)

## Sending Messages Between Actors

Unfortunately, the web worker specification specifies two message passing
mechanisms. One, which we've already used, is between the top-level and the
worker processes (our actors).

To send messages between workers, you need to create a message channel, which
has a port at each end. You then pass a port to one worker, the other port to
the second worker, and then they can chat. These ports are given the name of the
actor at the other end of the channel, so if actor A connects to actor B, then A
will see a port named B (that sends messages to B) and vice versa.


``` javascript
frontDoor.connectTo(lineForTellers)
```

This establishes a bidirectional connection between the actors `frontDoor` and
`lineForTeller` (maybe we're writing a bank lobby simulation).

If the `frontDoor` actor wants to send a new customer to the teller queue, and
the teller queue's name is "Line", it
could use:

~~~ javascript
me.postTo("Line", "customerEntered", { id: custId })
~~~

The `lineForTeller` process would receive the `customerEntered` message.
Included in that message's metadata would be a `_from` attribute, which could be
used to reply.

There's a full example with three interacting actors at the [end of this
README](#user-content-full-example).


### Special Handlers

Actors and the Director may choose to handle internal messages alongside their
application-specific handlers. Here's a list of these messages.

#### Director Messages

* `_done`

  Passed from an actor that calls `me.done()`. The default implementation is
  to terminate the worker that is running the actor. And parameter passed to
  `done()` will appear as the `reason` attribute of `_done` message. 

* `_error`

  This handler is invoked if an error is detected in the Director. The default
  action is to throw an exception.

* `_log`  

  Passed when an actor calls `me.log()`. The payload object contains attributes
  `name` (the actor name) and `msg`. The default behavior writes the name
  and message to the console.


* `_actorRunning`

  Sent when an actor has finished initialising (including getting its name if
  needed). The default handler does nothing.


* `_unknownMessage`

   This handler is invoked when the Director received a message that doesn't
   know about (that is, it isn't an internal system message and it isn't a
   message listed in the `Actor(...)` call. The payload is the entire msg (not
   just its payload). The default behavior throws an exception.

#### Actor Messages

You may choose to override the following message handlers in actor
implementations:

* `_afterEach`

  This handler is called after any message has been handled 
  by its regular handler. The default `_afterEach` handler simply returns
  the state it was passed. However, you can override this to perform 
  things such as state invariant checking, logging, and so on. 

  `_afterEach` is _not_ called if the message type starts with an underscore.

* `_channel`

  Used to pass one end of a message channel to an actor. You don't want to mess
  with this.

* `_initialize`

  Invoked when an actor first starts running. It's purpose it to set up an
  initial state foe the actor, which it must explicitly return.

  The default `_initialize` handler returns `{ }`, an empty object.

* `_unknownMessage`

  Called when the actor receives a message whose type isn't either a build-in
  message or one listed in the `ActorImpl` call. The payload is the message in
  question.

* `_yourNameIs`

  The Director uses this message to tell an actor its name (if the actor doesn't
  already know it). The default behavior simply sets the `name` attribute in the
  `me` object.

If you override any of these handlers, remember to return the state.

### Full Example

This is a simulation of a bank lobby. It uses three types of actor:

1. The `FrontDoor` is a customer generator. In this trivial example, it simply
   creates a new customer every _n_ milliseconds. The customer is passed to the
   `WaitingLine` actor.

2. The `Teller` actor represents the bank teller.

3. The `WaitingLine` actor maintains a single queue of customers who are waiting
   for service, and a separate queue of tellers who are currently idle.
   Whenever the waiting line actor processes a message, it uses the `afterEach`
   handler to see if there are any customers waiting and any tellers available.
   If so, it dispatches the customer to the teller, removing each from their
   respective queues.

When a teller is passed a customer, it waits for a period of time (which
represents the time it takes to process the customer's business), and then posts
a message to the waiting line saying that it is now idle.

The code is in `examples/lobby`. Run it using `node index.js`


#### Main Program (index.js)

``` javascript
const Actor = require("../../src/actor")

const line      = new Actor( "./waiting_line.js", "Line", { _actorRunning: doorsAreOpen })

const tellers   = [1,2,3].map(n => new Actor("./teller.js", `Teller ${n}`))

const frontDoor = new Actor("./front_door.js", "Front door", { done })

frontDoor.connectTo(line)
tellers.forEach(teller => {
  teller.connectTo(line)
  teller.connectTo(frontDoor)
})

tellers.forEach((teller, n) => teller.post("start", {id: n+1, serviceTime: 2 }))

function doorsAreOpen() {
  frontDoor.post("start", {count: 5, rate: 1})
}

function done() {
  console.log("all done")
  tellers.forEach(teller => teller.terminate())
  line.terminate()
  frontDoor.terminate()
}
```

#### front_door.js 

``` javascript
const ActorImpl = require("../../src/actor_impl")

ActorImpl({
  start,
  customerLeaving,
})

// set up the initial state
function start(me, state, { count, rate }) {
  me.name = "Front door"
  startGenerating(me, count, rate)
  state.count = count
  state.processed = 0
  return state
}

function customerLeaving(me, state, { id }) {
  me.log(`customer ${id} leaves the building`)
  state.processed++
  if (state.processed == state.count) {
    me.postToDirector("done")
  }
}

function startGenerating(me, count, rate) {
  let n = 1
  const interval = 1/rate * 1000

  function generate() {
    me.log(`customer ${n} enters`)
    me.postTo("Line", "customerEnters", {id: n++})
    if (n <= count) {
      setTimeout(generate, interval)
    }
  }
  generate()

}
```

#### teller.js 

``` javascript
const ActorImpl = require("../../src/actor_impl")

ActorImpl({
  start,
  serveCustomer
})

// set up the initial state
function start(me, state, options /* = { id, serviceTime }*/) {
  tellerAvailable(me, options)
  state.id = options.id
  state.serviceTime = options.serviceTime
  return state
}

function serveCustomer(me, state, { id }) {
  me.log(`start serving customer ${id}`)
  setTimeout(() => {
    me.log(`finished with customer ${id}`)
    tellerAvailable(me, state.id)
    me.postTo("Front door", "customerLeaving", { id })
  }, 
  state.serviceTime*1000)
}


// helpers
function tellerAvailable(me, id) {
  me.log(`available`)
  me.postTo("Line", "tellerAvailable", { id })
}
```

#### waiting_line.js 

``` javascript
const ActorImpl = require("../../src/actor_impl")

ActorImpl({
  _initialize,
  customerEnters,
  tellerAvailable,
  _afterEach
})

// set up the initial state
function _initialize(me, _defaults, _params) {
  const state = {
    customersInLine: [],
    availableTellers: []
  }
  return state
}

function customerEnters(me, state, { id }) {
  me.log(`customer ${id} enters line`)
  state.customersInLine.push(id)
  return state
}


function tellerAvailable(me, state, msg, { _from }) {
  state.availableTellers.push(_from)
  return state
}

function _afterEach(me, state, _) {
  if (state.customersInLine.length && state.availableTellers.length) {
    const customer = state.customersInLine.shift()
    const teller = state.availableTellers.shift()
    me.log(`sending customer ${customer} to ${teller}`)
    me.postTo(teller, "serveCustomer", {id: customer})
  }
  return state
}
```

### To Do 

[ ] currently only runs in node

### License

See [license.md](./license.md)
