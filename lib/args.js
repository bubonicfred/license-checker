/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

import {supportsColor} from 'chalk';
import nopt from 'nopt';

const known = {
  production : Boolean,
  development : Boolean,
  json : Boolean,
  csv : Boolean,
  csvComponentPrefix : String,
  markdown : Boolean,
  out : require('path'),
  unknown : Boolean,
  onlyunknown : Boolean,
  version : Boolean,
  color : Boolean,
  start : String,
  help : Boolean,
  relativeLicensePath : Boolean,
  exclude : String,
  customPath : require('path'),
  customFormat : {},
  files : require('path'),
  summary : Boolean,
  failOn : String,
  onlyAllow : String,
  direct : Boolean,
  packages : String,
  excludePackages : String,
  excludePrivatePackages : Boolean,
};
const shorts = {
  "v" : [ "--version" ],
  "h" : [ "--help" ]
};

var raw = function(
    args) { return nopt(known, shorts, (args || process.argv)); };

/*istanbul ignore next */
var has = function(a) {
  var cooked = raw().argv.cooked, ret = false;

  cooked.forEach(function(o) {
    if ((o === '--' + a) || (o === '--no-' + a)) {
      ret = true;
    }
  });

  return ret;
};

var clean = function(args) {
  var parsed = raw(args);
  delete parsed.argv;
  return parsed;
};

var setDefaults = function(parsed) {
  if (parsed === undefined) {
    parsed = clean();
  }
  /*istanbul ignore else*/
  if (parsed.color === undefined) {
    parsed.color = supportsColor;
  }
  if (parsed.json || parsed.markdown || parsed.csv) {
    parsed.color = false;
  }
  parsed.start = parsed.start || process.cwd();
  parsed.relativeLicensePath = Boolean(parsed.relativeLicensePath);

  if (parsed.direct) {
    parsed.direct = 0;
  } else {
    parsed.direct = Infinity;
  }

  return parsed;
};

var parse = function(args) {
  var parsed = clean(args);
  return setDefaults(parsed);
};

export const defaults = setDefaults;
const _has = has;
export {_has as has};
const _raw = raw;
export {_raw as raw};
const _parse = parse;
export {_parse as parse};
const _shorts = shorts;
export {_shorts as shorts};
const _known = known;
export {_known as known};
