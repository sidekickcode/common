"use strict";

var Promise = require("bluebird");
var _ = require('lodash');
var jsonWithComments = _.compose(JSON.parse, require("strip-json-comments"));
var Validator = require('jsonschema').Validator;
var gitignoreParser = require("gitignore-parser");
const EventEmitter = require('events').EventEmitter;

var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

var jsonSchema = require('./repoConfig/SidekickSchema.json');
var files = require('./files');
//build up analysers in config - start with non language specific analysers
const DEFAULT_CONFIG = require('./repoConfig/default_sidekickrc.json');

var CONFIG_FILENAME = '.sidekickrc';

// TODO add gitignore to excludes

exports.events = new EventEmitter;

/**
 * Load config data from .sidekickrc file
 * @param repoPath the abs file path of the config file.
 */
exports.load = function(repoPath) /*: RepoConfig */ {
  var filePath = path.join(repoPath, CONFIG_FILENAME);

  return fs.readFileAsync(filePath, {encoding: "utf8"})
      .then(exports.fromString, function(){
        exports.events.emit('message', 'No .sidekickrc file found in this repo.');
        exports.events.emit('message', 'Will run default analysers (security and dependencies).');
        exports.events.emit('message', 'Parsing repo contents to determine which other analysers to run..');
        return getDefault(repoPath)
      });
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

  var defaultConfig = _.cloneDeep(DEFAULT_CONFIG);
  if(repoHasFilesOfType(repoPath, '.js')){
    exports.events.emit('message', 'JavaScript files found in this repo.');
    doJs();
  }

  if(repoHasFilesOfType(repoPath, '.ts')){
    exports.events.emit('message', 'TypeScript files found in this repo.');
    doTs();
  }

  if(repoHasFilesOfType(repoPath, '.cs')){
    exports.events.emit('message', 'CoffeeScript files found in this repo.');
    doCs();
  }

  return RepoConfig(parse(JSON.stringify(defaultConfig)));  //so that analysers get mutated

  function repoHasFilesOfType(repoPath, type){
    return files.findFilesInDir(repoPath, type).length > 0;
  }

  /**
   * Add Javascript analysers if we find corresponding config files
   */
  function doJs(){
    defaultConfig.languages.js = {};

    doTodos();
    doJscs();
    doEsLint();
    doJsHint();

    //add js-todos
    function doTodos(){
      exports.events.emit('message', '  Adding js-todos analyser.');
      defaultConfig.languages.js['sidekick-js-todos'] = {failCiOnError: false};
    }

    //add jscs
    function doJscs(){
      exports.events.emit('message', '  Adding jscs analyser.');
      defaultConfig.languages.js['sidekick-jscs'] = {failCiOnError: false};
    }

    //add eslint if we find any eslint config
    function doEsLint(){
      if(isEsLintConfig(repoPath)){
        exports.events.emit('message', '  eslint config file found - adding eslint analyser.');
        defaultConfig.languages.js['sidekick-eslint'] = {failCiOnError: true};
      } else {
        exports.events.emit('message', '  eslint config file not found. Will not run eslint.');
      }
    }

    function doJsHint(){
      try {
        fs.statSync(path.join(repoPath, '/.jshintrc'));
        exports.events.emit('message', '  jshint config file found - adding jshint analyser.');
        defaultConfig.languages.js['sidekick-jshint'] = {failCiOnError: true};
      }catch(e){
        exports.events.emit('message', '  jshint config file not found. Will not run jshint.');
      }
    }
  }

  function doTs(){
    defaultConfig.languages.ts = {};

    doTsLint();

    //add tslint if we find any tslint config
    function doTsLint(){
      try {
        fs.statSync(path.join(repoPath, '/tsconfig.json'));
        exports.events.emit('message', '  tslint config file found - adding tslint analyser.');
        defaultConfig.languages.ts['sidekick-tslint'] = {failCiOnError: true};
      }catch(e){
        exports.events.emit('message', '  tslint config file not found. Will not run tslint.');
      }
    }
  }

  function doCs(){
    defaultConfig.languages.cs = {};

    doCsLint();

    //add cslint if we find any cslint config
    function doCsLint(){
      try {
        fs.statSync(path.join(repoPath, '/coffeelint.json'));
        exports.events.emit('message', '  coffeelint config file found - adding coffeelint analyser.');
        defaultConfig.languages.cs['sidekick-coffeelint'] = {failCiOnError: true};
      }catch(e){
        exports.events.emit('message', '  coffeelint config file not found. Will not run coffeelint.');
      }
    }
  }

  //TODO get list of analysers from HTTP
  //TODO get list of known config files and create analyser entries if required
  //TODO get list of analyser ignores and add
}

exports._eslintConfigExists = isEsLintConfig;
function isEsLintConfig(repoPath){

  const CONFIG_FILES = [
    ".eslintrc.js",
    ".eslintrc.yaml",
    ".eslintrc.yml",
    ".eslintrc.json",
    ".eslintrc",
    "package.json"
  ];

  return getFilenameForDirectory(repoPath) !== null;

  /**
   * Retrieves the configuration filename for a given directory. It loops over all
   * of the valid configuration filenames in order to find the first one that exists.
   * @param {string} directory The directory to check for a config file.
   * @returns {?string} The filename of the configuration file for the directory
   *      or null if there is no configuration file in the directory.
   */
  function getFilenameForDirectory(directory) {

    var filename;

    for (var i = 0, len = CONFIG_FILES.length; i < len; i++) {
      filename = path.join(directory, CONFIG_FILES[i]);
      if (fs.existsSync(filename)) {
        if(_.endsWith(filename, 'package.json')){
          const config = jsonWithComments(fs.readFileSync(filename, {encoding: 'utf8'}));
          return config.eslintConfig ? filename : null;
        } else {
          return filename;
        }
      }
    }
    return null;
  }
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
