/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
  "use strict";

  if (!navigator.id) navigator.id = {};

  navigator.id.beginProvisioning = function(cb) {
    // cb email duration
  };

  navigator.id.genKeyPair = function(cb) {
    // cb pubkey
  };

  navigator.id.registerCertificate = function(certificate) {
    // stuff is done
  };

  navigator.id.raiseProvisioningFailure = function(reason) {
    // stuff has failed.
  };


}());

