/**
 * tracking - powered by google analytics setup to work on desktop
 *
 * TODO extract to own module
 */
"use strict";

const uuid = require('uuid');
const config = require("./persistentConfig");
const _ = require("lodash");
const universal = require("./universal");

const PREFIX = process.env.DEVELOPMENT ? "debug/" : "";

const debug = require("debug")("tracking");

var clientId;
var settings = require("./settings");
var setup = {
  version: "unknown",
};

exports.start = function(setupTo) {
 setup = setupTo; 
}

exports.error = function(err) {
  return send({
    // type
    t: "exception",
    // description
    exd: err.message + cleansedStackTrack(err),
    // is it fatal or not?
    exf: 0,
  });
};

exports.pageView = function(page) {
  return send({
    // host name
    dh: settings.analyticsPhonyDomain(),
    // page
    dp: cleanPage(page),
  });
};

function cleanPage(page) {
  return page.replace(/&?path=[^&=]+/g, "");
}

exports.angularIntegration = function($rootScope) {
  $rootScope.$on('$viewContentLoaded', function() {
    exports.pageView(getCurrentPage());
  });
};

exports.event = function(category, action, options){
  options = options || {};

  const params = {
    // type
    t: "event",
    // category
    ec: category,
    // action
    ea: action,
  };

  if(options.label) {
    params.el = options.label;
  }

  return send(params);
};

function getCurrentPage() {
  return location.hash.slice(1);
}

function send(params) {
  const completeParams = _.defaults({
    tid: settings.googleAnalyticsUa(),
    v: 1,
    // anonymously id the client
    cid: getClientId(),
    // custom dimensions:
    // cd1 = version
    cd1: setup.version,
  }, params);

  return sendRequest(`https://www.google-analytics.com/${PREFIX}collect`, completeParams)
  // the production measurement API does not supply error codes,
  // so only errors we get in production are connect issues (I guess)
  .then(function(res) {
    if(!process.env.DEVELOPMENT) {
      return;
    }

    // we're only sending 1 hit
    const result = res.data.hitParsingResult[0];

    if(result.valid) {
      return;
    } else {
      debug("could not send analytics: " + JSON.stringify(result, null, 4));
      throw new Error(JSON.stringify(result.parserMessage));
    }
  });
}

function getClientId() {
  if(clientId) {
    return clientId;
  }

  clientId = config.get("clientId");
  if(!clientId) {
    clientId = uuid();
    config.set("clientId", clientId);
  }

  return clientId;
}

exports._cleansedStackTrack = cleansedStackTrack;

function cleansedStackTrack(err) {
  // remove users file paths from trace (also squishes more into it)
  const stack = err.stack;
  if(!stack) {
    return "";
  }

  return stack
    // squish whitespace
    .replace(/ +/g, " ")
    // save space for ats
    .replace(/\bat /g, "@")

    // browser code - bundle, give bundle name
    .replace(/file:\/\/\/\S+?\/app\/browser\/dist\/bundle/g, "bundle")
    // everything else, leave only lastDirectoryName/basename
    .replace(/file:\/\/\/\S+(\/\S+\/)/g, "$1")

    // backend code - remove as much as poss
    .replace(/\S+(?=\/app\/)/g, "")
    // v8 @Context etc, not that useful
    .replace(/@\S+/g, "")

    // google drops everything after 150 bytes; do it here simply to make limit clear
    // and to avoid confusion if we don't see > 150 bytes sent to goog but <= 150 inside
    .slice(0, 150);
}

function sendRequest(url, queryParams) {
  if(universal.isRenderer()) {
    const url = new URL(url);
    _.each(queryParams, function(v, k) {
      url.searchParams.append(k, v); 
    });

    return fetch(url)
      .then(function(resp) {
        return resp.json();
      });

  } else {
    const axios = require("axios");
    return axios.get(url, { params: queryParams });
  }
}
