/**
 * geth.js unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var async = require("async");
var join = require("path").join;
var assert = require("chai").assert;
var ethrpc = require("ethrpc");
var geth = require("../");
geth.debug = false;

var SYMLINK = join(process.env.HOME, "ethlink");
var COINBASE = {
    "10101": "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b",
    "7": "0x639b41c4d3d399894f2a57894278e1653e7cd24c"
};
var BOOTNODES = [
    "enode://"+
        "d4f4e7fd3954718562544dbf322c0c84d2c87f154dd66a39ea0787a6f74930c4"+
        "2f5d13ba2cfef481b66a6f002bc3915f94964f67251524696a448ba40d1e2b12"+
        "@45.33.59.27:30303",
    "enode://"+
        "a9f34ea3de79cd75ba49c37603d28a7c494f32604b4ad6e3415b4c6020ff5bf3"+
        "8f9772d69362c024355245fe839dd397ff9ec04db70b3258d92259323cb792ae"+
        "@69.164.196.239:30303",
    "enode://"+
        "4f23a991ea8739bcc5ab52625407fcfddb03ac31a36141184cf9072ff8bf3999"+
        "54bb94ec47e1f653a0b0fea8d88a67fa3147dbe5c56067f39e0bd5125ae0d1f1"+
        "@139.162.5.153:30303",
    "enode://"+
        "bafc7bbaebf6452dcbf9522a2af30f586b38c72c84922616eacad686ab6aaed2"+
        "b50f808b3f91dba6a546474fe96b5bff97d51c9b062b4a2e8bc9339d9bb8e186"+
        "@106.184.4.123:30303"
];

var options = {
    "network 10101: locked": {
        networkid: "10101",
        port: 30304,
        rpcport: 8547
    },
    "network 10101: locked/flags": {
        flags: {
            networkid: "10101",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 10101: locked/symlink/flags": {
        symlink: SYMLINK,
        flags: {
            networkid: "10101",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 10101: locked/persistent/flags": {
        persist: true,
        flags: {
            networkid: "10101",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 10101: locked/persistent/symlink/flags": {
        persist: true,
        symlink: SYMLINK,
        flags: {
            networkid: "10101",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 7: locked": {
        networkid: "7",
        port: 30304,
        rpcport: 8547
    },
    "network 7: locked/flags": {
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 7: locked/symlink/flags": {
        symlink: SYMLINK,
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 7: locked/persistent/flags": {
        persist: true,
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547
        }
    },
    "network 7: locked/persistent/symlink/flags": {
        persist: true,
        symlink: SYMLINK,
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547
        }
    }
};
if (!process.env.CONTINUOUS_INTEGRATION) {
    options["network 7: locked"] = {
        networkid: "7",
        port: 30304,
        rpcport: 8547,
        bootnodes: BOOTNODES
    };
    options["network 7: locked/flags"] = {
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547,
            bootnodes: BOOTNODES
        }
    };
    options["network 10101: unlocked"] = {
        networkid: "10101",
        port: 30304,
        rpcport: 8547,
        unlock: COINBASE["10101"],
        etherbase: COINBASE["10101"]
    };
    options["network 10101: unlocked/flags"] = {
        flags: {
            networkid: "10101",
            port: 30304,
            rpcport: 8547,
            unlock: COINBASE["10101"],
            etherbase: COINBASE["10101"]
        }
    };
    options["network 10101: account/symlink/flags"] = {
        account: COINBASE["10101"],
        symlink: SYMLINK,
        flags: {
            networkid: "10101",
            port: 30304,
            rpcport: 8547,
            shh: null,
            mine: null
        }
    };
    options["network 7: unlocked"] = {
        networkid: "7",
        port: 30304,
        rpcport: 8547,
        unlock: COINBASE["7"],
        etherbase: COINBASE["7"],
        bootnodes: BOOTNODES
    };
    options["network 7: unlocked/flags"] = {
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547,
            unlock: COINBASE["7"],
            etherbase: COINBASE["7"],
            bootnodes: BOOTNODES
        }
    };
    options["network 7: account/symlink/flags"] = {
        account: COINBASE["7"],
        symlink: SYMLINK,
        flags: {
            networkid: "7",
            port: 30304,
            rpcport: 8547,
            bootnodes: BOOTNODES
        }
    };
}

var TIMEOUT = 360000;
var PROTOCOL_VERSION = "0x3f";

function runtests(options) {

    describe("ethrpc commands", function () {

        var requests = 0;
        var network_id = (options.flags) ? options.flags.networkid : options.networkid;
        var coinbase = COINBASE[network_id];

        before(function (done) {
            this.timeout(TIMEOUT);
            geth.start(options, function (err, spawned) {
                if (err) return done(err);
                if (!spawned) return done(new Error("where's the geth?"));
                ethrpc.ipcpath = join(geth.datadir, "geth.ipc");
                done();
            });
        });

        after(function (done) {
            this.timeout(TIMEOUT);
            geth.stop(done);
        });

        describe("broadcast", function () {

            var test = function (t) {
                it(JSON.stringify(t.command) + " -> " + t.expected, function (done) {
                    this.timeout(TIMEOUT);
                    ethrpc.broadcast(t.command, function (res) {
                        if (res.error) return done(res);
                        assert.strictEqual(res, t.expected);
                        done();
                    });
                });
            };

            test({
                command: {
                    id: ++requests,
                    jsonrpc: "2.0",
                    method: "net_listening",
                    params: []
                },
                expected: true
            });
            test({
                command: {
                    id: ++requests,
                    jsonrpc: "2.0",
                    method: "eth_protocolVersion",
                    params: []
                },
                expected: PROTOCOL_VERSION
            });

        });

        describe("listening", function () {

            var test = function (t) {
                it(t.node + " -> " + t.listening, function (done) {
                    this.timeout(TIMEOUT);
                    ethrpc.listening(function (listening) {
                        assert.strictEqual(listening, t.listening);
                        done();
                    });
                });
            };

            test({ listening: true });

        });

        describe("version (network ID)", function () {

            var test = function (t) {
                it(t.node + " -> " + t.version, function (done) {
                    this.timeout(TIMEOUT);
                    ethrpc.version(function (version) {
                        if (version.error) return done(version);
                        assert.strictEqual(version, t.version);
                        done();
                    });
                });
            };

            test({ version: network_id });

        });

        describe("Ethereum bindings", function () {

            it("eth('protocolVersion')", function (done) {
                ethrpc.eth("protocolVersion", null, function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, PROTOCOL_VERSION);
                    done();
                });
            });

            it("getGasPrice", function (done) {
                ethrpc.getGasPrice(function (res) {
                    if (res.error) return done(res);
                    assert.isAbove(parseInt(res), 0);
                    done();
                });
            });

            if (!process.env.CONTINUOUS_INTEGRATION) {

                it("blockNumber", function (done) {
                    ethrpc.blockNumber(function (res) {
                        if (res.error) return done(res);
                        assert.isAbove(parseInt(res), 0);
                        done();
                    });
                });

                it("balance/getBalance", function (done) {
                    ethrpc.balance(coinbase, function (res) {
                        if (res.error) return done(res);
                        assert.isAbove(parseInt(res), 0);
                        ethrpc.getBalance(coinbase, function (r) {
                            if (r.error) return done(r);
                            assert.isAbove(parseInt(r), 0);
                            assert.strictEqual(r, res);
                            ethrpc.balance(coinbase, "latest", function (r) {
                                if (r.error) return done(r);
                                assert.isAbove(parseInt(r), 0);
                                assert.strictEqual(r, res);
                                ethrpc.getBalance(coinbase, "latest", function (r) {
                                    if (r.error) return done(r);
                                    assert.isAbove(parseInt(r), 0);
                                    assert.strictEqual(r, res);
                                    ethrpc.balance(coinbase, null, function (r) {
                                        if (r.error) return done(r);
                                        assert.isAbove(parseInt(r), 0);
                                        assert.strictEqual(r, res);
                                        ethrpc.getBalance(coinbase, null, function (r) {
                                            if (r.error) return done(r);
                                            assert.isAbove(parseInt(r), 0);
                                            assert.strictEqual(r, res);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });

                it("txCount/getTransactionCount", function (done) {
                    ethrpc.txCount(coinbase, function (res) {
                        if (res.error) return done(res);
                        assert(parseInt(res) >= 0);
                        ethrpc.pendingTxCount(coinbase, function (res) {
                            if (res.error) return done(res);
                            assert(parseInt(res) >= 0);
                            done();
                        });
                    });
                });

            }

            it("peerCount", function (done) {
                ethrpc.peerCount(function (res) {
                    if (res.error) return done(res);
                    assert(parseInt(res) >= 0);
                    done();
                });
            });

            it("hashrate", function (done) {
                ethrpc.hashrate(function (res) {
                    if (res.error) return done(res);
                    assert(parseInt(res) >= 0);
                    done();
                });
            });

            it("mining", function (done) {
                ethrpc.mining(function (res) {
                    if (res.error) return done(res);
                    assert.isBoolean(res);
                    done();
                });
            });

            it("clientVersion", function (done) {
                ethrpc.clientVersion(function (res) {
                    if (res.error) return done(res);
                    assert.isString(res);
                    assert.strictEqual(res.split('/')[0], "Geth");
                    done();
                });
            });
        });
    });

    describe("listeners", function () {

        describe("stdout", function () {

            var test = function (t) {
                if (options.account || (options.flags && options.flags.unlock)) {
                    it("geth.stdout(" + t.label + ")", function (done) {
                        this.timeout(TIMEOUT);
                        geth.stop(function () {
                            geth.start(options, {
                                stderr: function (data) {
                                    if (geth.debug) process.stdout.write(data);
                                    if (data.toString().indexOf("cache") > -1) {
                                        geth.trigger(null, geth.proc);
                                    }
                                }
                            }, function (err, spawned) {
                                if (err) return done(err);
                                if (!spawned) return done(new Error("where's the geth?"));
                                geth.stdout(t.label, function (data) {
                                    geth.stop(done);
                                });
                            });
                        });
                    });
                }
            };

            test({ label: "data" });
            test({ label: undefined });
        });

        describe("stderr", function () {

            var test = function (t) {
                var label = (t.label) ? "'" + t.label + "'" : "";
                it("geth.stderr(" + label + ")", function (done) {
                    this.timeout(TIMEOUT);
                    geth.stop(function () {
                        geth.start(options, {
                            stderr: function (data) {
                                if (geth.debug) process.stdout.write(data);
                                if (data.toString().indexOf("Protocol") > -1) {
                                    geth.trigger(null, geth.proc);
                                }
                            }
                        }, function (err, spawned) {
                            if (err) return done(err);
                            if (!spawned) return done(new Error("where's the geth?"));
                            geth.stderr(t.label, function (data) {
                                if (geth.debug) process.stdout.write(data);
                                if (data.toString().indexOf("HTTP endpoint opened") > -1) {
                                    geth.stop(done);
                                }
                            });
                        });
                    });
                });
            };

            test({ label: "data" });
            test({ label: undefined });
        });
    });
}

async.forEachOfSeries(options, function (opt, label, nextOpt) {
    describe(label, function () {
        after(nextOpt);
        runtests(opt);
    });
});
