/**
 * Spawn a geth of your very own!
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

    bin: null,

    Error: GethError,

    configure: function (options, account) {
        this.options = options;
        this.bin = options.geth_bin || "geth";
        var f = options.flags;
        f.datadir = f.datadir || join(process.env.HOME, ".ethereum-" + options.flags.networkid);
        if (options.symlink) {
            if (fs.existsSync(options.symlink)) fs.unlinkSync(options.symlink);
            fs.symlinkSync(f.datadir, options.symlink);
            f.datadir = options.symlink;
        }
        this.flags = [];
        if (account) {
            this.flags = this.flags.concat([
                "--etherbase", account,
                "--unlock", account,
                "--password", join(f.datadir, ".password")
            ]);
        }
        if (f && f.constructor === Object) {
            for (var flag in f) {
                if (!f.hasOwnProperty(flag)) continue;
                this.flags.push("--" + flag);
                if (f[flag]) {
                    if (f[flag].constructor === Array) {
                        this.flags = this.flags.concat(f[flag]);
                    } else {
                        this.flags.push(f[flag]);
                    }
                }
            }
        }
        return this.flags;
    },

    stop: function (geth) {
        geth = geth || this.geth;
        if (geth) {
            if (this.debug) console.log("Shut down geth...");
            geth.kill();
            geth = null;
        }
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
                    "Spawn " + this.bin + " on network "+
                    this.options.flags.networkid + "..."
                );
            }
            this.geth = cp.spawn(this.bin, flags);
            if (this.debug) {
                console.log(
                    this.bin, "listening on ports:"+
                    "\n - Peer:", this.options.flags.port || 30303,
                    "\n - RPC: ", this.options.flags.rpcport || 8545
                );
            }
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
