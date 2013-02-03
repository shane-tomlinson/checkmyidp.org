/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const express       = require('express'),
      path          = require('path'),
      check_support = require('./lib/check_primary_support');

var app = express();

app.engine('jade', require('jade').__express);
app.set('views', path.join(__dirname, "views"));
app.use(express.bodyParser());


app.get('/', function(req, res) {
  res.render('index.jade');
});

app.post('/lint', function(req, res) {
  var domain = req.body.idp_url;
  check_support.checkSupport(domain, function(err, result) {
    if (err) return res.send(500);

    res.render('lint.jade', result);
  });
});

app.listen(process.env['PORT'] || 3000, '127.0.0.1');
