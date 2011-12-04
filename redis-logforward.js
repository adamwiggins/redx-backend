var http = require("http");
var https = require("https");
var url = process.env.LOG_URL;

if (!url) {
  console.log("You must set LOG_URL");
  process.exit(1);
}

var options = require("url").parse(url);
    options.method = "POST";
    options.path   = options.pathname;
    options.host   = options.hostname;

var forward = function(msg) {
  emitted += 1;
  console.log("received: " + msg);

  var payload = JSON.stringify({ "timestamp": (new Date()).toString(), "msg": msg.toString() });
  console.log("sending: " + payload);

  req.write(payload + "\n");
}

console.log("launch_redis");

var redis = require('child_process').spawn('redis-server');

process.on('SIGTERM', function () {
  console.log("sending SIGTERM to redis");
  process.kill(redis.pid);
});

redis.stdout.on('data', function (data) {
  forward(data);
});

redis.stderr.on('data', function (data) {
  forward(data);
});

redis.on('exit', function (code) {
  console.log('child process exited with code ' + code);
  process.exit(code);
});

console.log("connect_logdrain");
var req = ((options.protocol == "https:" ? https : http)).request(options);
var ready = false;
var emitted = 0;

req.on("error", function(e) {
  console.log("error: " + e);
  process.exit(1);
});

req.on("response", function(res) {
  console.log("response");
  res.setEncoding("utf8");

  res.on("data", function(data) {
    var lines = data.split("\n");
    for (var i=0; i<lines.length; i++) {
      var line = lines[i];
      if (line != "") {
        ready = true;
      }
    }
  });

  res.on("end", function() {
    console.log("end");
    process.exit(1);
  });

  res.on("close", function() {
    console.log("close");
    process.exit(1);
  });
});

req.write("\n");
