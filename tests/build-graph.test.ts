import { buildGraph } from "../src/index/formatFileStructure/buildGraph";
import path from "path";
import glob from "glob";

const t = (folder: string, g: any) => {
  it(folder, () => {
    expect(
      buildGraph(
        glob.sync(path.join(__dirname, "fixtures", folder, "/**/*.js"))
      ).graph
    ).toEqual(g);
  });
};

describe("build graph", () => {
  t("simple", {
    "index.js": ["routes.js"],
    "routes.js": ["home.js"],
  });

  t("index-cycle", {
    "index.js": ["routes/index.js", "login/index.js"],
    "routes/index.js": ["home/index.js"],
    "login/index.js": ["utils/search.js"],
    "utils/search.js": ["index.js"],
  });

  t("spec-files", {
    "index.js": ["level1.js"],
    "index.spec.js": ["index.js"],
    "level1.js": ["level2.js"],
    "level1.spec.js": ["level1.js"],
    "level2.spec.js": ["level2.js"],
  });
});
