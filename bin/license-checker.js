#!/usr/bin/env node

/*
Copyright (c) 2013, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/

const checker = require('../lib/index');
const args = require('../lib/args').parse();
const mkdirp = require('mkdirp');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');

if (args.help) {
    console.error(`license-checker@${require('../package.json').version}`);
    const usage = [
        '',
        '   --production only show production dependencies.',
        '   --development only show development dependencies.',
        '   --unknown report guessed licenses as unknown licenses.',
        '   --start [path of the initial json to look for]',
        '   --onlyunknown only list packages with unknown or guessed licenses.',
        '   --json output in json format.',
        '   --csv output in csv format.',
        '   --csvComponentPrefix column prefix for components in csv file',
        '   --out [filepath] write the data to a specific file.',
        '   --customPath to add a custom Format file in JSON',
        '   --exclude [list] exclude modules which licenses are in the comma-separated list from the output',
        '   --relativeLicensePath output the location of the license files as relative paths',
        '   --summary output a summary of the license usage',
        '   --failOn [list] fail (exit with code 1) on the first occurrence of the licenses of the semicolon-separated list',
        '   --onlyAllow [list] fail (exit with code 1) on the first occurrence of the licenses not in the semicolon-seperated list',
        '   --direct look for direct dependencies only',
        '   --packages [list] restrict output to the packages (package@version) in the semicolon-seperated list',
        '   --excludePackages [list] restrict output to the packages (package@version) not in the semicolon-seperated list',
        '   --excludePrivatePackages restrict output to not include any package marked as private',
        '',
        '   --version The current version',
        '   --help  The text you are reading right now :)',
        ''
    ];
    console.error(usage.join('\n'), '\n');
    process.exit(0);
}

if (args.version) {
    console.error(require('../package.json').version);
    process.exit(1);
}

if (args.failOn && args.onlyAllow) {
    console.error('--failOn and --onlyAllow can not be used at the same time. Choose one or the other.');
    process.exit(1);
} else {
    const argValue = args.failOn || args.onlyAllow;
    if (argValue && argValue.indexOf(',') >= 0) {
        const argName = args.failOn ? 'failOn' : 'onlyAllow';
        console.warn(`Warning: As of v17 the --${argName} argument takes semicolons as delimeters instead of commas (some license names can contain commas)`);
    }
}

checker.init(args, (err, json) => {

    let formattedOutput = '';

    if (err) {
        console.error('Found error');
        console.error(err);
    }

    if (shouldColorizeOutput(args)) {
        const keys = Object.keys(json);
        keys.forEach((key) => {
            const keyParts = key.split('@');
            const colorizedKey = chalk.blue(keyParts[0]) + chalk.dim('@') + chalk.green(keyParts[1]);
            json[colorizedKey] = json[key];
            delete json[key];
        });
    }

    if (args.json) {
        formattedOutput = `${JSON.stringify(json, null, 2)}\n`;
    } else if (args.csv) {
        formattedOutput = checker.asCSV(json, args.customFormat, args.csvComponentPrefix);
    } else if (args.markdown){
        formattedOutput = `${checker.asMarkDown(json, args.customFormat)}\n`;
    } else if (args.summary) {
        formattedOutput = checker.asSummary(json);
    } else {
        formattedOutput = checker.asSortedTree(json);
    }

    if (args.files) {
        checker.asFiles(json, args.files);
    } else if (args.out) {
        const dir = path.dirname(args.out);
        mkdirp.sync(dir);
        fs.writeFileSync(args.out, formattedOutput, 'utf8');
    } else {
        console.log(formattedOutput);
    }
});

function shouldColorizeOutput(args) {
    return args.color && !args.out && !(args.csv || args.json || args.markdown);
}
