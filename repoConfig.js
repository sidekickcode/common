"use strict";

var Promise = require("bluebird");
var _ = require('lodash');
var jsonWithComments = _.compose(JSON.parse, require("strip-json-comments"));
var Validator = require('jsonschema').Validator;
var jsonSchema = require('./repoConfig/sidekickSchema.json');

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
              var contentObj = jsonWithComments(contents);
              var validator = new Validator();
              var validationResult = validator.validate(contentObj, jsonSchema);
              if(validationResult.errors.length > 0){
                return Promise.reject('Json parsing error(s) for .sidekickrc');
              }
              return Promise.resolve(contentObj);
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
  var allAnalysers = [];
  _.each(repoConfig.languages, function(lang){
    _.forOwn(lang, function(value, key){
      var analyser = {};
      analyser[key] = value;
      allAnalysers.push(analyser);
    });
  });

  return allAnalysers;
};
