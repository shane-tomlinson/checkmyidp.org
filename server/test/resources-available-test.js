/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Check to make sure all of the available resources are available
 */


const spawn       = require('child_process').spawn,
      path        = require('path'),
      http        = require('http'),
      config      = require('../lib/config');

const host = config.get('host');
const port = config.get('port');

// XXX read this from package.json
const server_path = path.join(__dirname, '..', 'start.js');

const urls_to_check = {
  '/': 200,
  '/lint': 200,
  '/authentication_api.js': 200,
  '/provisioning_api.js': 200
};

exports.resources_available = function(test) {
  var urls = [].concat(Object.keys(urls_to_check));

  startServer(check_next_url);

  function check_next_url() {
    var next_url = urls.shift();

    if (next_url) {
      respondsWith(host, port, next_url,
          urls_to_check[next_url], test, check_next_url);
    }
    else {
      stopServer(function() {
        test.done();
      });
    }
  }
};

var proc;
process.on('exit', function() {
  if (proc) proc.kill();
});

function startServer(done) {
  proc = spawn('node', [ server_path ]);
  proc.stdout.on('data', function(buf) {
    var text = String(buf);
    console.log(text);

    if (text.indexOf('Server running at:') > -1) {
      done();
    }
  });
  proc.stderr.on('data', function(buf) {
    console.log(String(buf));
  });
}

function stopServer(done) {
  proc.kill('SIGINT');
  proc.on('exit', done);
}

function respondsWith(hostname, port, path, code, test, done) {
  console.log("checking:", hostname + ":" + port + path);
  http.get({
    hostname: hostname,
    port: port,
    path: path
  }, function(res) {
    test.equal(res.statusCode, code);
    done();
  });
}

