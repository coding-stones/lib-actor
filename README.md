# Simple Actors using Node Worker Threads

~~~ session
$ ( npm import | yarn add ) https://github.com/coding-stones/lib-actor
~~~

This is a simple implementation of actors using Web Workers (or Worker Threads in node).

Each actor is an independent work, with its own state. You communicate with them
by sending messages.

In addition, the actor system adds a series of predefined messages that define
housekeeping behaviors.

You define a _handler function_ for each message that an actor can receive.
Among other things, that handler function receives the current state and the
message payload. It can chose to return an updated state.

Here's a simple example of an actor that keeps track of the sum and average of
the numbers it receives.

First, the top-level code that uses the actor:

~~~ javascript
~~~



The `Actor` function is used in the source file of an actor
module. It does two main things:

1. It handles the protocol with the `Director` module
2. It dispatches messagges received from the director to
   the appropriate handler function.
  
Messages between the director and actor all have the format:

    {
       type:  string,    
       payload: any
    }

The `type` attribute identifies the handler that is used to process
the message, and the payload is an opaque blog passed to that handler.

The mapping of message types to handler functions is specified 
by the `messageHandlers` parameter. It's a map from message types to 
functions.

Handler functions all take three parameters:

* the object representing this actor. Using this, the handler
   can terminate the actor or post a message to the this actor's 
   director.

* the current state (see below)

* the payload from the received message

All handlers functions *must* return the (potentially updated) state.

### Special Handlers

You define handlers for each of the message types to pass to the Actor. In
addition, every actor has a small set of predefined message types and
handlers. The names of these all start with an underscore.

`_afterEach` is a handler called after any message has been handled 
 by its regular handler. The default `_afterEach` handler simply returns
 the state it was passed. However, you can override this to perform 
 things such as state invariant checking, logging, and so on. 

`_initialize` is invoked once, when the actor first starts and before
any messages are processed. Override this to provide the initial state for
the actor.

`_unknownMessage` is invoked if the actor is sent a message whose
type is not listed in `messagehandlers`. It's default behavior 
is to throw an exception.

If you override any of these handlers, remember to return the state.

## State

Each instance of an actor has it's own state. The state is passed to message
handlers (along with the message payload), and is updated using the return
value of the function.

The initial state is set using the special handler `_initialize`.

@param {Record<name, handler>} messageHandlers - map of msgs to handlers
 */


In the thread that uses the workers:

~~~ javascript
import { Runner } from "lib-actor"

Runner(
  "./worker.js",   // name of file containing worker code

  {
    // lifecycle callbacks:
    _ready,

    // callbacks invoked when worked sends us a message:
    total
  }
)

function _ready(worker) {
  worker.postMessage({ type: add, payload: 2 })
  worker.postMessage({ type: add, payload: 3 })
}

function total(sum) {
  console.dir(`new total is ${sum}`)
}
~~~

The source file `worker.js`:

~~~ javascript

import { Worker } from "lib-actor"

Worker({
  _initialize,
  add,
  _afterHook
})

// set up the initial state
export function _initialize() {
  return {
    result: 0,
  }
}

export function add(_caller, state, number) {
  state.result += number
}

export function _afterHook(caller, state)  {
  caller.postMessage({ type: "total", payload: state.result })
}

~~~


### Context

This code is part of the Coding Stones _Level Up_ course, and is written 
as a simple illustration. It is not indended to be used in other projects.

### License

See [license.md](./license.md)`
