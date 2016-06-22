"use strict";

const fs = require('fs');
const _ = require('lodash');
const childProcess = require('child_process');

const Promise = require('bluebird');
const log = require("debug")('common:userSettings');
const os = require("./os");

var contents;

/**
 * Load config data from file
 * @param configFile the file path of the config file.
 */
exports.load = function(configFile) {
  if(contents) {
    log("userSettings already loaded");
    return;
  }

  load(configFile);
};

exports.configFilePath = function() {
  return os.userDataPath() + '/SidekickConfig.json';
};

exports.configFilePath = function() {
  return os.userDataPath() + '/SidekickConfig.json';
};

function load() {
  var filePath = exports.configFilePath();
  log('loading user config file: ' + filePath);

  if(fs.existsSync(filePath)) {
    log("config existed");
    var tempContents = fs.readFileSync(filePath);
    contents = JSON.parse(tempContents);
    log('userSettings: ' + JSON.stringify(contents));
    upgradeFileContents(contents);
  } else {
    log("no config file");
    contents = createDefaultFile();
  }
}

/**
 * reloads the config file
 */
exports.reload = load;

/**
 * Save current config to file
 *
 * Danger - SYNCHRONOUS
 *
 * this is only called from the GUI side
 */
exports.save = function() {
  var contentsAsString = JSON.stringify(contents, null, 4);
  log('save: ' + contentsAsString);
  fs.writeFileSync(exports.configFilePath(), contentsAsString);
};


/**
 * Gets the named property specified.
 * @param propertyName the property to fetch update
 */
exports.getProperty = function(propertyName){
  if(!contents) {
    console.trace();
    throw new Error("userSettings not loaded - ensure it's loaded in a process before use");
  }
  return contents[propertyName];
};

/**
 * for remote side - better to avoid proxy objects
 */
exports.getPropertyJson = function(propertyName){
  return JSON.stringify(contents[propertyName]);
};

/**
 * Sets the named property to the value specified. Changes are not written to file until 'save' is called.
 * @param propertyName the property to update
 * @param newValue the new value to set the property to
 */
exports.setProperty = function(propertyName, newValue){
  if(!contents){
    contents = createDefaultFile();
  }
  contents[propertyName] = newValue;
};


exports.getGitBin = function() {
  // either user has configured it, or it's in a standard location
  return exports.getProperty("gitBin") || "git";
};

exports.isGitReachable = function(){
  var property = exports.getProperty("gitBin");
  log('gitBin: ' + property);
  return validGit(property || "git");
};

function validGit(gitPath) {
  return new Promise(function(resolve, reject) {
    childProcess.exec(gitPath + " --version", function(err, stdout) {
      if(err) {
        reject(err)
      } else {
        var isGit = /\bgit\b/.test(stdout);
        // if we're here, something is either git or pretending to be git :)
        isGit ? resolve() : reject(new Error("not git"));
      }
    });
  });
}

function createDefaultFile() {
  //add default entries here
  return {
    userSettings: {
      keyBindings: 'default',
      editorTheme: 'default',
      sidebarTheme: {colour: 'pale-elm', contrast: 'sk-menu-light'},
      collapseCode: true,
      useTabChar: true,
      numSpacesForTab: 2,
      currentPush: {
        showUnstagedFiles: true,
      }
    },
    repos: [],
  };
}

function upgradeFileContents(contents) {
  //add any settings that are in our current default but not in the loaded config
  _.defaults(contents.userSettings, createDefaultFile().userSettings);

  if(!contents.repos) {
    contents.repos = [];
  }

  if(!contents.userSettings.currentPush) {
    contents.userSettings.currentPush = {showUnstagedFiles: true};
  }

  //pre 0.3.18 sidebar colour upgrade
  if(!contents.userSettings.sidebarTheme.colour) {
    contents.userSettings.sidebarTheme = {colour: 'pale-elm', contrast: 'sk-menu-light'};
  }
}
