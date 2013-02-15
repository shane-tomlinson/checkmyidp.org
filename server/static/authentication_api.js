/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
  "use strict";

  if (!navigator.id) navigator.id = {};

  navigator.id.beginAuthentication = function(cb) {
    // the authentication page needs to know the email address.
    var email = getQueryParameter("email");
    cb(email);
  };

  navigator.id.completeAuthentication = function(cb) {
    // authentication is good, go to the provisioning page.
    var redirectTo = getQueryParameter("prov") + toQueryString({
      email: getQueryParameter("email")
    });

    location.href=redirectTo;
  };

  navigator.id.raiseAuthenticationFailure = function(reason) {
    // authentication failed, show why.
    var redirectTo = "https://checkmyidp.org/auth_failure" + toQueryString({
      reason: reason
    });

    location.href=redirectTo;
  };

  function getQueryParameter(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if(results == null)
      return "";
    else
      return decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function toQueryString(params) {
    var queryString = "?";
    var queryParams = [];
    for(var key in params) {
      queryParams.push(key + "=" + encodeURIComponent(params[key]));
    }
    return queryString + queryParams.join("&");
  }


}());
