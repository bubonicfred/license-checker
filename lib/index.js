/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

const UNKNOWN = "UNKNOWN";
const UNLICENSED = "UNLICENSED";
const fs = require("fs");
const path = require("path");
const read = require("read-installed");
const chalk = require("chalk");
const treeify = require("treeify");
const license = require("./license");
const licenseFiles = require("./license-files");
const debug = require("debug");
const mkdirp = require("mkdirp");
const spdxSatisfies = require("spdx-satisfies");
const spdxCorrect = require("spdx-correct");

// Set up debug logging
// https://www.npmjs.com/package/debug#stderr-vs-stdout
const debugError = debug("license-checker:error");
const debugLog = debug("license-checker:log");
debugLog.log = console.log.bind(console);

var flatten = (options) => {
  const moduleInfo = { licenses: UNKNOWN };
  const json = options.deps;
  let data = options.data;
  const key = `${json.name}@${json.version}`;
  const colorize = options.color;
  const unknown = options.unknown;
  let readmeFile = null;
  let licenseData = undefined; // Initialized as undefined
  let dirFiles = [];
  let files = [];
  let noticeFiles = [];
  let licenseFile = null; // Initialized as null

  if (json.private) {
    moduleInfo.private = true;
  }

  // If we have processed this key already, just return the data object.
  // This was added so that we don't recurse forever if there was a circular
  // dependency in the dependency tree.
  /* istanbul ignore next */
  if (data[key]) {
    return data;
  }

  if ((options.production && json.extraneous) || (options.development && !json.extraneous && !json.root)) {
    return data;
  }

  data[key] = moduleInfo;

  // Include property in output unless custom format has set property to false.
  const include = (property) => { return (options.customFormat === undefined || options.customFormat[property] !== false); };

  if (include("repository") && json.repository && (typeof json.repository === "object" && typeof json.repository.url === "string")) {
    moduleInfo.repository = json.repository.url.replace("git+ssh://git@", "git://");
    moduleInfo.repository = moduleInfo.repository.replace("git+https://github.com", "https://github.com");
    moduleInfo.repository = moduleInfo.repository.replace("git://github.com", "https://github.com");
    moduleInfo.repository = moduleInfo.repository.replace("git@github.com:", "https://github.com/");
    moduleInfo.repository = moduleInfo.repository.replace(/\.git$/, "");
  }
  if (include("url") && json.url && typeof json.url === "object") {
    moduleInfo.url = json.url.web;
  }
  if (json.author && typeof json.author === "object") {
    /* istanbul ignore else - This should always be there */
    if (include("publisher") && json.author.name) {
      moduleInfo.publisher = json.author.name;
    }
    if (include("email") && json.author.email) {
      moduleInfo.email = json.author.email;
    }
    if (include("url") && json.author.url) {
      moduleInfo.url = json.author.url;
    }
  }

  /* istanbul ignore next */
  if (unknown) {
    moduleInfo.dependencyPath = json.path;
  }

  /* istanbul ignore next */
  if (options.customFormat) {
    Object.keys(options.customFormat).forEach(function forEachCallback(item) {
      if (include(item) && json[item]) {
        // For now, we only support strings, not JSON objects
        if (typeof json[item] === "string") {
          moduleInfo[item] = json[item];
        }
      }
      else if (include(item)) {
        moduleInfo[item] = options.customFormat[item];
      }
    });
  }

  if (include("path") && json.path && typeof json.path === "string") {
    moduleInfo.path = json.path;
  }

  licenseData = json.license || json.licenses || undefined;

  if (json.path && (!json.readme || json.readme.toLowerCase().indexOf("no readme data found") > -1)) {
    readmeFile = path.join(json.path, "README.md");
    /* istanbul ignore if */
    if (fs.existsSync(readmeFile)) {
      json.readme = fs.readFileSync(readmeFile, "utf8").toString();
    }
  }

  if (licenseData) {
    /* istanbul ignore else */
    if (Array.isArray(licenseData) && licenseData.length > 0) {
      moduleInfo.licenses = [];
      licenseData.forEach((licenseItem) => {
        /* istanbul ignore else */
        if (typeof licenseItem === "object") {
          /* istanbul ignore next */
          moduleInfo.licenses.push(licenseItem.type || licenseItem.name);
        }
        else if (typeof licenseItem === "string") {
          moduleInfo.licenses.push(licenseItem);
        }
      });
    }
    else if (typeof licenseData === "object" && (licenseData.type || licenseData.name)) {
      moduleInfo.licenses = license(licenseData.type || licenseData.name);
    }
    else if (typeof licenseData === "string") {
      moduleInfo.licenses = license(licenseData);
    }
  }
  else if (license(json.readme)) {
    moduleInfo.licenses = license(json.readme);
  }

  if (Array.isArray(moduleInfo.licenses) && moduleInfo.licenses.length === 1) {
    moduleInfo.licenses = moduleInfo.licenses[0];
  }

  /* istanbul ignore else */
  if (json.path && fs.existsSync(json.path)) {
    dirFiles = fs.readdirSync(json.path);
    files = licenseFiles(dirFiles);

    noticeFiles = dirFiles.filter((filename) => {
      filename = filename.toUpperCase();
      const name = path.basename(filename).replace(path.extname(filename), "");
      return name === "NOTICE";
    });
  }

  files.forEach((filename, fileIndex) => {
    licenseFile = path.join(json.path, filename);
    // Checking that the file is in fact a normal file and not a directory for example.
    /* istanbul ignore else */
    if (!fs.lstatSync(licenseFile).isFile()) {
      return;
    }
    let content;
    if (!moduleInfo.licenses || moduleInfo.licenses.indexOf(UNKNOWN) > -1 || moduleInfo.licenses.indexOf("Custom:") === 0) {
      // Only re-check the license if we didn't get it from elsewhere
      content = fs.readFileSync(licenseFile, { encoding: "utf8" });
      moduleInfo.licenses = license(content);
    }

    if (fileIndex !== 0) {
      return;
    }
    // Treat the file with the highest precedence as licenseFile
    /* istanbul ignore else */
    if (include("licenseFile")) {
      moduleInfo.licenseFile = options.basePath ? path.relative(options.basePath, licenseFile) : licenseFile;
    }

    if (include("licenseText") && options.customFormat) {
      if (!content) {
        content = fs.readFileSync(licenseFile, { encoding: "utf8" });
      }
      /* istanbul ignore else */
      moduleInfo.licenseText = options._args && !options._args.csv ? content.trim() : content.replace(/"/g, "'").replace(/\r?\n|\r/g, " ").trim();
    }

    if (!(include("copyright") && options.customFormat)) {
      return;
    }
    if (!content) {
      content = fs.readFileSync(licenseFile, { encoding: "utf8" });
    }

    const linesWithCopyright = content
      .replace(/\r\n/g, "\n")
      .split("\n\n")
      .filter(function selectCopyRightStatements(value) {
        return value.startsWith("opyright", 1) // include copyright statements
          && !value.startsWith("opyright notice", 1) // exclude lines from from license text
          && !value.startsWith("opyright and related rights", 1);
      })
      .filter(function removeDuplicates(value, index, list) {
        return index === 0 || value !== list[0];
      });

    if (linesWithCopyright.length > 0) {
      moduleInfo.copyright = linesWithCopyright[0]
        .replace(/\n/g, ". ")
        .trim();
    }

    if (linesWithCopyright.length > 1) {
      moduleInfo.copyright += "*";
    }
  });

  noticeFiles.forEach((filename) => {
    const file = path.join(json.path, filename);
    /* istanbul ignore else */
    if (fs.lstatSync(file).isFile()) {
      moduleInfo.noticeFile = options.basePath ? path.relative(options.basePath, file) : file;
    }
  });

  /* istanbul ignore else */
  if (json.dependencies) {
    Object.keys(json.dependencies).forEach((name) => {
      const childDependency = json.dependencies[name];
      const dependencyId = `${childDependency.name}@${childDependency.version}`;
      if (data[dependencyId]) { // already exists
        return;
      }
      data = flatten({
        deps: childDependency,
        data,
        color: colorize,
        unknown,
        customFormat: options.customFormat,
        production: options.production,
        development: options.development,
        basePath: options.basePath,
        _args: options._args,
      });
    });
  }
  if (!json.name || !json.version) {
    delete data[key];
  }
  return data;
};

exports.init = function (options, callback) {
  debugLog("scanning %s", options.start);

  if (options.customPath) {
    options.customFormat = this.parseJson(options.customPath);
  }
  const opts = {
    dev: true,
    log: debugLog,
    depth: options.direct,
  };

  if (options.production || options.development) {
    opts.dev = false;
  }

  const toCheckforFailOn = [];
  const toCheckforOnlyAllow = [];
  let checker = null;
  let pusher;
  if (options.onlyAllow) {
    checker = options.onlyAllow;
    pusher = toCheckforOnlyAllow;
  }
  if (options.failOn) {
    checker = options.failOn;
    pusher = toCheckforFailOn;
  }
  if (checker && pusher) {
    checker.split(";").forEach((licenseName) => {
      const trimmed = licenseName.trim();
      /* istanbul ignore else */
      if (trimmed.length > 0) {
        pusher.push(trimmed);
      }
    });
  }

  read(options.start, opts, (err, json) => {
    const data = flatten({
      deps: json,
      data: {},
      color: options.color,
      unknown: options.unknown,
      customFormat: options.customFormat,
      production: options.production,
      development: options.development,
      basePath: options.relativeLicensePath ? json.path : null,
      _args: options,
    });
    const colorize = options.color;
    const sorted = {};
    let filtered = {};
    const exclude = options.exclude && options.exclude.match(/([^\\\][^,]|\\,)+/g).map((excludedLicense) => { return excludedLicense.replace(/\\,/g, ",").replace(/^\s+|\s+$/g, ""); });
    let inputError = null;

    const colorizeString = (string) => { return colorize ? chalk.bold.red(string) : string; };

    Object.keys(data).sort().forEach((item) => {
      if (data[item].private) {
        data[item].licenses = colorizeString(UNLICENSED);
      }
      /* istanbul ignore next */
      if (!data[item].licenses) {
        data[item].licenses = colorizeString(UNKNOWN);
      }
      if (options.unknown && (data[item].licenses && data[item].licenses !== UNKNOWN) && data[item].licenses.indexOf("*") > -1) {
        /* istanbul ignore if */
        data[item].licenses = colorizeString(UNKNOWN);
      }
      /* istanbul ignore else */
      if (data[item]) {
        if (options.onlyunknown) {
          if (data[item].licenses.indexOf("*") > -1
            || data[item].licenses.indexOf(UNKNOWN) > -1) {
            sorted[item] = data[item];
          }
        }
        else {
          sorted[item] = data[item];
        }
      }
    });

    if (!Object.keys(sorted).length) {
      err = new Error("No packages found in this path..");
    }

    if (exclude) {
      const transformBSD = (spdx) => { return spdx === "BSD" ? "(0BSD OR BSD-2-Clause OR BSD-3-Clause OR BSD-4-Clause)" : spdx; };
      const invert = (fn) => { return (spdx) => { return !fn(spdx); }; };
      const spdxIsValid = (spdx) => { return spdxCorrect(spdx) === spdx; };

      const validSPDXLicenses = exclude.map(transformBSD).filter(spdxIsValid);
      const invalidSPDXLicenses = exclude.map(transformBSD).filter(invert(spdxIsValid));
      const spdxExcluder = `( ${validSPDXLicenses.join(" OR ")} )`;

      Object.keys(sorted).forEach((item) => {
        let licenses = sorted[item].licenses;
        /* istanbul ignore if - just for protection */
        if (licenses) {
          licenses = [].concat(licenses);
          let licenseMatch = false;
          licenses.forEach((licenseItem) => {
            /* istanbul ignore if - just for protection */
            if (licenseItem.indexOf(UNKNOWN) >= 0) { // necessary due to colorization
              filtered[item] = sorted[item];
              return;
            }
            if (licenseItem.indexOf("*") >= 0) {
              licenseItem = licenseItem.substring(0, licenseItem.length - 1);
            }
            if (licenseItem === "BSD") {
              licenseItem = "(0BSD OR BSD-2-Clause OR BSD-3-Clause OR BSD-4-Clause)";
            }

            if (invalidSPDXLicenses.indexOf(licenseItem) >= 0) {
              licenseMatch = true;
            }
            else if (spdxCorrect(licenseItem) && spdxSatisfies(spdxCorrect(licenseItem), spdxExcluder)) {
              licenseMatch = true;
            }
          });
          if (!licenseMatch) {
            filtered[item] = sorted[item];
          }
          return;
        }
        filtered[item] = sorted[item];
      });
    }
    else {
      filtered = sorted;
    }

    let restricted = filtered;

    // package whitelist
    if (options.packages) {
      const packages = options.packages.split(";");
      restricted = {};
      Object.keys(filtered).forEach((key) => {
        if (packages.includes(key)) {
          restricted[key] = filtered[key];
        }
      });
    }

    // package blacklist
    if (options.excludePackages) {
      const excludedPackages = options.excludePackages.split(";");
      restricted = {};
      Object.keys(filtered).forEach((key) => {
        if (!excludedPackages.includes(key)) {
          restricted[key] = filtered[key];
        }
      });
    }

    if (options.excludePrivatePackages) {
      Object.keys(filtered).forEach((key) => {
        /* istanbul ignore next - I don't have access to private packages to test */
        if (restricted[key] && restricted[key].private) {
          delete restricted[key];
        }
      });
    }

    Object.keys(restricted).forEach((item) => {
      if (toCheckforFailOn.length > 0 && toCheckforFailOn.includes(restricted[item].licenses)) {
        throw new Error(`Found license defined by the --failOn flag: "${restricted[item].licenses}". Exiting.`);
      }
      if (toCheckforOnlyAllow.length <= 0) {
        return;
      }
      let good = false;
      toCheckforOnlyAllow.forEach((k) => {
        good = !restricted[item].licenses.includes(k) && !good ? false : true;
      });
      if (!good) {
        throw new Error(`Package "${item}" is licensed under "${restricted[item].licenses}" which is not permitted by the --onlyAllow flag. Exiting.`);
      }
    });

    /* istanbul ignore next */
    if (err) {
      debugError(err);
      inputError = err;
    }

    // Return the callback and variables nicely
    callback(inputError, restricted);
  });
};

exports.print = (sorted) => {
  console.log(exports.asSortedTree(sorted));
};

exports.asSortedTree = (sorted) => { return treeify.asTree(sorted, true); };

exports.asSummary = (sorted) => {
  const licenseCountObj = {};
  const licenceCountArray = [];
  const sortedLicenseCountObj = {};

  Object.keys(sorted).forEach((key) => {
    /* istanbul ignore else */
    if (sorted[key].licenses) {
      licenseCountObj[sorted[key].licenses] = licenseCountObj[sorted[key].licenses] || 0;
      licenseCountObj[sorted[key].licenses]++;
    }
  });

  Object.keys(licenseCountObj).forEach((licenseKey) => {
    licenceCountArray.push({ license: licenseKey, count: licenseCountObj[licenseKey] });
  });

  /* istanbul ignore next */
  licenceCountArray.sort((a, b) => { return b.count - a.count; });

  licenceCountArray.forEach((licenseObj) => {
    sortedLicenseCountObj[licenseObj.license] = licenseObj.count;
  });

  return treeify.asTree(sortedLicenseCountObj, true);
};

exports.asCSV = (sorted, customFormat, csvComponentPrefix) => {
  const text = [];
  let textArr = [];
  let lineArr = [];
  const prefixName = "\"component\"";

  if (customFormat && Object.keys(customFormat).length > 0) {
    textArr = [];
    if (csvComponentPrefix) { textArr.push(prefixName); }
    textArr.push("\"module name\"");
    Object.keys(customFormat).forEach((item) => {
      textArr.push(`"${item}"`);
    });
  }
  else {
    textArr = [];
    /* istanbul ignore next */
    if (csvComponentPrefix) { textArr.push(prefixName); }
    ["\"module name\"", "\"license\"", "\"repository\""].forEach((item) => {
      textArr.push(item);
    });
  }
  text.push(textArr.join(","));

  Object.keys(sorted).forEach((key) => {
    const module = sorted[key];
    let line = "";
    lineArr = [];

    // Grab the custom keys from the custom format
    if (customFormat && Object.keys(customFormat).length > 0) {
      if (csvComponentPrefix) {
        lineArr.push(`"${csvComponentPrefix}"`);
      }
      lineArr.push(`"${key}"`);
      Object.keys(customFormat).forEach((item) => {
        lineArr.push(`"${module[item]}"`);
      });
    }
    else {
      /* istanbul ignore next */
      if (csvComponentPrefix) {
        lineArr.push(`"${csvComponentPrefix}"`);
      }
      lineArr.push([
                `"${key}"`,
                `"${module.licenses || ""}"`,
                `"${module.repository || ""}"`,
      ]);
    }
    line = lineArr.join(",");
    text.push(line);
  });

  return text.join("\n");
};

/**
* Exports data as markdown (*.md) file which has it's own syntax.
* @method
* @param  {JSON} sorted       The sorted JSON data from all packages.
* @param  {JSON} customFormat The custom format with information about the needed keys.
* @return {String}            The returning plain text.
*/
exports.asMarkDown = (sorted, customFormat) => {
  const text = [];
  if (customFormat && Object.keys(customFormat).length > 0) {
    Object.keys(sorted).forEach((sortedItem) => {
      text.push(` - **[${sortedItem}](${sorted[sortedItem].repository})**`);
      Object.keys(customFormat).forEach((customItem) => {
        text.push(`    - ${customItem}: ${sorted[sortedItem][customItem]}`);
      });
    });
  }
  else {
    Object.keys(sorted).forEach((key) => {
      const module = sorted[key];
      text.push(`[${key}](${module.repository}) - ${module.licenses}`);
    });
  }
  return text.join("\n");
};

exports.parseJson = (jsonPath) => {
  if (typeof jsonPath !== "string") {
    return new Error("did not specify a path");
  }

  let jsonFileContents = "";

  try {
    jsonFileContents = fs.readFileSync(jsonPath, { encoding: "utf8" });
    return JSON.parse(jsonFileContents);
  }
  catch (err) {
    return err;
  }
};

exports.asFiles = (json, outDir) => {
  mkdirp.sync(outDir);
  Object.keys(json).forEach((moduleName) => {
    const licenseFile = json[moduleName].licenseFile;
    let fileContents = "";
    let outFileName = "";
    let outPath = "";
    let baseDir = "";

    if (licenseFile && fs.existsSync(licenseFile)) {
      fileContents = fs.readFileSync(licenseFile);
      outFileName = `${moduleName}-LICENSE.txt`;
      outPath = path.join(outDir, outFileName);
      baseDir = path.dirname(outPath);
      mkdirp.sync(baseDir);
      fs.writeFileSync(outPath, fileContents, "utf8");
      return;
    }
    console.warn(`no license file found for: ${moduleName}`);
  });
};
