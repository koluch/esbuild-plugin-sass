import { Plugin } from "esbuild";
import { CssNode } from "css-tree";
import fs = require("fs-extra");
import sass = require("sass");
import util = require("util");
import tmp = require("tmp");
import path = require("path");
import csstree = require("css-tree");

const sassRender = util.promisify(sass.render);

interface Options {
  rootDir?: string;
}

export = (options: Options = {}): Plugin => ({
  name: "sass",
  setup: function (build) {
    const { rootDir = process.cwd() } = options;
    const tmpDirPath = tmp.dirSync().name;
    build.onResolve(
      { filter: /.\.(scss|sass)$/, namespace: "file" },
      async (args) => {
        const sourceFullPath = path.resolve(args.resolveDir, args.path);
        const sourceExt = path.extname(sourceFullPath);
        const sourceBaseName = path.basename(sourceFullPath, sourceExt);
        const sourceDir = path.dirname(sourceFullPath);
        const sourceRelDir = path.relative(path.dirname(rootDir), sourceDir);

        const tmpDir = path.resolve(tmpDirPath, sourceRelDir);
        const tmpFilePath = path.resolve(tmpDir, `${sourceBaseName}.css`);
        await fs.ensureDir(tmpDir);

        // Compile SASS to CSS
        let css = (await sassRender({ file: sourceFullPath })).css.toString();

        // Replace all relative urls
        css = await replaceUrls(css, tmpFilePath, sourceDir, rootDir);

        // Write result file
        await fs.writeFile(tmpFilePath, css);

        return {
          path: tmpFilePath,
          watchFiles: [sourceFullPath],
        };
      }
    );
  },
});

async function replaceUrls(
  css: string,
  newCssFileName: string,
  sourceDir: string,
  rootDir: string
): Promise<string> {
  const ast = csstree.parse(css);

  csstree.walk(ast, {
    enter(node: CssNode) {
      // Special case for import, since it supports raw strings as url
      if (
        node.type === "Atrule" &&
        node.name === "import" &&
        node.prelude != null &&
        node.prelude.type === "AtrulePrelude"
      ) {
        if (!node.prelude.children.isEmpty()) {
          const urlNode = node.prelude.children.first();
          if (urlNode != null && urlNode.type === "String") {
            const normalizedUrl = normalizeQuotes(urlNode.value);
            if (isLocalFileUrl(normalizedUrl)) {
              const resolved = resolveUrl(normalizedUrl, sourceDir, rootDir);
              const relativePath = path.relative(newCssFileName, resolved.file);
              urlNode.value = `"${relativePath}"`;
            }
          }
        }
      }
      if (node.type === "Url") {
        const value = node.value;

        const normalizedUrl =
          value.type === "String" ? normalizeQuotes(value.value) : value.value;

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

function isLocalFileUrl(url: string): boolean {
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

function normalizeQuotes(stringValue: string): string {
  const match = stringValue.match(/^['"](.*)["']$/s);
  return match != null ? match[1] ?? "" : stringValue;
}

function resolveUrl(
  url: string,
  originalFolder: string,
  rootDir: string
): {
  file: string;
  pathname: string;
  query: string;
  hash: string;
} {
  const match = url.match(/^(.*?)(\?.*?)?(#.*?)?$/);
  if (match == null) {
    throw new Error(`Unable to parse url: ${url}`);
  }
  const [_, pathname = "", query, hash] = match;

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
