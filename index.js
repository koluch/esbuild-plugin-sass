const fs = require("fs-extra");
const sass = require("sass");
const util = require("util");
const tmp = require("tmp");
const path = require("path");
const csstree = require("css-tree");

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
        const sourceFullPath = path.resolve(args.resolveDir, args.path);

        // import 'file.scss' assumed .js extension
        if(!fs.existsSync(sourceFullPath) && fs.existsSync(sourceFullPath + ".js")) {
          return {
            path: sourceFullPath + ".js",
          };
        }

        const sourceExt = path.extname(sourceFullPath);
        const sourceBaseName = path.basename(sourceFullPath, sourceExt);
        const sourceDir = path.dirname(sourceFullPath);
        const sourceRelDir = path.relative(path.dirname(rootDir), sourceDir);

        const tmpDir = path.resolve(tmpDirPath, sourceRelDir);
        const tmpFilePath = path.resolve(tmpDir, `${sourceBaseName}.css`);
        await ensureDir(tmpDir);

        // Compile SASS to CSS
        let css = (await sassRender({ file: sourceFullPath })).css.toString();

        // Replace all relative urls
        css = await replaceUrls(css, tmpFilePath, sourceDir, rootDir);

        // Write result file
        await writeFile(tmpFilePath, css);

        return {
          path: tmpFilePath,
        };
      }
    );
  },
});

async function replaceUrls(css, newCssFileName, sourceDir, rootDir) {
  const ast = csstree.parse(css);

  csstree.walk(ast, {
    enter(node) {
      if (node.type === "Url") {
        const value = node.value;
        const stringValue = value.value;

        let normalizedUrl;
        if (value.type === "String") {
          const match = stringValue.match(/^['"](.*)["']$/s);
          if (match) {
            normalizedUrl = match[1];
          } else {
            normalizedUrl = stringValue;
          }
        } else {
          normalizedUrl = stringValue;
        }

        if (isLocalFileUrl(normalizedUrl)) {
          const resolved = resolveUrl(normalizedUrl, sourceDir, rootDir);
          const relativePath = path.relative(newCssFileName, resolved.file);

          node.value = {
            ...node.value,
            type: "String",
            // disable keeping query and hash parts of original url, since esbuild doesn't support it yet
            // value: `"${relativePath}${resolved.query}${resolved.hash}"`,
            value: `"${relativePath}"`,
          };
        }
      }
    },
  });

  return csstree.generate(ast);
}

function isLocalFileUrl(url) {
  if (/^https?:\/\//i.test(url)) {
    return false;
  }
  if (/^data:/.test(url)) {
    return false;
  }
  if (/^#/.test(url)) {
    return false;
  }

  return true;
}

function resolveUrl(url, originalFolder, rootDir) {
  const [_, pathname, query, hash] = url.match(/^(.*?)(\?.*?)?(#.*?)?$/);

  let file = "";
  if (pathname.startsWith("/")) {
    file = path.resolve(rootDir, pathname.substring(1));
    // todo: resolve by root dir
  } else {
    file = path.resolve(originalFolder, pathname);
  }

  return {
    file,
    pathname,
    query: query || "",
    hash: hash || "",
  };
}
