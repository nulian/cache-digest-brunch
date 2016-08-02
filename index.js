'use strict';

// Documentation for Brunch plugins:
// https://github.com/brunch/brunch/blob/master/docs/plugins.md

var md5File = require("md5-file");
var path = require("path");
var rename = require("rename");
var fs = require("fs-extra");

// Remove everything your plugin doesn't need.
class CacheDigest {
  constructor(config) {
    // Replace 'plugin' with your plugin's name;
    this.config = config && config.plugins && config.plugins.cacheDigest;
  }

  // file: File => Promise[Boolean]
  // Called before every compilation. Stops it when the error is returned.
  // Examples: ESLint, JSHint, CSSCheck.
  // lint(file) { return Promise.resolve(true); }

  // file: File => Promise[File]
  // Transforms a file data to different data. Could change the source map etc.
  // Examples: JSX, CoffeeScript, Handlebars, SASS.
  // compile(file) { return Promise.resolve(file); }

  // file: File => Promise[Array: Path]
  // Allows Brunch to calculate dependants of the file and re-compile them too.
  // Examples: SASS '@import's, Jade 'include'-s.
  // getDependencies(file) { return Promise.resolve(['dep.js']); }

  // file: File => Promise[File]
  // Usually called to minify or optimize the end-result.
  // Examples: UglifyJS, CSSMin.
  // optimize(file) { return Promise.resolve({data: minify(file.data)}); }

  // files: [File] => null
  // Executed when each compilation is finished.
  // Examples: Hot-reload (send a websocket push).
  onCompile(files, publicFiles) {
    this.renameFiles(files, false);
    this.renameFiles(publicFiles, true);

  }

  renameFiles(files, removeFiles) {
    for (let file of files) {
      const path = file.destinationPath ? file.destinationPath : file.path;
      const fileMd5 = md5File.sync(path);
      const newFileName = rename(path, {suffix: `-${fileMd5}`});
      fs.copySync(path, newFileName);
      if (removeFiles) {
        fs.removeSync(path);
      }
    }
  }

  // Allows to stop web-servers & other long-running entities.
  // Executed before Brunch process is closed.
  // teardown() {}
}

// Required for all Brunch plugins.
CacheDigest.prototype.brunchPlugin = true;

// Required for compilers, linters & optimizers.
// 'javascript', 'stylesheet' or 'template'
// BrunchPlugin.prototype.type = 'javascript';

// Required for compilers & linters.
// It would filter-out the list of files to operate on.
// BrunchPlugin.prototype.extension = 'js';
// BrunchPlugin.prototype.pattern = /\.js$/;

// Indicates which environment a plugin should be applied to.
// The default value is '*' for usual plugins and
// 'production' for optimizers.
//BrunchPlugin.prototype.defaultEnv = 'production';

module.exports = CacheDigest;
