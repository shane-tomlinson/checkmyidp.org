#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const
https = require('https'),
und = require('underscore'),
urlp = require('url'),
util = require('util'),
primary = require('./primary');

exports.checkSupport = function(domain, done) {
  primary.checkSupport(domain, function(err, r) {
    if (err || r.publicKey === null) {
      if (err) {
        process.stderr.write("error: " + err + "\n");
        return done && done(err);
      }
    }

    /*
    console.log('Primary domain:\t\t', domain);
    console.log('Authoritative Domain:\t', r.authoritativeDomain);
    console.log('Authentication URL:\t', r.urls.auth);
    console.log('Provisioning URL:\t', r.urls.prov);
    console.log('Public Key:\t\t', JSON.stringify(r.publicKey, null, "  "));
*/
    r.publicKey = JSON.stringify(r.publicKey, null, "  ");
    var authopts = {
        xframe: false
    };
    /*return done && done(null, r);*/
    console.log("getting auth");
    getResource('auth', r.urls.auth, authopts, function (err, hasAuth) {
      r.hasAuth = err ? String(err): hasAuth;

      console.log("got auth");
      getResource('prov', r.urls.prov, {
        xframe: true
      }, function(hasProv) {
        r.hasProv = err ? String(err): hasProv;

        console.log("got prov");
        done && done(null, r);
      });
    });
  });
};

/**
 * Retrieve one of their urls and examine aspects of it for issues
 */
function getResource(mode, url, opts, cb) {
  var domain = urlp.parse(url).host;
  var path = urlp.parse(url).path;
  console.log(domain, path);
  var body = "";

  https.request({
    host: domain,
    path: path,
    method: 'GET'
  }, function(res) {
    res.on('data', function (chunk) {
      body += chunk;
    });

    var includes = {
      'auth': '/authentication_api.js',
      'prov': '/provisioning_api.js'
    };
    var hasInclude = true;
    if (body.indexOf(util.format("https://login.persona.org%s", includes[mode])) == -1 &&
        body.indexOf(util.format("https://login.anosrep.org%s", includes[mode])) == -1 &&
        body.indexOf(util.format("https://login.dev.anosrep.org%s", includes[mode])) == -1) {
        hasInclude = false;
    }

    checkResource(res, url, opts, body);

    return cb && cb(hasInclude);
  }).on('error', function (e) {
    console.log("ERROR: ", e.message);
    cb && cb(e);
  }).end();
};

/**
 * Called once we have a response.
 *
 * Do the provisioning and signin resources look kosher?
 */
function checkResource (resp, url, opts, body) {
  console.log("response received:", body);
  // Their are no X-Frame options
  if (resp.statusCode != 200) {
    console.log("ERROR: HTTP status code=", resp.statusCode, url);
  } else {
    if (opts.xframe === true) {
      var xframe = und.filter(Object.keys(resp.headers), function (header) {
        return header.toLowerCase() == 'x-frame-options';
      });
      if (xframe.length == 1) {
        console.log("ERROR: X-Frame-Options=", resp.headers[xframe[0]], ", BrowserID will not be able to communicate with your site." +
            " Suppress X-Frame-Options for ", url);
      }
    }
  }
};
