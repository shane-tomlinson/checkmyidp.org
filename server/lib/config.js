/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const path          = require('path'),
      fs            = require('fs');

const config_dir    = path.join(__dirname, "..", "config");

var config = getConfig();


exports.get = function(key) {
  if (!(key in config)) {
    throw new Error("Invalid configuration option: " + key);
  }

  return config[key];
};

function getConfig() {
  var env = process.env['NODE_ENV'] || 'dev';
  console.log('Using configuration environment:', env);

  var config_path = path.join(config_dir, env);
  var config = require(config_path);

  return config;
}
