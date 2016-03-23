"use strict";

var Promise = require("bluebird");
var _ = require('lodash');
var jsonWithComments = _.compose(JSON.parse, require("strip-json-comments"));
var Validator = require('jsonschema').Validator;
var jsonSchema = require('./repoConfig/SidekickSchema.json');
var gitignoreParser = require("gitignore-parser");

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var CONFIG_FILENAME = '.sidekickrc';


/**
 * Load config data from .sidekickrc file
 * @param repoPath the abs file path of the config file.
 */
exports.load = function(repoPath) /*: RepoConfig */ {
  var filePath = path.join(repoPath, CONFIG_FILENAME);

  return fs.readFileAsync(filePath, {encoding: "utf8"})
  .then((content) => RepoConfig(parse(content || "{}")))
  .catch(function(err){
    return Promise.reject(Error(`.sidekickrc could not be loaded at '${repoPath}': ${err.stack}`));
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

// value object - immutable
function RepoConfig(conf) {
  return {
    includedPaths(paths, language) {
      // TODO probably faster to | together, not sure right now
      var excludes = gitignoreParser.compile(conf.exclude.join("\n"));

      var languageRe = getLanguageFileRe(language);

      return paths.filter(checkPath);

      function checkPath(path) {
        if(!languageRe.test(path)) {
          return false;
        }

        return excludes.accepts(path);
      }
    },

    analyserFailsCi(analyser) {
      return Boolean(analyser.failCiOnError);
    },

    languages() {
      return _.keys(conf.languages);
    },

    analysers(lang) {
      return conf.languages[lang] || [];
    },

    analysersByLanguages() {
      return conf.languages;
    },

    allAnalysers(){
      return _.flatten(_.values(conf.languages));
    },
  };
}

function parse(string) {
  if(typeof string !== "string") {
    throw Error("need JSON config, not '" + string + "'");
  }

  const raw = _.defaults(jsonWithComments(string), {
    exclude: [],
    languages: {},
  });

  var validator = new Validator();
  var validationResult = validator.validate(raw, jsonSchema);
  if(validationResult.errors.length > 0){
    return Promise.reject('invalid .sidekickrc: ' + JSON.stringify(validationResult.errors, null, 4));
  }

  return reformat(raw);
}

function reformat(content) {
  return _.defaults({
    languages: _.mapValues(content.languages, function(analysers) {
      return _.map(analysers, function(config, name) {
        return _.defaults({ name }, config);
      })
    }),
  }, content);
}

function getLanguageFileRe(language) {
  if(language === 'all'){
    return new RegExp("\\.*$"); //we want to see all files for analysers for language 'all'
  } else {
    return new RegExp("\\." + language + "$");
  }
}
