"use strict";

var Promise = require("bluebird");
var _ = require('lodash');
var jsonWithComments = _.compose(JSON.parse, require("strip-json-comments"));
var Validator = require('jsonschema').Validator;
var gitignoreParser = require("gitignore-parser");

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var eslintConfigLoader = require('sidekick-eslint/configLoader');

var jsonSchema = require('./repoConfig/SidekickSchema.json');
var files = require('./files');

var CONFIG_FILENAME = '.sidekickrc';

// TODO add gitignore to excludes

/**
 * Load config data from .sidekickrc file
 * @param repoPath the abs file path of the config file.
 */
exports.load = function(repoPath) /*: RepoConfig */ {
  var filePath = path.join(repoPath, CONFIG_FILENAME);

  return fs.readFileAsync(filePath, {encoding: "utf8"})
    .then(exports.fromString, function(){return getDefault(repoPath)})
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

exports.fromString = (content) => RepoConfig(parse(content || "{}"));

// value object - immutable
function RepoConfig(conf /*: RawConfig */) {
  conf = _.extend({
    exclude: [],
    languages: {},
  }, conf);

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

// if we're missing a .sidekickrc, we do the 'right thing' as far as possible
function getDefault(repoPath) /*: RawConfig */ {

  //build up analysers in config - start with non language specific analysers
  var defaultConfig = require('./repoConfig/default_sidekickrc.json');

  if(repoHasFilesOfType(repoPath, '.js')){
    doJs();
  }

/*  if(repoHasFilesOfType(repoPath, '.ts')){
    doTs();
  }*/

/*  if(repoHasFilesOfType(repoPath, '.cs')){
    doCs();
  }*/

  return RepoConfig(defaultConfig);

  function repoHasFilesOfType(repoPath, type){
    return files.findFilesInDir(repoPath, type).length > 0;
  }

  /**
   * Add Javascript analysers if we find corresponding config files
   */
  function doJs(){
    defaultConfig.languages.js = {};
    
    doTodos();
    doEsLint();
    doJsHint();

    //add js-todos
    function doTodos(){
      defaultConfig.languages.js['sidekick-js-todos'] = {failCiOnError: false};
    }

    //add eslint if we find any eslint config
    function doEsLint(){
      if(eslintConfigLoader.hasConfigFile(repoPath)){
        defaultConfig.languages.js['sidekick-eslint'] = {failCiOnError: true};
      }
    }

    function doJsHint(){
      if(fs.statSync(path.join(repoPath, '/.jshintrc'))){
        defaultConfig.languages.js['sidekick-jshint'] = {failCiOnError: true};
      }
    }
  }

  //TODO get list of analysers from HTTP
  //TODO get list of known config files and create analyser entries if required
  //TODO get list of analyser ignores and add
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
    throw Error('invalid .sidekickrc: ' + JSON.stringify(validationResult.errors, null, 4));
  }

  /*json schema currently does not validate the format of additional properties, so do extra validation on the
    contents of a language - should be objects with a single key (analyserName) and a single value (object)
  */
  var throwaway = RepoConfig(raw);
  var analyserNotObj = _.some(throwaway.allAnalysers(), function(analyser){
    var notEmpty = _.keys(analyser).length > 0;
    if(notEmpty){
      var details = analyser[_.keys(analyser)[0]];
      return !_.isPlainObject(details);
    } else {
      return false;
    }
  });
  if(analyserNotObj){
    throw Error('Analysers must be objects');
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
