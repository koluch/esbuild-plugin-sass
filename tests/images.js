const test = require("tape");
const path = require("path");
const fs = require("fs-extra");

process.chdir(path.resolve(__dirname));

const sassPlugin = require("../.npm-package/index.js");

test("resolving images", function (t) {
  (async () => {
    fs.removeSync(".output");

    await require("esbuild").build({
      entryPoints: ["images/index.js"],
      bundle: true,
      outfile: ".output/bundle.js",
      loader: { ".png": "file", ".svg": "file" },
      external: ["/external/*"],
      plugins: [sassPlugin()],
    });

    t.ok(fs.existsSync("./.output/bundle.js"), "Bundled js file should exist");
    t.ok(
      fs.existsSync("./.output/bundle.css"),
      "Bundled css file should exist"
    );
    t.end();
  })().catch((e) => t.fail(e.message));
});
