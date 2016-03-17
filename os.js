"use strict";

var universal = require('./universal');
//ALWAYS require node versions of os and path because the browserify versions are next to useless in electron
var os = universal.isRenderer() ? universal.requireMain("os") : require("os");
var path = universal.isRenderer() ? universal.requireMain("path") : require("path");

var assert = require("assert");

/**
 * Returns a platform specific location where our app should write temporary files to (such as log files).
 * This will return the root tmp dir on posix systems, e.g. /tmp
 * @returns {*}
 */
exports.getTempDir = function(){
  if(exports.isPosix()){
    return '/tmp';  //all logs written to the root tmp dir on posix systems
  } else {
    return path.join(os.tmpDir(), 'sidekick');
  }
};

/**
 * Returns a platform specific file extention for use with log files.
 * @returns {*}
 */
exports.getLogFileExtension = function(){
  return exports.isPosix() ? '' : '.txt';
};


/**
 * Returns the platform specific location of a 'sidekick' directory that we should store our app's data into
 * @returns {*}
 */
exports.userDataPath = function() {
  var dataPath,
      homeDir = homedir();

  assert(path.isAbsolute(homeDir), "homedir path: " + homeDir + 'is not absolute!');
  switch(process.platform) {
    case 'win32':
      dataPath = path.join(homeDir, "/Sidekick");
      break;
    case 'darwin':
      dataPath = path.join(homeDir, "/Library/Application Support/sidekick");
      break;
    default:
      dataPath = path.join(homeDir, "/.local/sidekick");
  }
  assert(path.isAbsolute(dataPath), "user data path '" + dataPath + "' is not absolute!");
  return dataPath;

  function homedir() {
    return exports.isPosix() ? process.env.HOME : process.env.APPDATA;
  }
};

/**
 * Is the current OS posix based (OSX or Linux).
 * @returns {boolean}
 */
exports.isPosix = function(){
  return process.platform !== 'win32';
};

/**
 * Get the absolute path to the sk root directory in the app bundle.
 * Children of the root should be app, bin..
 * @returns {string}
 */
exports.absoluteSKPath = function() {
  return path.normalize(__dirname + "/../..");
};

/**
 * Returns the absolute path to the bundled node executable.
 * @returns {string}
 */
exports.getBundledNodeAbsPath = function(){
  if(process.env.DEVELOPMENT){
    return 'node';
  } else {
    var pathToNodeDir = path.join(exports.absoluteSKPath(), '/vendor/node/', process.platform);
    if(exports.isPosix()){
      return path.join(pathToNodeDir, '/bin/node');
    } else {
      return path.join(pathToNodeDir, '/node.exe');
    }
  }
};

/**
 * Returns the absolute path (including the process|executable name) of Electron
 * @returns {*}
 */
exports.getElectronAbsPath = function(){
  var absSKPath = exports.absoluteSKPath();
  var WIN_RESOURCES_DIR = '\\resources';
  var DARWIN_RESOURCES_DIR = '/Resources';
  var LINUX_RESOURCES_DIR = '/resources';

  if(process.env.DEVELOPMENT) {
    if(exports.isPosix()){
      //assume osx for development posix system
      return path.join(absSKPath, '/build/node_modules/electron-prebuilt/dist/Electron.app/Contents/MacOS/Electron');
    } else {
      return path.join(absSKPath, '/build/node_modules/electron-prebuilt/dist/Electron.exe');
    }
  } else {
    if(!exports.isPosix()){
      var pathToPackageRoot = absSKPath.substring(0, absSKPath.lastIndexOf(WIN_RESOURCES_DIR));
      return path.join(pathToPackageRoot, '/Sidekick.exe');
    } else {
      switch(process.platform){
        case 'darwin' :
          var pathToPackageRoot = absSKPath.substring(0, absSKPath.lastIndexOf(DARWIN_RESOURCES_DIR));
          return path.join(pathToPackageRoot, '/MacOS/Electron');
        case 'linux' :
          var pathToPackageRoot = absSKPath.substring(0, absSKPath.lastIndexOf(LINUX_RESOURCES_DIR));
          return path.join(pathToPackageRoot, '/sidekick');
      }
    }
  }
};
