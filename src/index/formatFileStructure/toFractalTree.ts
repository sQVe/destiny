import { Graph } from "./shared/Graph";
import path from "path";
import { hasCycle } from "./toFractalTree/hasCycle";
import { findSharedParent } from "./shared/findSharedParent";
import { isTestFile } from "./shared/isTestFile";

export function toFractalTree(graph: Graph, entryPoints: string[]) {
  const done: Record<string, string> = {};
  const deps: Record<string, string[]> = {};
  let containsCycle = false;
  const testFiles = new Set<string>();

  const fn = (filePath: string, folderPath: string, graph: Graph) => {
    const basenameWithExt = path.basename(filePath);
    if (isTestFile(basenameWithExt)) {
      testFiles.add(filePath);
      return;
    }
    let folderName = path.basename(filePath, path.extname(filePath));
    const upperFolder = path.basename(path.dirname(filePath));
    const isGlobal = filePath.includes("..");
    const location = isGlobal
      ? filePath
      : path.join(
          folderPath,
          folderName === "index" && upperFolder && upperFolder !== "."
            ? upperFolder + path.extname(filePath)
            : basenameWithExt
        );
    folderName = path.basename(location, path.extname(location));
    // ../package.json
    // don't need to move global files
    if (!isGlobal) {
      done[filePath] = location;
    }
    const imports = graph[filePath];
    if (imports && imports.length) {
      const newDestination = path.join(folderPath, folderName);
      for (const importFilePath of imports) {
        if (importFilePath in done) {
          const cycle = hasCycle(importFilePath, graph, new Set());
          if (cycle) {
            containsCycle = true;
            console.log("Cycle detected:", cycle.join(" -> "));
          } else {
            if (!(importFilePath in deps)) {
              deps[importFilePath] = [];
            }

            deps[importFilePath].push(location);
          }
          continue;
        }

        if (!(importFilePath in deps)) {
          deps[importFilePath] = [];
        }
        deps[importFilePath].push(location);

        // console.log("import: ", importFilePath, newDestination);
        fn(importFilePath, newDestination, graph);
      }
    }
  };

  for (const filePath of entryPoints) {
    fn(filePath, "", graph);
  }

  if (!containsCycle) {
    Object.entries(deps).forEach(([k, v]) => {
      if (v.length > 1 && !k.includes("..")) {
        const parent = findSharedParent(v);
        const filename = path.basename(k);
        const upperFolder = path.basename(path.dirname(k));
        done[k] = path.join(
          parent,
          "shared",
          path.basename(filename, path.extname(filename)) === "index" &&
            upperFolder &&
            upperFolder !== "."
            ? upperFolder + path.extname(filename)
            : filename
        );
      }
    });
  }

  if (testFiles.size) {
    const globalTests = [];
    for (const testFile of testFiles) {
      // assuming this is the main thing your testing
      const [firstRelativeImport] = graph[testFile];
      if (!firstRelativeImport) {
        globalTests.push(testFile);
        continue;
      }

      const fileToTestPath = done[firstRelativeImport];
      if (fileToTestPath) {
        done[testFile] = path.join(
          path.dirname(fileToTestPath),
          path.basename(testFile)
        );
      }
    }
  }

  return done;
}
