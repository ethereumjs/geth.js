geth.js
=======

[![Build Status](https://travis-ci.org/tinybike/geth.js.svg)](https://travis-ci.org/tinybike/geth.js)
[![Coverage Status](https://coveralls.io/repos/tinybike/geth.js/badge.svg?branch=master&service=github)](https://coveralls.io/github/tinybike/geth.js?branch=master)
[![npm version](https://badge.fury.io/js/geth.svg)](https://badge.fury.io/js/geth)

A simple tool to start/stop [geth](https://github.com/ethereum/go-ethereum) from Node.js.

Usage
-----

```
$ npm install geth
```
To use geth.js, simply require it:
```javascript
var geth = require("geth");
```
Configure `geth`.  It accepts the same flags as the geth command line client; here they are organized into an object.  Flags that are not accompanied by a value on the command line (for example, `--mine`) should be passed in as `{ flag: null }`.
```javascript
geth.configure({
    networkid: "10101",
    port: 30303,
    rpcport: 8545,
    mine: null
});
```
geth is all configurated and ready-to-go.
```javascript
geth.start(function (err, proc) {
    if (err) return console.error(err);
    // get your geth on!
});
```
The callback for `start` fires after geth has successfully started.  Its parameter `proc` is the child process, which is also attached to the `geth` object (`geth.proc`) for your convenience.

When you and geth have had enough lively times, `stop` kills the underlying geth process:
```javascript
geth.stop(function () {
    console.log("no more lively times :(");
});
```

Tests
-----

geth.js's tests use [ethrpc](https://github.com/AugurProject/ethrpc) to send some basic requests to geth.
```
$ npm test
```
