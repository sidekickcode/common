/**
 * var log = logger(logger.LOG, "ui");
 *
 * ## .pp(object)
 *
 * debugs
 *
 * ## .later
 *
 * promise.then(log.error.later("foo bar"));
 */
"use strict";
var _ = require("lodash");
var util = require("util");
var inspect = require("util").inspect;
var os = require('./os');
var universal = require("./universal");
var fs = universal.isRenderer() ? universal.requireMain("fs") : require("fs");

var DEBUG = 0;
var INFO = 1;
var LOG = 2;
var WARN = 3;
var ERROR = 4;

var levels = {
  debug: DEBUG,
  info: INFO,
  log: LOG,
  warn: WARN,
  error: ERROR,
};

var root = module.exports = exports = logger(
    LOG,
    ""
);

root.browserWrite = browserWrite;
root.writeToPath = writeToPath;
root.logToConsole = defaultWriter;

exports.DEBUG = DEBUG;
exports.INFO = INFO;
exports.LOG = LOG;
exports.WARN = WARN;
exports.ERROR = ERROR;

exports.includeFileAndLine = true;

/*  /tmp/sidekick on posix seems fine but windows likes explicit creation*/
if(!os.isPosix()){
  ensureLogPathExists();
}

var pp = function(x) {
  return inspect(x, { depth: null });
};

function logger(level, prefix, write) {

  level = level == null ? LOG : level;
  prefix = prefix == null ? "" : prefix;
  write = write || defaultWriter();

  function log(logLevel, msg) {
    if(logLevel >= level) {
      var formatted = fileAndLine() + " " + util.format.apply(null, [msg].concat(_.slice(arguments, 2)));
      write(logLevel, new Date().toISOString() + " " + prefix + formatted);
    }
  }

  function fileAndLine() {
    if(!exports.includeFileAndLine) {
      return "";
    }
    var stack = new Error().stack;
    return stack.split("\n")[3]
    // replace preamble
        .replace(/^\s*at /, "")
        // just file please
        .replace(/^.*?\/app/, "")
        // remove column name
        .replace(/:\d+\)?$/, "");
  }

  var api = log.bind(null, LOG);

  api.derive = function(setup) {
    setup = _.defaults(setup || {}, {
      level: null,
      prefix: null,
      tags: [],
    });
    if(typeof setup !== "object") {
      throw new Error("use a setup object to derive a new logger");
    }
    var prefixSuffix = setup.tags.length === 0 ? "" : "[" + setup.tags.join("] [") + "] ";
    var newPrefix = (setup.prefix == null ? prefix : setup.prefix) + prefixSuffix;
    var newLevel = setup.level == null ? level : setup.level;
    return logger(newLevel, newPrefix, setup.write || write);
  };

  api.trace = function(msg) {
    var error = new Error;
    api((msg || "") + error.stack.split("\n").slice(3));
  };

  api.create = function(prefix) {
    return api.derive({
      tags: [prefix],
    });
  };

  api.setPrefix = function(to) {
    prefix = to;
  };

  api.setWriter = function(to) {
    write = to;
  };

  api.setLevel = function(to) {
    level = to;
  };

  Object.keys(levels).forEach(function(key) {
    var level = levels[key];
    var fn = api[key] = log.bind(null, level);

    fn.pp = function(x) {
      fn(pp(x));
    };

    fn.later = function later(msg) {
      return function() {
        fn(msg);
      };
    };

  });

  api.later = api.log.later;
  api.pp = api.log.pp;

  return api;
}

function defaultWriter() {
  return logToConsole;
}

function browserWrite(path) {
  var pathWriter = writeToPath(path);
  return function combinedWrite(level, msg) {
    pathWriter(level, msg);
    // special case - browser console only logs at warn
    if(level >= WARN) {
      logToConsole(level, msg);
    }
  }
}

function writeToPath(path) {
  var stream;
  return function pathWriter(level, msg) {
    if(!stream) {
      if(process.type === "renderer") {
        stream = fs.createWriteStream(path, {
          flags: "a+",
        });
      } else {
        var fd = fs.openSync(path, 'a+');
        stream = new fs.SyncWriteStream(fd, {
          autoClose: false,
        });
        stream._type = 'fs';
      }
    }

    stream.write(msg + "\n");
  }
}

function logToConsole(level, msg) {
  switch(level) {
    case ERROR:
      return console.error(msg);

    case WARN:
      return console.warn(msg);

    default:
      return console.log(msg);
  }
}

function ensureLogPathExists(){
  var logFilePath = os.getTempDir();
  var WE_NEED_WRITE_ACCCESS = '0744';

  ensureExists(logFilePath, WE_NEED_WRITE_ACCCESS, function(err) {
    if (err) {
      throw new Error('Unable to access log dir: ' + logFilePath);
    }
  });

  function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
      cb = mask;
      mask = '0777';
    }
    fs.mkdir(path, mask, function(err) {
      if (err) {
        if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
        else cb(err); // something else went wrong
      } else cb(null); // successfully created folder
    });
  }
}
