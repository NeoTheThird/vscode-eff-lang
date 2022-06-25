#!/usr/bin/env node
"use strict";
/*
 * Copyright (C) 2022 Johannah Sprinz <neo@neothethird.de>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const Atomizr = require("node-atomizr");
const PLIST = require("apple-plist-parser");
const fs = require("fs-extra");
const path = require("path");
const { version } = require("./package.json");

const IN = "./lib/eff/etc/eff.tmbundle";
const SNIPPETS_OUT = "./snippets.json";
const GRAMMAR_OUT = "./syntaxes/eff.tmLanguage.json";
const PREFERENCES_OUT = "./language-configuration.json";

const convert_snippets = () =>
  fs
    .readdir(IN)
    .then(files =>
      Promise.all(
        files
          .filter(t => t.endsWith("sublime-snippet"))
          .map(async t =>
            Atomizr.sublime2vscode(await fs.readFile(path.join(IN, t)), {
              is_snippet: true
            })
          )
      )
    )
    .then(json =>
      json.reduce(
        (acc, snippet) => ({
          ...acc,
          ...JSON.parse(snippet)
        }),
        {}
      )
    )
    .then(data => fs.writeJSON(SNIPPETS_OUT, data));

const convert_grammar = () =>
  fs.writeJSON(GRAMMAR_OUT, {
    $schema:
      "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    ...PLIST.parse(path.join(IN, "eff.tmLanguage"))
  });

const convert_preferences = async () =>
  fs.writeJSON(PREFERENCES_OUT, {
    ...(await fs.readJSON("./lib/_language-configuration.json")),
    indentationRules: PLIST.parse(path.join(IN, "Indent rules.tmPreferences"))
      .settings
  });

const get_eff_version = () =>
  fs
    .readFile("./lib/eff/src/00-utils/config.ml")
    .then(r => r.toString().split('let version = "')[1].split('"')[0])
    .then(
      eff_version =>
        (!version.startsWith(eff_version) &&
          console.warn(
            `Eff version is ${eff_version}, package version is ${version}. Maybe push an update?`
          )) ||
        eff_version
    );

Promise.all([
  get_eff_version(),
  convert_snippets(),
  convert_grammar(),
  convert_preferences()
]).then(([version]) =>
  console.log(`Sucessfully built from Eff version ${version}!`)
);
