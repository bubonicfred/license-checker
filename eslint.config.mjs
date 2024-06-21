import globals from "globals";
import pluginJs from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";

import StylisticPlugin from "@stylistic/eslint-plugin";

export default [
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.node } },
  { plugins: {
    "@stylistic": stylistic,
  } },
  stylistic.configs.customize({
    // the following options are the default values
    indent: 2,
    quotes: "double",
    semi: true,
    jsx: true,
    // ...
  }), StylisticPlugin.configs["disable-legacy"],
  pluginJs.configs.recommended,
];
