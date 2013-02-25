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

    var temp = {};
    r.publicKey.serializeToObject(temp);
    r.publicKey.serialized = temp;

    var opts = {
        xframe: false
    };

    getResource('auth', r.urls.auth, opts, function (err, auth_res) {
      r.auth_include = err ? String(err) : auth_res.include;

      getResource('prov', r.urls.prov, opts, function(err, prov_res) {
        r.prov_include = err ? String(err) : prov_res.include;

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
function getResource(mode, url, opts, cb) {
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
       var include = getInclude(body, INCLUDES[mode]);

      /*console.log(includes[mode], hasInclude);*/
      /*checkResource(res, url, opts, body);*/
      var res = {
        include: include || false,
        checkmyidp_include: include && isCheckMyIdPInclude(include),
        body: body
      };

      return cb && cb(null, res);
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
 * Called once we have a response.
 *
 * Do the provisioning and signin resources look kosher?
 */
function checkResource (resp, url, opts, body) {
  console.log('response received:', body);
  // Their are no X-Frame options
  if (resp.statusCode !== 200) {
    console.log('ERROR: HTTP status code=', resp.statusCode, url);
  } else {
    if (opts.xframe === true) {
      var xframe = und.filter(Object.keys(resp.headers), function (header) {
        return header.toLowerCase() === 'x-frame-options';
      });
      if (xframe.length === 1) {
        console.log('ERROR: X-Frame-Options=', resp.headers[xframe[0]], ', BrowserID will not be able to communicate with your site.' +
            ' Suppress X-Frame-Options for ', url);
      }
    }
  }
}
