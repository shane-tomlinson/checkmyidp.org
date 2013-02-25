/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const
https = require('https'),
und = require('underscore'),
urlp = require('url'),
util = require('util'),
primary = require('./primary');

/*
 * The location of the Persona servers. Used to look for the correct includes.
 */
const PERSONA_HOSTS = [
  'https://login.persona.org',
  'https://login.anosrep.org',
  'https://login.dev.anosrep.org'
];

/*
 * The location of the checkmyidp.org servers. Used to look for the correct
 * includes.
 */
const CHECKMYIDP_HOSTS = [
  'https://checkmyidp.org'
];

/*
 * The includes to look for
 */
const INCLUDES = {
  'auth': '/authentication_api.js',
  'prov': '/provisioning_api.js'
};


exports.checkSupport = function(domain, done) {
  primary.checkSupport(domain, function(err, r) {
    if (err || r.publicKey === null) {
      if (err) {
        process.stderr.write('error: ' + err + '\n');
        return done && done(err);
      }
    }

    var temp = r.publicKey.serialized = {};
    r.publicKey.serializeToObject(temp);

    var opts = {
      xframe: true,
      mode: 'auth'
    };

    getResource(r.urls.auth, opts, function (err, auth_res) {
      r.auth_include = err ? String(err) : auth_res.include;
      r.auth_x_frame_option = auth_res.x_frame_option;

      opts.mode = 'prov';
      getResource(r.urls.prov, opts, function(err, prov_res) {
        r.prov_include = err ? String(err) : prov_res.include;
        r.prov_x_frame_option = prov_res.x_frame_option;

        // The user can check the full flow if they are using the
        // checkmyidp.org includes.
        r.canCheckPages = auth_res.checkmyidp_include &&
                          prov_res.checkmyidp_include;

        done && done(null, r);
      });
    });
  });
};

/**
 * Retrieve one of their urls and examine aspects of it for issues
 */
function getResource(url, opts, cb) {
  var domain = urlp.parse(url).host;
  var path = urlp.parse(url).path;
  var body = '';

  https.request({
    host: domain,
    path: path,
    method: 'GET'
  }, function(res) {
    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function() {
      checkResource(res, opts, body, function(err, results) {
        cb && cb(null, results);
      });
    });
  }).on('error', function (e) {
    console.log('ERROR: ', e.message);
    cb && cb(e);
  }).end();
}

function getInclude(body, lookFor) {
  var allHosts = PERSONA_HOSTS.concat(CHECKMYIDP_HOSTS);

  for (var i = 0, host; host = allHosts[i]; ++i) {
    var include = host + lookFor;
    var hostRegExp = new RegExp(include, 'g');

    if (hostRegExp.test(body)) return include;
  }

  return null;
}

function isCheckMyIdPInclude(include) {
  for (var i = 0, host; host = CHECKMYIDP_HOSTS[i]; ++i) {
    if(include.indexOf(host) === 0) return true;
  }

  return false;
}

/**
 * check a resource to see if its status code is legit and x-frame-options
 * header is not set.
 */
function checkResource(res, opts, body, done) {
  var include = getInclude(body, INCLUDES[opts.mode]);
  var results = {
    statusCode: res.statusCode,
    include: include || false,
    checkmyidp_include: include && isCheckMyIdPInclude(include),
    body: body
  };


  if (opts.xframe === true) {
    var xframeOption = und.filter(res.headers, function (value, header) {
      if (header.toLowerCase() === 'x-frame-options') return true;
    })[0];

    results.x_frame_option = xframeOption;
  }

  done(null, results);
}
