const treeify = require("treeify");
const path = require("path");
const { mkdir, readFile, writeFile, fileExists } = require("./utils");

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

exports.parseJson = async (jsonPath) => {
  if (typeof jsonPath !== "string") {
    return new Error("did not specify a path");
  }

  let jsonFileContents = "";

  try {
    jsonFileContents = await readFile(jsonPath);
    return JSON.parse(jsonFileContents);
  }
  catch (err) {
    return err;
  }
};

exports.asFiles = async (json, outDir) => {
  await mkdir(outDir);
  for (const moduleName of Object.keys(json)) {
    const licenseFile = json[moduleName].licenseFile;
    let fileContents = "";
    let outFileName = "";
    let outPath = "";

    if (licenseFile && await fileExists(licenseFile)) {
      fileContents = await readFile(licenseFile);
      outFileName = `${moduleName}-LICENSE.txt`;
      outPath = path.join(outDir, outFileName);
      await writeFile(outPath, fileContents);
      return;
    }
    console.warn(`no license file found for: ${moduleName}`);
  }
};
