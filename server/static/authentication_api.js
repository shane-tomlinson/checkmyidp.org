/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
  "use strict";

  if (!navigator.id) navigator.id = {};

  navigator.id.beginAuthentication = function(cb) {
    // cb email
  };

  navigator.id.completeAuthentication = function(cb) {
    // stuff is just done
  };

  navigator.id.raiseAuthenticationFailure = function(reason) {
    // auth is good.
  };

}());

