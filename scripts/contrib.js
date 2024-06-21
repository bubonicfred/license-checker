#!/usr/bin/env node

const join = require('path').join;
const format = require('format-package-json');
const GitContributors = require('git-contributors').GitContributors;
const opts = join(__dirname, '../');
const pkg = join(__dirname, '../package.json');
const json = require(pkg);

json.contributors = []; // clear it

GitContributors.list(opts, (err, result) => {
    result.forEach((item) => {
        json.contributors.push([item.name, `<${item.email}>`].join(' '));
    });
    json.contributors.sort();
    format(pkg, json, () => {
        console.log('Wrote %s contributors to: %s', result.length, pkg);
    });
});
