/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

const nopt = require('nopt');
const chalk = require('chalk');
const known = {
    production: Boolean,
    development: Boolean,
    json: Boolean,
    csv: Boolean,
    csvComponentPrefix: String,
    markdown: Boolean,
    out: require('path'),
    unknown: Boolean,
    onlyunknown: Boolean,
    version: Boolean,
    color: Boolean,
    start: String,
    help: Boolean,
    relativeLicensePath: Boolean,
    exclude: String,
    customPath: require('path'),
    customFormat: { },
    files: require('path'),
    summary: Boolean,
    failOn: String,
    onlyAllow: String,
    direct: Boolean,
    packages: String,
    excludePackages: String,
    excludePrivatePackages: Boolean,
};
const shorts = {
    "v": ["--version"],
    "h": ["--help"]
};

const raw = function(args) {
    return nopt(known, shorts, (args || process.argv));
};

/*istanbul ignore next */
const has = function(a) {
    const cooked = raw().argv.cooked;
    let ret = false;

    cooked.forEach(function(o) {
        if ((o === `--${a}`) || (o === `--no-${a}`)) {
            ret = true;
        }
    });

  return ret;
};

const clean = function(args) {
    const parsed = raw(args);
    delete parsed.argv;
    return parsed;
};

const setDefaults = function(parsed) {
    if (parsed === undefined) {
        parsed = clean();
    }
    /*istanbul ignore else*/
    if (parsed.color === undefined) {
        parsed.color = chalk.supportsColor;
    }
    if (parsed.json || parsed.markdown || parsed.csv) {
        parsed.color = false;
    }
    parsed.start = parsed.start || process.cwd();
    parsed.relativeLicensePath = Boolean(parsed.relativeLicensePath);

    parsed.direct = parsed.direct ? 0 : Infinity;

  return parsed;
};

const parse = function(args) {
    const parsed = clean(args);
    return setDefaults(parsed);
};

exports.defaults = setDefaults;
exports.has = has;
exports.raw = raw;
exports.parse = parse;
exports.shorts = shorts;
exports.known = known;
