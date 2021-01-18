const fs = require("fs-extra");
const sass = require("sass");
const util = require("util");
const tmp = require("tmp");
const path = require("path");

const sassRender = util.promisify(sass.render);
const writeFile = util.promisify(fs.writeFile);
const ensureDir = util.promisify(fs.ensureDir);

module.exports = (options = {}) => ({
  name: "sass",
  setup: function (build) {
    const { rootDir = options.rootDir || process.cwd() } = options;
    const tmpDirPath = tmp.dirSync().name;
    build.onResolve(
      { filter: /.\.(scss|sass)$/, namespace: "file" },
      async (args) => {
        const fullFileName = path.resolve(args.resolveDir, args.path);
        const fileExt = path.extname(fullFileName);
        const baseFileName = path.basename(fullFileName, fileExt);

        const sassBuildResult = await sassRender({ file: fullFileName });

        const relativeDir = path.relative(
          path.dirname(rootDir),
          path.dirname(fullFileName)
        );
        const tmpDirFullPath = path.resolve(tmpDirPath, relativeDir);
        const tmpFilePath = path.resolve(tmpDirFullPath, `${baseFileName}.css`);
        await ensureDir(tmpDirFullPath);
        await writeFile(tmpFilePath, sassBuildResult.css);

        return {
          path: tmpFilePath,
        };
      }
    );
  },
});
