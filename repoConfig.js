"use strict";

var Promise = require("bluebird");
var _ = require('lodash');
var jsonWithComments = _.compose(JSON.parse, require("strip-json-comments"));

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var CONFIG_FILENAME = '.sidekickrc';

/**
 * Load config data from .sidekickrc file
 * @param repoPath the abs file path of the config file.
 */
exports.load = function(repoPath) {
  var filePath = path.join(repoPath, CONFIG_FILENAME);

  return fs.statAsync(filePath)
    .then(function(stat){
      return fs.readFileAsync(filePath, {encoding: "utf8"})
        .then(function(contents){
          return Promise.resolve(jsonWithComments(contents));
        })
    }, function(err){
      return Promise.reject(Error('.sidekickrc file not found in \'' + repoPath + '\''));
    })
};

/**
 * Save the .sidekickrc file and commit the modifications
 * @param repoPath the abs path to the repo containing the .sidekickrc file
 * @param contents the contents to save
 */
exports.save = function(repoPath, contents) {
  var filePath = path.join(repoPath, CONFIG_FILENAME);
  var contentsAsString = JSON.stringify(contents, null, 4);

  return fs.writeFile(filePath, contentsAsString)
};

exports.getAllAnalysers = function(repoConfig){
  var allAnalysers = _.uniq(_.flatten(_.map(repoConfig.languages, function(lang){
    var analysersForLang = [];
    _.forOwn(lang, function(value, key){
      analysersForLang.push(value);
    });
    return _.uniq(_.flatten(analysersForLang));
  })));

  return allAnalysers;
  //make easy - array of {name: analyserName, analyserProp1: prop1Value,...}
  /*var easy = _.map(allAnalysers, function(analyser){
    var name = Object.keys(analyser)[0];  //only 1 prop {"sidekick-eslint": {config}}
    var obj = {"name": name};
    return _.defaults(obj, analyser[name]);
  });
  return easy;*/
};
