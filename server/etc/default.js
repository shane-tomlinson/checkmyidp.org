/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The default configuration. Values are overridden by environment
 * specific configuration.
 */

module.exports = {
  // port to listen on
  host: process.env['IP_ADDRESS'] || '127.0.0.1',
  port: process.env['PORT'] || 3000,
  public_url: "https://checkmyidp.org"
};

