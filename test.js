/**
 * ethrpc unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var join = require("path").join;
var assert = require("chai").assert;
var ethrpc = require("ethrpc");
var geth = require("./");

var options = {
    symlink: join(process.env.HOME, "ethlink"),
    flags: {
        networkid: "10101",
        port: 30304,
        rpcport: 8547,
        shh: null,
        mine: null,
        bootnodes: [
            "enode://"+
                "70eb80f63946c2b3f65e68311b4419a80c78271c099a7d1f3d8df8cdd8e37493"+
                "4c795d8bc9f204dda21eb9a318d30197ba7593494eb27ceb52663c8339e9cb70"+
                "@[::]:30303",
            "enode://"+
                "405e781c84b570f02cb2e4ebb18c60528aba5a08ccd72d4ebd7aeabc09208ef2"+
                "4fa54e20ff3b10e478c203dd481f3820242e51fe72770a207a798eadfe8e7e6e"+
                "@[::]:30303",
            "enode://"+
                "d4f4e7fd3954718562544dbf322c0c84d2c87f154dd66a39ea0787a6f74930c4"+
                "2f5d13ba2cfef481b66a6f002bc3915f94964f67251524696a448ba40d1e2b12"+
                "@[::]:30303",
            "enode://"+
                "8f3c33294774dc266446e9c8483fa1a21a49b157d2066717fd52e76d00fb4ed7"+
                "71ad215631f9306db2e5a711884fe436bc0ca082684067836b3b54730a6c3995"+
                "@[::]:30303",
            "enode://"+
                "4f23a991ea8739bcc5ab52625407fcfddb03ac31a36141184cf9072ff8bf3999"+
                "54bb94ec47e1f653a0b0fea8d88a67fa3147dbe5c56067f39e0bd5125ae0d1f1"+
                "@[::]:30303",
            "enode://"+
                "bafc7bbaebf6452dcbf9522a2af30f586b38c72c84922616eacad686ab6aaed2"+
                "b50f808b3f91dba6a546474fe96b5bff97d51c9b062b4a2e8bc9339d9bb8e186"+
                "@[::]:30303"
        ]
    }
};
var contracts = require("augur-contracts")[options.flags.networkid];

var COINBASE = "0x05ae1d0ca6206c6168b42efcd1fbe0ed144e821b";

var TIMEOUT = 360000;
var SHA3_INPUT = "boom!";
var SHA3_DIGEST = "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";
var PROTOCOL_VERSION = "63";
var TXHASH = "0x8807d1cf7bfad194122285cc586ffa72e124e2c47ff6b56067d5193511993c28";

var requests = 0;

before(function (done) {
    this.timeout(TIMEOUT);
    ethrpc.reset();
    ethrpc.balancer = false;
    ethrpc.ipcpath = join(options.symlink, "geth.ipc");
    geth.start(geth.configure(options, COINBASE), function (spawned) {
        if (!spawned) return done(new geth.Error("where's the geth?"));
        done();
    });
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
            method: "eth_coinbase",
            params: []
        },
        expected: COINBASE
    });
    test({
        command: {
            id: ++requests,
            jsonrpc: "2.0",
            method: "web3_sha3",
            params: [SHA3_INPUT]
        },
        expected: SHA3_DIGEST
    });
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

    test({ version: options.flags.networkid });

});

describe("unlocked", function () {

    var test = function (t) {
        it(t.node + " -> " + t.unlocked, function (done) {
            this.timeout(TIMEOUT);
            ethrpc.unlocked(t.account, function (unlocked) {
                if (unlocked.error) return done(unlocked);
                assert.strictEqual(unlocked, t.unlocked);
                done();
            });
        });
    };

    test({
        account: COINBASE,
        unlocked: true
    });

});

describe("Ethereum bindings", function () {

    it("raw('eth_coinbase')", function (done) {
        ethrpc.raw("eth_coinbase", null, function (res) {
            if (res.error) return done(res);
            assert.strictEqual(res, COINBASE);
            done();
        });
    });

    it("eth('coinbase')", function (done) {
        ethrpc.eth("coinbase", null, function (res) {
            if (res.error) return done(res);
            assert.strictEqual(res, COINBASE);
            done();
        });
    });

    it("eth('protocolVersion')", function (done) {
        ethrpc.eth("protocolVersion", null, function (res) {
            if (res.error) return done(res);
            assert.strictEqual(res, PROTOCOL_VERSION);
            done();
        });
    });

    it("web3_sha3('" + SHA3_INPUT + "')", function (done) {
        ethrpc.web3("sha3", SHA3_INPUT, function (res) {
            if (res.error) return done(res);
            assert.strictEqual(res, SHA3_DIGEST);
            ethrpc.sha3(SHA3_INPUT, function (res) {
                if (res.error) return done(res);
                assert.strictEqual(res, SHA3_DIGEST);
                done();
            });
        });
    });

    it("leveldb('putString')", function (done) {
        ethrpc.leveldb("putString", [
            "augur_test_DB",
            "testkey",
            "test!"
        ], function (res) {
            if (res.error) return done(res);
            assert.isTrue(res);
            done();
        });
    });

    it("leveldb('getString')", function (done) {
        ethrpc.leveldb("putString", [
            "augur_test_DB",
            "testkey",
            "test!"
        ], function (res) {
            if (res.error) return done(res);
            ethrpc.leveldb(
                "getString",
                ["augur_test_DB", "testkey"],
                function (res) {
                    if (res.error) return done(res);
                    assert.strictEqual(res, "test!");
                    done();
                }
            );
        });
    });

    it("gasPrice", function (done) {
        ethrpc.gasPrice(function (res) {
            if (res.error) return done(res);
            assert.isAbove(parseInt(res), 0);
            done();
        });
    });

    it("blockNumber", function (done) {
        ethrpc.blockNumber(function (res) {
            if (res.error) return done(res);
            assert.isAbove(parseInt(res), 0);
            done();
        });
    });

    it("balance/getBalance", function (done) {
        ethrpc.balance(COINBASE, function (res) {
            if (res.error) return done(res);
            assert.isAbove(parseInt(res), 0);
            ethrpc.getBalance(COINBASE, function (r) {
                if (r.error) return done(r);
                assert.isAbove(parseInt(r), 0);
                assert.strictEqual(r, res);
                ethrpc.balance(COINBASE, "latest", function (r) {
                    if (r.error) return done(r);
                    assert.isAbove(parseInt(r), 0);
                    assert.strictEqual(r, res);
                    ethrpc.getBalance(COINBASE, "latest", function (r) {
                        if (r.error) return done(r);
                        assert.isAbove(parseInt(r), 0);
                        assert.strictEqual(r, res);
                        ethrpc.balance(COINBASE, null, function (r) {
                            if (r.error) return done(r);
                            assert.isAbove(parseInt(r), 0);
                            assert.strictEqual(r, res);
                            ethrpc.getBalance(COINBASE, null, function (r) {
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
        ethrpc.txCount(COINBASE, function (res) {
            if (res.error) return done(res);
            assert(parseInt(res) >= 0);
            ethrpc.pendingTxCount(COINBASE, function (res) {
                if (res.error) return done(res);
                assert(parseInt(res) >= 0);
                done();
            });
        });
    });

    it("peerCount", function (done) {
        switch (options.flags.networkid) {
        case "10101":
            ethrpc.peerCount(function (res) {
                if (res.error) return done(res);
                assert.strictEqual(parseInt(res), 0);
                done();
            });
            break;
        default:
            ethrpc.peerCount(function (res) {
                if (res.error) return done(res);
                assert(parseInt(res) >= 0);
                done();
            });
        }
    });

    it("hashrate", function (done) {
        ethrpc.hashrate(function (res) {
            if (res.error) return done(res);
            assert(parseInt(res) >= 0);
            done();
        });
    });

    it("mining", function (done) {
        switch (options.flags.networkid) {
        case "10101":
            ethrpc.mining(function (res) {
                if (res.error) return done(res);
                assert.isTrue(res);
                done();
            });
            break;
        default:
            ethrpc.mining(function (res) {
                if (res.error) return done(res);
                assert.isBoolean(res);
                done();
            });
        }
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
