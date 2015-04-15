var express = require('express');
var app = express();
var poolModule = require('generic-pool');
var fast = require('fast');
var host = "127.0.0.1";
var RPCport = 4242;
var uri = 'http://'+host+':'+RPCport;

var pool = poolModule.Pool({
    name     : 'TCP-RPC',
    create   : function(callback) {
        var RPCclient = fast.createClient({host: host, port: parseInt(RPCport),retry:{retries:1},connectTimeout:500});
        // parameter order: err, resource
        // new in 1.0.6
        RPCclient.on('connect', function () {
            console.log('API ' + ' RPC@' + uri + '> Connected!');
            callback(null, RPCclient);
        });
        RPCclient.on('error', function (err) {
            console.log('TCP-RPC Pool Connection ' +  ' RPC@' + host + ':'+ RPCport + '>',err);
            callback("connection Error");
        });
    },
    destroy  : function(rpcclient) {
        if(typeof rpcclient.rpc === 'function') {
            rpcclient.close();
        }
    },
    validate : function(rpcclient) {
        return (typeof rpcclient.rpc === 'function')
    },
    //validate  : function(rpcclient) { return (typeof rpcclient.rpc === 'function') },
    max      : 1,
    // optional. if you set this, make sure to drain() (see step 3)
    min      : 1,
    // specifies how long a resource can stay idle in pool before being removed
    idleTimeoutMillis : 0,
    refreshIdle:false,
    returnToHead:true,
    // if true, logs via console.log - can also be a function
    log : function(log,level){
        if(level === ('warn' || 'error')){
            console.log('TCP-RPC Pool' + 'RPC@' + uri + '>',log);
        }
    }
});

// GET method route
app.get('/', function (req, res) {
    res.send('GET request to the homepage');


});

// POST method route
app.post('/', function (req, res) {
    res.send('POST request to the homepage');
});


app.get('/aquire', function (req, res) {

    logImp(req, function(e, obj){
        console.log('e', e);
        console.log('obj', obj);

    });

    res.send('about');
});

var server = app.listen(3000, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

});

var logImp = function (pre, next) {
    pool.acquire(function(err, rpcclient) {
        if (err || !rpcclient ||!rpcclient.rpc) {
            pool.destroy(rpcclient);
            return next("error");
        }
        var req = rpcclient.rpc('impression', pre.imp.impID);
        req.on('message', function (obj) {
            next(null, obj);
        });
        req.on('error', function (err) {
            // send error
            if(err.message && err.message ==='no connection') {
                pool.destroy(rpcclient);
            }else{
                pool.release(rpcclient);
            }
            next(err);
        });
        req.on('end', function () {
            pool.release(rpcclient);
        });
    });
};