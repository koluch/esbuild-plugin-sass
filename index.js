const fs = require("fs");
const sass = require("sass");
const util = require("util");
const tmp = require("tmp");
const path = require("path");

const sassRender = util.promisify(sass.render);
const createTempDir = util.promisify(tmp.dir);
const writeFile = util.promisify(fs.writeFile);

module.exports = {
  name: "sass",
  setup: function (build) {
    build.onResolve(
      { filter: /.\.(scss|sass)$/, namespace: "file" },
      async (args) => {
        const fullFileName = path.resolve(args.resolveDir, args.path);
        const fileExt = path.extname(fullFileName);
        const baseFileName = path.basename(fullFileName, fileExt);

        const sassBuildResult = await sassRender({ file: fullFileName });

        const tmpDirPath = await createTempDir();
        const tmpFilePath = path.resolve(tmpDirPath, `${baseFileName}.css`);
        await writeFile(tmpFilePath, sassBuildResult.css);

        return {
          path: tmpFilePath,
        };
      }
    );
  },
};
