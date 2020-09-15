# Simple Actors using Node Worker Threads

~~~ session
$ ( npm import | yarn add ) https://github.com/coding-stones/lib-actor
~~~

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
