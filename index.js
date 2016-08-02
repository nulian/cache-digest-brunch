'use strict';

// Documentation for Brunch plugins:
// https://github.com/brunch/brunch/blob/master/docs/plugins.md

var md5File = require("md5-file");
var path = require("path");
var rename = require("rename");
var fs = require("fs-extra");
var shelljs = require("shelljs");

// Remove everything your plugin doesn't need.
class CacheDigest {
  constructor(config) {
    // Replace 'plugin' with your plugin's name;
    this.config = config && config.plugins && config.plugins.cacheDigest;
  }

  // files: [File] => null
  // Executed when each compilation is finished.
  // Examples: Hot-reload (send a websocket push).
  onCompile(files, publicFiles) {
    this.renameFiles(files, false);
    this.renameFiles(publicFiles, true);
    this.convertAssetUrl(files, publicFiles);

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

  convertAssetUrl(files, publicFiles) {
    const assetRegex = /(asset-url\(['"](.*)['"]\))/;
    for (let file of files) {
      let assetLines = shelljs.grep(/asset-url\(['"].*['"]\)/, file).split('\n');
      let assetStrings = [];
      for (let line of assetLines) {
        const [fullString, assetUrl] = assetRegex.exec(line);
        debugger;
        assetStrings << {fullString: fullString, assetUrl: assetUrl, newAssetUrl: this.calculateFileMd5(assetUrl)};
      }

      shelljs.sed('-i', /asset-url\(['"](.*)['"]\)/, /\1/)
    }
    debugger;
  }

  calculateFileMd5(path) {
    const fileMd5 = md5File.sync(path);
    return rename(path, {suffix: `-${fileMd5}`});
  }

  // Allows to stop web-servers & other long-running entities.
  // Executed before Brunch process is closed.
  // teardown() {}
}

// Required for all Brunch plugins.
CacheDigest.prototype.brunchPlugin = true;

// Indicates which environment a plugin should be applied to.
// The default value is '*' for usual plugins and
// 'production' for optimizers.
//BrunchPlugin.prototype.defaultEnv = 'production';

module.exports = CacheDigest;
