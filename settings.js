"use strict";
const path = require('path');

var settings = {
  googleAnalyticsUa: 'UA-40226431-3',
  analyticsPhonyDomain: "desktop.sidekickjs.com",
  port: 42043,
};

Object.keys(settings).forEach(function(key) {
  exports[key] = function() {
    return settings[key];
  };
});

/**
 * returns the settings object - used by clients to output settings
 * @returns {{daemonLogPath: string, cliLogPath: string, mainLogPath: string, rendererLogPath: string,
 * commonLogPath: string, port: number, installedBinPath: string, iojsPath: string, electronPath: string,
 * analysers: {js: string[], coffee: string[], rb: string[]}}}
 */
module.exports.getSettings = function() {
  return settings;
};

