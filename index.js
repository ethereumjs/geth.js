/**
 * Start and stop geth from Node.js.
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var fs = require("fs");
var join = require("path").join;
var cp = require("child_process");

module.exports = {

    debug: false,

    proc: null,

    flags: null,

    options: null,

    datadir: null,

    network: null,

    bin: null,

    configured: false,

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
        this.configured = true;
        return this.flags;
    },

    start: function (flags, callback) {
        var self = this;
        if (this.configured) {
            if (flags && flags.constructor === Function) {
                callback = flags;
                flags = this.flags;
            }
            callback = callback || function () { };
            if (this.debug) {
                console.log(
                    "Spawn " + this.bin + " on network " + this.network + "..."
                );
            }
            this.proc = cp.spawn(this.bin, flags);
            this.proc.stdout.on("data", function (data) {
                if (self.debug) process.stdout.write(data);
            });
            this.proc.stderr.on("data", function (data) {
                if (self.debug) process.stdout.write(data);
                if (data.toString().indexOf("IPC service started") > -1) {
                    callback(null, self.proc);
                }
            });
            this.proc.on("close", function (code) {
                if (code !== 2 && code !== 0) {
                    if (self.proc !== null) self.stop();
                    callback(new Error("geth closed with code " + code));
                }
            });
            return this.proc;
        }
        return this.start(this.configure(flags), callback);
    },


    stop: function (callback) {
        callback = callback || function () { };
        if (this.proc) this.proc.kill();
        callback();
    }

};
