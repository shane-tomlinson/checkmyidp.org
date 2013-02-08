/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const express       = require('express'),
      path          = require('path'),
      url           = require('url'),
      check_support = require('./lib/check_primary_support');

var app = express();

app.engine('jade', require('jade').__express);
app.set('views', path.join(__dirname, "views"));
app.use(express.bodyParser());


app.get('/', function(req, res) {
  res.render('index.jade');
});

app.get('/lint', function(req, res) {
  var with_http = 'http://' + req.query.idp_url.replace(/https?:\/\//, '');
  var domain = url.parse(with_http).hostname;

  if (!(domain === req.query.idp_url)) {
    res.redirect('lint?idp_url=' + domain);
    return;
  }

  check_support.checkSupport(domain, function(err, result) {
    // The error will contain the error message to print to the user.
    if (err) result = { error: String(err) };

    result.domain = domain;
    res.render('lint.jade', result);
  });
});

app.listen(process.env['PORT'] || 3000, '127.0.0.1');
