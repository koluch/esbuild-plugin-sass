const test = require("tape");
const path = require("path");
const fs = require("fs-extra");

process.chdir(path.resolve(__dirname));

const sassPlugin = require("../.npm-package/index.js");

test("simplest case", function (t) {
  (async () => {
    fs.removeSync(".output");

    await require("esbuild").build({
      entryPoints: ["basic/index.js"],
      bundle: true,
      outfile: ".output/bundle.js",
      plugins: [sassPlugin()],
    });

    t.ok(fs.existsSync("./.output/bundle.js"), "Bundled js file should exist");
    t.ok(
      fs.existsSync("./.output/bundle.css"),
      "Bundled css file should exist"
    );

    const fileContent = fs.readFileSync("./.output/bundle.css").toString();

    t.ok(
      fileContent.indexOf(`body.isRed`) !== -1,
      "Should contain compiled selector"
    );

    t.end();
  })().catch((e) => t.fail(e.message));
});
