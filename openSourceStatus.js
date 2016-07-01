

const exec = require("child_process").exec;
const Promise = require("bluebird");

/**
 * ls-remote works fine for HTTPS repos. otherwise
 * the public/priv key is rejected.
 *
 * could just use HTTPS.
 */

exports.isOpenSource = function(repoUrl) {
  return Promise.fromNode(cb => {
    exec(`git ls-remote '${repoUrl}'`, {
      shell: "/bin/sh",
      env: {},
    }, (err, stdout, stderr) => {
      if(!err) {
        cb(null, true);
      } else if(/repository access denied/.test(stderr)) {
        cb(null, false);
      } else {
        cb(Error("could not verify repository status"));
      }
    });
  });
};
