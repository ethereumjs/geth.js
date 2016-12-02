/**
 * Start and stop geth from Node.js.
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var fs = require("fs");
var join = require("path").join;
var cp = require("child_process");

function copy(obj) {
    if (null === obj || "object" !== typeof obj) return obj;
    var cc = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) cc[attr] = obj[attr];
    }
    return cc;
}

var noop = function () {};

module.exports = {

    debug: false,

    proc: null,

    flags: null,

    options: null,

    datadir: null,

    network: null,

    bin: null,

    configured: false,

    persist: false,

    configure: function (options) {
        this.bin = options.geth_bin || "geth";
        this.persist = options.persist || false;
        var f = copy(options.flags || options);
        this.network = f.networkid;
        f.datadir = f.datadir || join(process.env.HOME, ".ethereum-" + f.networkid);
        if (options.symlink) {
            if (fs.existsSync(options.symlink)) fs.unlinkSync(options.symlink);
            fs.symlinkSync(f.datadir, options.symlink);
            f.datadir = options.symlink;
        }
        this.datadir = f.datadir;
        this.flags = [];
        var rpc = false;
        var rpcport = false;
        var rpcapi = false;
        var ws = false;
        var wsport = false;
        var wsapi = false;
        var unlock = false;
        var password = false;
        if (options.account) {
            this.flags = this.flags.concat([
                "--etherbase", options.account,
                "--unlock", options.account,
                "--password", join(this.datadir, ".password")
            ]);
            unlock = true;
            password = true;
        }
        if (f && f.constructor === Object) {
            for (var flag in f) {
                if (!f.hasOwnProperty(flag)) continue;
                this.flags.push("--" + flag);
                if (f[flag]) {
                    if (f[flag].constructor === Array) {
                        this.flags.push(f[flag].join(' '));
                    } else {
                        this.flags.push(f[flag]);
                    }
                }
                if (flag === "rpc") rpc = true;
                if (flag === "rpcport") rpcport = true;
                if (flag === "rpcapi") rpcapi = true;
                if (flag === "ws") ws = true;
                if (flag === "wsport") wsport = true;
                if (flag === "wsapi") wsapi = true;
                if (flag === "unlock") unlock = true;
                if (flag === "password") password = true;
            }
        }
        if ((rpcport || rpcapi) && !rpc) this.flags.push("--rpc");
        if ((wsport || wsapi) && !ws) this.flags.push("--ws");
        if (unlock && !password) {
            this.flags = this.flags.concat([
                "--password", join(this.datadir, ".password")
            ]);
        }
        this.configured = true;
        return this.flags;
    },

    listen: function (stream, label, listener) {
        if (label && label.constructor === Function && !listener) {
            listener = label;
            label = null;
        }
        label = label || "data";
        listener = listener || noop;
        if (this.proc !== null) {
            this.proc[stream]._events[label] = listener;
        }
    },

    stdout: function (label, listener) {
        this.listen("stdout", label, listener);
    },

    stderr: function (label, listener) {
        this.listen("stderr", label, listener);
    },

    trigger: noop,

    start: function (flags, listeners, trigger) {
        var self = this;
        if (this.configured) {
            if (listeners && listeners.constructor === Function && !trigger) {
                trigger = listeners;
                listeners = null;
            }
            if (flags && flags.constructor === Function && !listeners) {
                trigger = flags;
                flags = this.flags;
            }
            listeners = listeners || {};
            this.trigger = trigger || noop;
            if (!this.persist && !process._events.exit) {
                process.on("exit", function () {
                    if (self.proc !== null) self.stop();
                });
            }
            if (!listeners.stdout) {
                listeners.stdout = function (data) {
                    if (self.debug) process.stdout.write(data);
                };
            }
            if (!listeners.stderr) {
                listeners.stderr = function (data) {
                    if (self.debug) process.stdout.write(data);
                    if (data.toString().indexOf("HTTP endpoint opened") > -1) {
                        self.trigger(null, self.proc);
                    }
                };
            }
            if (!listeners.close) {
                listeners.close = function (code) {
                    if (code !== 2 && code !== 0) {
                        self.trigger(new Error("geth closed with code " + code));
                    }
                };
            }
            this.proc = cp.spawn(this.bin, flags);
            this.proc.stdout.on("data", listeners.stdout);
            this.proc.stderr.on("data", listeners.stderr);
            this.proc._events.close = listeners.close;
            return this.proc;
        }
        return this.start(this.configure(flags), listeners, trigger);
    },

    stop: function (callback) {
        var self = this;
        callback = callback || noop;
        if (this.proc) {
            var closed = function (code) {
                self.configured = false;
                if (self.proc !== null) {
                    self.proc._events.close = null;
                }
                self.proc = null;
                callback(null, code);
            };
            this.proc.on("close", closed);
            this.proc.kill("SIGINT");
        } else {
            callback();
        }
    }

};
