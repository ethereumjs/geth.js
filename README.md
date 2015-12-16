geth.js
=======

[![Build Status](https://travis-ci.org/ethereumjs/geth.js.svg)](https://travis-ci.org/ethereumjs/geth.js)
[![Coverage Status](https://coveralls.io/repos/ethereumjs/geth.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/ethereumjs/geth.js?branch=master)
[![npm version](https://badge.fury.io/js/geth.svg)](https://badge.fury.io/js/geth)

Start and stop [geth](https://github.com/ethereum/go-ethereum) from Node.js.

Usage
-----

```
$ npm install geth
```
To use geth.js, simply require it:
```javascript
var geth = require("geth");
```

### Starting and stopping geth

geth's `start` method accepts a configuration object, which uses the same flags as the geth command line client.  (Here, the flags are organized into an object.)  Flags that are not accompanied by a value on the command line (for example, `--mine`) should be passed in as `{ flag: null }`.
```javascript
var options = {
    networkid: "10101",
    port: 30303,
    rpcport: 8545,
    mine: null
};

geth.start(options, function (err, proc) {
    if (err) return console.error(err);
    // get your geth on!
});
```
The callback's parameter `proc` is the child process, which is also attached to the `geth` object (`geth.proc`) for your convenience.

When you and geth have had enough lively times, `stop` kills the underlying geth process:
```javascript
geth.stop(function () {
    // no more lively times :( 
});
```

### Listeners

The callback for `start` fires after geth has successfully started.  Specifically, it looks for `"IPC service started"` in geth's stderr.  If you want to change the start callback trigger to something else, this can be done by replacing geth's default listeners.  `geth.start` accepts an optional second parameter which should specify the listeners to overwrite, for example:
```javascript
{
    stdout: function (data) {
        process.stdout.write("I got a message!! " + data.toString());
    },
    stderr: function (data) {
        if (data.toString().indexOf("Protocol Versions") > -1) {
            geth.trigger(null, geth.proc);
        }
    },
    close: function (code) {
        console.log("It's game over, man!  Game over!");
    }
}
```
In the above code, `geth.trigger` is the callback passed to `geth.start`.  (This callback is stored so that the startup trigger can be changed if needed.)  These three listeners (`stdout`, `stderr`, and `close`) are the only listeners which can be specified in this parameter, since only these three are set by default in `geth.start`.

If you want to swap out or add other listeners (after the initial startup), you can use the `geth.listen` convenience method:
```javascript
geth.listen("stdout", "data", function (data) { process.stdout.write(data); });
```
This example (re-)sets the "data" listener on stdout by setting `geth.proc.stdout._events.data = function (data) { process.stdout.write(data); }`.

Tests
-----

geth.js's tests use [ethrpc](https://github.com/AugurProject/ethrpc) to send some basic requests to geth.
```
$ npm test
```
