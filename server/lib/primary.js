/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// this file is an abstraction around "primary identity authority" support,
// specifically checks and a cache to see if a primary supports browserid
// natively.

const
https = require('https'),
http = require('http'),
logger = require('./logging'),
urlparse = require('urlparse'),
jwcrypto = require("jwcrypto"),
events = require("events"),
wellKnownParser = require('./well-known-parser.js'),
primaryTimeout = 30000;

// alg
require("jwcrypto/lib/algs/rs");
require("jwcrypto/lib/algs/ds");

const WELL_KNOWN_URL = "/.well-known/browserid";

// Protect from stack overflows and network DDOS attacks
const MAX_AUTHORITY_DELEGATIONS = 6;

// the event emitter will raise "idp_seen" events when we sucessfully
// check an IdP's well-known hosts file and see that they are online
exports.events = new events.EventEmitter();

// hit the network and fetch a .well-known document in its unparsed form
var fetchWellKnown = function (currentDomain, principalDomain, clientCB) {
  // in many cases the http layer can send both an 'error' and an 'end'.  In
  // other cases, only 'error' will be emitted.  We want to
  // ensure the client callback is invoked only once.  this function does it.
  var cb = function() {
    if (clientCB) {
      clientCB.apply(null, arguments);
      clientCB = null;
    }
  };

  // if a network attempt to retrieve a support document from the principal
  // domain fails, let's see if we have a "proxy" IDP available for this domain,
  // if so, we'll create a delegation of authority document.
  function handleProxyIDP(err) {
    // log the error with the inital fetch if defined
    if (err) logger.debug(err);

    cb(err);
  }

  function handleResponse(res) {
    if (res.statusCode !== 200) {
      return handleProxyIDP(currentDomain +
                            ' is not a browserid primary - non-200 response code to ' +
                            WELL_KNOWN_URL);
    }
    if (!res.headers['content-type'] || res.headers['content-type'].indexOf('application/json') !== 0) {
      return handleProxyIDP(currentDomain +
                            ' is not a browserid primary - non "application/json" response to ' +
                            WELL_KNOWN_URL);
    }

    var body = "";
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() {
      cb(null, body, currentDomain);
    });
  }

  var req;
  req = https.get({
    host: currentDomain,
    path: WELL_KNOWN_URL + "?domain=" + principalDomain,
    agent: false
  }, handleResponse);

  // front-end shows xhr delay message after 10 sec; timeout sooner to avoid this
  var reqTimeout = setTimeout(function() {
    req.abort();
    handleProxyIDP('timeout trying to load well-known for ' + currentDomain);
  }, primaryTimeout);
  req.on('response', function() { clearTimeout(reqTimeout); });

  req.on('error', function(e) {
    if (reqTimeout) { clearTimeout(reqTimeout); }
    handleProxyIDP(currentDomain + ' is not a browserid primary: ' + String(e));
  });
};

// Fetch a .well-known file from the network, following delegation
function deepFetchWellKnown(principalDomain, cb, currentDomain, delegationChain) {
  // this function is recursive, the last two parameters are only specified
  // when invoking ourselves.
  if (!currentDomain) currentDomain = principalDomain;
  if (!delegationChain) delegationChain = [ principalDomain ];

  fetchWellKnown(currentDomain, principalDomain, function(err, unparsedDoc) {
    if (err) return cb(err);

    var supportDoc;
    try {
      supportDoc = wellKnownParser(unparsedDoc);
    } catch (e) {
      return cb("bad support document for '" + currentDomain + "': " + String(e));
    }

    if (supportDoc.type === 'disabled')
    {
      return cb(null, {
        disabled: true,
        delegationChain: delegationChain,
        authoritativeDomain: delegationChain[delegationChain.length - 1],
      });
    }
    else if (supportDoc.type === 'delegation')
    {
      currentDomain = supportDoc.authority;

      // check for cycles in delegation
      if (delegationChain.indexOf(currentDomain) !== -1) {
        return cb("Circular reference in delegating authority: " + delegationChain.join(" > "));
      }

      delegationChain.push(currentDomain);

      logger.debug(delegationChain[delegationChain.length - 2] + " delegates to " +
                   delegationChain[delegationChain.length - 1]);

      // check for max delegation length
      if (delegationChain.length > MAX_AUTHORITY_DELEGATIONS) {
        return cb("Too many hops while delegating authority: " + delegationChain.join(" > "));
      }

      // recurse
      return deepFetchWellKnown(principalDomain, cb, currentDomain, delegationChain);
    }
    else if (supportDoc.type === 'supported')
    {
      // DEBUGGING INSTRUMENTATION: Allow SHIMMED_PRIMARIES to change example.com into 127.0.0.1:10005
      var url_prefix = 'https://' + currentDomain;
      var details = {
        publicKey: supportDoc.publicKey,
        urls: {
          auth: url_prefix + supportDoc.paths.authentication,
          prov: url_prefix + supportDoc.paths.provisioning
        },
        delegationChain: delegationChain,
        authoritativeDomain: delegationChain[delegationChain.length - 1],
        proxied: false
      };

      // validate the urls
      try {
        urlparse(details.urls.auth).validate();
        urlparse(details.urls.prov).validate();
      } catch(e) {
        return cb("invalid URLs in support document: " + e.toString());
      }

      // success!
      cb(null, details);
    }
    else
    {
      var msg = "unhandled error while parsing support document for " + currentDomain;
      logger.error(msg);
      return cb(msg);
    }
  });
}

exports.checkSupport = function(principalDomain, cb) {
  if (!cb) throw "missing required callback function";

  if (typeof principalDomain !== 'string' || !principalDomain.length) {
    return process.nextTick(function() { cb("invalid domain"); });
  }

  deepFetchWellKnown(principalDomain, function (err, r) {
    if (err) {
      logger.debug(err);
      cb(err);
    } else if (r) {
      if (r.disabled) {
        // Don't emit events for disabled idps.  This could be very noisy.  Rather
        // we perform a lazy cleanup of stale database records inside address_info.
        logger.info(principalDomain + ' has explicitly disabled browserid support');
      } else {
        exports.events.emit("idp_seen", principalDomain);
        logger.info(principalDomain + ' is a valid browserid primary');
      }
      return cb(null, r);
    }
  });
};

exports.emailRegex = /\@(.*)$/;

exports.getPublicKey = function(domain, cb) {
  exports.checkSupport(domain, function(err, r) {
    if (err || !r || !r.publicKey) {
      cb("can't get public key for " + domain + (err ? ": " + err : ""));
    } else {
      cb(err, r.publicKey);
    }
  });
};

// Is issuingDomain allowed to issue certifications for emails from
// emailDomain.
exports.delegatesAuthority = function (emailDomain, issuingDomain, cb) {
  exports.checkSupport(emailDomain, function(err, r) {
    cb(!err && r && (r.authoritativeDomain === issuingDomain));
  });
};

