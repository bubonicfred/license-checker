import format from "format-package-json";
import { GitContributors } from "git-contributors";
import { join } from "path";

const opts = join(__dirname, "../");
const pkg = join(__dirname, "../package.json");
const json = require(pkg);

json.contributors = []; // clear it

GitContributors.list(opts, function (err, result) {
  result.forEach(function (item) {
    json.contributors.push([item.name, "<" + item.email + ">"].join(" "));
  });
  json.contributors.sort();
  format(pkg, json, function () {
    console.log("Wrote %s contributors to: %s", result.length, pkg);
  });
});
