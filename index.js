/**
 * Get your geth on from Node.js.
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var fs = require("fs");
var join = require("path").join;
var cp = require("child_process");

function GethError(message) {
    this.name = "GethError";
    this.message = message;
}

GethError.prototype = new Error();

var geth = {

    debug: false,

    geth: null,

    flags: null,

    options: null,

    datadir: null,

    network: null,

    bin: null,

    Error: GethError,

    configure: function (options) {
        this.bin = options.geth_bin || "geth";
        var f = options.flags || options;
        this.network = f.networkid;
        f.datadir = f.datadir || join(process.env.HOME, ".ethereum-" + f.networkid);
        if (options.symlink) {
            if (fs.existsSync(options.symlink)) fs.unlinkSync(options.symlink);
            fs.symlinkSync(f.datadir, options.symlink);
            f.datadir = options.symlink;
        }
        this.datadir = f.datadir;
        this.flags = [];
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
                if (flag === "unlock") unlock = true;
                if (flag === "password") password = true;
            }
        }
        if (unlock && !password) {
            this.flags = this.flags.concat([
                "--password", join(this.datadir, ".password")
            ]);
        }
        return this.flags;
    },

    stop: function (callback) {
        callback = callback || function () { };
        var monitor, count = 0;
        if (this.geth) {
            this.geth.kill();
            this.geth = null;
        }
        (function pulse() {
            cp.exec("ps cax | grep geth > /dev/null", function (err) {
                if (err === null || count > 100) {
                    if (monitor) clearTimeout(monitor);
                    return callback();
                }
                monitor = setTimeout(pulse, 1000);
            });
        })();
    },

    start: function (flags, callback) {
        var self = this;
        if (this.bin) {
            if (flags && flags.constructor === Function) {
                callback = flags;
                flags = this.flags;
            }
            if (this.debug) {
                console.log(
                    "Spawn " + this.bin + " on network " + this.network + "..."
                );
            }
            this.geth = cp.spawn(this.bin, flags);
            this.geth.stdout.on("data", function (data) {
                if (self.debug) process.stdout.write(data);
            });
            this.geth.stderr.on("data", function (data) {
                var index = data.toString().indexOf("Tx");
                if (self.debug && index > -1) {
                    data = "[geth] " + data.toString().slice(index);
                    process.stdout.write(data);
                }
                if (data.toString().indexOf("IPC service started") > -1) {
                    if (callback && callback.constructor === Function) {
                        callback(self.geth);
                    }
                }
            });
            this.geth.on("close", function (code) {
                if (code !== 2 && code !== 0) {
                    if (self.geth !== null) self.stop();
                    throw new self.Error("geth closed with code " + code);
                }
            });
            return this.geth;
        }
    }

};

process.on("exit", function () { if (geth.geth) geth.stop(); });

module.exports = geth;
