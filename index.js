'use strict';

// Documentation for Brunch plugins:
// https://github.com/brunch/brunch/blob/master/docs/plugins.md

var md5File = require("md5-file");
var url = require("url");
var rename = require("rename");
var fs = require("fs-extra");
var shelljs = require("shelljs");
var escapeStringRegExp = require("escape-string-regexp");
var glob = require("glob");

// Remove everything your plugin doesn't need.
class CacheDigest {
  constructor(config) {
    // Replace 'plugin' with your plugin's name;
    this.env = config && config.env[0];
    this.config = config && config.plugins && config.plugins.cacheDigest;
    this.files = config && config.plugins && config.plugins.cacheDigest && config.plugins.cacheDigest.files;
  }

  // files: [File] => null
  // Executed when each compilation is finished.
  // Examples: Hot-reload (send a websocket push).
  onCompile(files, publicFiles) {
    if (!global.processingPrecompile) {
      if (this.env == "production") {
        this.renameFiles(files, false);
        this.renameFiles(publicFiles, true);
        this.renameFiles(this.files, true);
      }
      this.convertAssetUrl(files, publicFiles);
    }
  }

  renameFiles(files, removeFiles) {
    for (let file of files) {
      const path        = file.destinationPath ? file.destinationPath: file.path;
      const newFileName = this.calculateFileMd5(path);
      const targetDir   = path.replace(/\/[^\/]*$/, '');
      if (file.destinationPath) {
        file.destinationPath = newFileName;
      } else {
        file.path = newFileName;
      }
      fs.copySync(path, newFileName);
      if (removeFiles) {
        fs.removeSync(path);
      }
    }
  }

  convertAssetUrl(files, publicFiles) {
    const assetRegex = /(?:asset-url|asset-path)\(['"]?([^"'()]*)['"]?\)/;
    const assetRegexG = /(?:asset-url|asset-path)\(['"]?([^"'()]*)['"]?\)/g;
    for (let file of files) {
      const fileContent = fs.readFileSync(file.path, 'utf8');
      let assetLines = fileContent.match(assetRegexG) || [];
      let assetStrings = [];
      for (let line of assetLines) {
        const [fullString, assetUrl] = assetRegex.exec(line);
        const parsedAssetUrl = url.parse(assetUrl);
        let fileAsset = this.getKeyByValue(publicFiles, parsedAssetUrl.pathname);
        if (publicFiles.length == 0 && !fileAsset) {
          fileAsset = this.getAssetByFileSearch(parsedAssetUrl.pathname)
        }
        if (fileAsset) {
          assetStrings.push({fullString: fullString, assetUrl: assetUrl, newAssetUrl: fileAsset.destinationPath});
        } else {
          console.error(`Cannot find ${assetUrl}`);
        }
      }
      for (let asset of assetStrings) {
        const parsedUrl = url.parse(asset.assetUrl);
        const extraQueryChars = asset.assetUrl.replace(parsedUrl.pathname, "");
        shelljs.sed('-i', new RegExp(`asset-url[(]['"]?${escapeStringRegExp(asset.assetUrl)}['"]?[)]`), `url(${asset.newAssetUrl.replace('public/', '/')}${extraQueryChars})`, file.path);
        shelljs.sed('-i', new RegExp(`asset-path[(]['"]?${escapeStringRegExp(asset.assetUrl)}['"]?[)]`), `${asset.newAssetUrl.replace('public/', '/')}${extraQueryChars}`, file.path);
      }
    }
  }

  calculateFileMd5(path) {
    const fileMd5 = md5File.sync(path);
    return rename(path, {suffix: `-${fileMd5}`});
  }

  getKeyByValue(object, value) {
    const valueExp = new RegExp(`${value}$`);
    return object.find(value => value.path.match(valueExp));
  }

  getAssetByFileSearch(value) {
    const originPath = glob.sync(`app/assets/**/${value}`);
    const [filename, extension] = value.split('.');
    const destPath = glob.sync(`public/assets/**/${filename}*${extension}`);
    if (originPath.length > 0 && destPath.length > 0) {
      return {path: originPath[0], destinationPath: destPath[0]};
    }
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
//CacheDigest.prototype.defaultEnv = 'production';

module.exports = CacheDigest;
