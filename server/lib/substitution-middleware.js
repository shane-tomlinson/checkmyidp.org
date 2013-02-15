/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const postprocess = require('postprocess');

exports.setup = function(config) {
  var from = new RegExp(config.from, 'g');
  var to = config.to;

  return postprocess(function(req, buffer) {
    var text = String(buffer);
    var updated = text.replace(from, to);
    return updated;
  });
};

