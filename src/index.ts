#!/usr/bin/env node

import chalk from "chalk";
import glob from "glob";

import { formatFileStructure } from "./index/formatFileStructure";
import { version } from "../package.json";
import { existsSync, lstatSync, readdirSync } from "fs-extra";
import path from "path";
// import { existsSync } from "fs-extra";

const { argv, env } = process;
const defaults = {
  options: {
    help: false,
    version: false,
    detectRoots: false,
  },
  paths: [],
};

type ParsedArgs = {
  options: { help: boolean; version: boolean; detectRoots: boolean };
  paths: string[];
};

const printVersion = () => console.log("v" + version);
const printHelp = (exitCode: number) => {
  console.log(
    chalk`{blue destiny} - Prettier for file structures.

{bold USAGE}

  {blue destiny} [option...] [{underline path}]

  The {underline path} argument can consist of either a {bold file path} or a {bold glob}.

{bold OPTIONS}

  -V, --version            output version number
  -h, --help               output usage information
  -dr, --detect-roots      structure after the first level
  `
  );

  return process.exit(exitCode);
};

const parseArgs = (args: any[]): ParsedArgs =>
  args.reduce((acc, arg) => {
    switch (arg) {
      case "-h":
      case "--help":
        acc.options.help = true;
        break;
      case "-V":
      case "--version":
        acc.options.version = true;
        break;
      case "-dr":
      case "--detect-roots":
        acc.options.detectRoots = true;
        break;
      default:
        acc.paths.push(arg);
    }

    return acc;
  }, defaults);

const pathsToFiles = (paths: string[], detectRoots: boolean) => {
  const files: string[][] = [];
  while (paths.length) {
    const p = paths.pop();
    if (!p) {
      continue;
    }
    if (glob.hasMagic(p)) {
      const globFiles = glob.sync(p);
      if (!globFiles.length) {
        throw new Error("Could not find any files for: " + p);
      }
      files.push(
        globFiles.filter(x => {
          if (lstatSync(x).isFile()) {
            return true;
          } else {
            console.log("Skipping non files: ", x);
            return false;
          }
        })
      );
    } else if (!existsSync(p)) {
      throw new Error("Unable to resolve the path: " + p);
    } else {
      const stats = lstatSync(p);
      if (stats.isDirectory()) {
        if (detectRoots) {
          paths.push(...readdirSync(path.resolve(p)).map(x => path.join(p, x)));
          detectRoots = false;
        } else {
          paths.push(path.join(p, "/**/*.*"));
        }
      } else if (stats.isFile()) {
        files.push([p]);
      } else {
        console.log("Skipping: ", p);
      }
    }
  }

  return files;
};

export const run = async (args: any[]) => {
  const { options, paths } = parseArgs(args);

  if (options.help) return printHelp(0);
  if (options.version) return printVersion();
  if (paths.length === 0) return printHelp(1);

  const filesToStructure = pathsToFiles(paths, options.detectRoots);
  const filesToFixImports = filesToStructure.flat();

  if (!filesToStructure.length) {
    console.log("Could not find any files to structure");
    return;
  }

  // console.log("Files to structure:");
  // console.log(filesToStructure);
  await formatFileStructure(filesToStructure, filesToFixImports);
};

if (env.NODE_ENV !== "test") {
  run(argv.slice(2, argv.length));
}
