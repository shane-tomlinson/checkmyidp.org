/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const express             = require('express'),
      path                = require('path'),
      url                 = require('url'),
      check_support       = require('./lib/check_primary_support'),
      config              = require('./lib/config'),
      connect_fonts       = require('connect-fonts'),
      open_sans           = require('connect-fonts-opensans'),
      source_sans_pro     = require('connect-fonts-sourcesanspro');

var app = express();

app.engine('jade', require('jade').__express);
app.set('views', path.join(__dirname, "views"));
app.use(express.bodyParser());

app.use(connect_fonts.setup({
  fonts: [ open_sans, source_sans_pro ],
  allow_origin: "*"
}));

app.use(express.static(path.join(__dirname, 'static')));

app.get('/', function(req, res) {
  res.render('index.jade');
});

app.get('/lint', function(req, res) {
  var idp_url = req.query.idp_url || "";
  var domain = url.parse(idp_url).hostname;

  if (!(domain === req.query.idp_url)) {
    res.redirect('lint?idp_url=' + domain);
    return;
  }

  check_support.checkSupport(domain, function(err, result) {
    // The error will contain the error message to print to the user.
    if (err) result = { error: String(err) };

    result.url = req.url;
    result.domain = domain;
    res.render('lint.jade', result);
  });
});

var port = config.get('port');
console.log("Running server on port:", port);
app.listen(port, '127.0.0.1');
