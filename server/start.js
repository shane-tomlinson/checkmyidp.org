/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const express             = require('express'),
      path                = require('path'),
      url                 = require('url'),
      check_support       = require('./lib/check-primary-support'),
      config              = require('./lib/config'),
      substitution_middleware
                          = require('./lib/substitution-middleware'),
      connect_fonts       = require('connect-fonts'),
      open_sans           = require('connect-fonts-opensans'),
      source_sans_pro     = require('connect-fonts-sourcesanspro');

var app = express();

app.engine('jade', require('jade').__express);
app.set('views', path.join(__dirname, "views"));
app.use(express.bodyParser());


app.use(express.compress());


var public_url = config.get('public_url');
if (public_url !== "https://checkmyidp.org") {
  app.use(substitution_middleware.setup({
    from: "https://checkmyidp.org",
    to: public_url
  }));
}

app.use(connect_fonts.setup({
  fonts: [ open_sans, source_sans_pro ],
  allow_origin: "https://checkmyidp.org",
  maxage: 180 * 24 * 60 * 60 * 1000,       // 180 days
  compress: true
}));

app.use(express.static(path.join(__dirname, 'static')));

app.get('/', function(req, res) {
  res.render('index.jade');
});

app.get('/lint', function(req, res) {
  var idp_url = req.query.idp_url || "";
  // url.parse requires that the protocol be prepended to the domain name
  var with_http = 'http://' + idp_url.replace(/https?:\/\//, '');
  var domain = url.parse(with_http).hostname;

  if (!(domain === req.query.idp_url)) {
    res.redirect('lint?idp_url=' + domain);
    return;
  }

  check_support.checkSupport(domain, function(err, result) {
    // The error will contain the error message to print to the user.
    if (err) result = { error: String(err) };

    result.url = req.url;
    result.domain = domain;
    result.error = result.error || "";
    res.render('lint.jade', result);
  });
});

app.get('/check_pages', function(req, res) {
  var auth = req.query.auth;
  var prov = req.query.prov;
  var username = req.query.username;
  var domain = req.query.domain;
  var redirectTo = auth + toQueryString({
    email: username + "@" + domain,
    prov: prov,
  });

  res.redirect(redirectTo);
});

app.get('/auth_failure', function(req, res) {
  res.render('auth_failure.jade', {
    domain: url.parse(req.query.retry).hostname,
    reason: req.query.reason,
    urls: {
      retry: req.query.retry
    }
  });
});

app.get('/prov_failure', function(req, res) {
  res.render('prov_failure.jade', {
    domain: url.parse(req.query.retry).hostname,
    reason: req.query.reason,
    urls: {
      retry: req.query.retry
    }
  });
});

app.get('/prov_success', function(req, res) {
  res.render('prov_success.jade', {
    domain: url.parse(req.query.retry).hostname,
    urls: {
      retry: req.query.retry
    }
  });
});

var port = config.get('port');
var host = config.get('host');
app.listen(port, host, function() {
  console.log("Server running at: ", (host + ":" + port));
});

function toQueryString(params) {
  var queryString = "?";
  var queryParams = [];
  for(var key in params) {
    queryParams.push(key + "=" + encodeURIComponent(params[key]));
  }
  return queryString + queryParams.join("&");
}

