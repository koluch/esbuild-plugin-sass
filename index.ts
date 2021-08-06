import { Plugin } from "esbuild";
import { CssNode } from "css-tree";
import { compilePatterns, isExternal, WildcardPattern } from "./internals/external";
import fs = require("fs-extra");
import sass = require("sass");
import util = require("util");
import tmp = require("tmp");
import path = require("path");
import csstree = require("css-tree");

const sassRender = util.promisify(sass.render);

interface Options extends sass.Options {
  rootDir?: string;
}

export = (options: Options = {}): Plugin => ({
  name: "sass",
  setup: function (build) {
    const { rootDir = process.cwd(), ...sassOptions } = options;
    const { external = [] } = build.initialOptions;
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
        let css = (await sassRender({ ...sassOptions, file: sourceFullPath })).css.toString();

        // Replace all relative urls
        css = await replaceUrls(
          css,
          tmpFilePath,
          sourceDir,
          rootDir,
          compilePatterns(external)
        );

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
  rootDir: string,
  externals: WildcardPattern[]
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
              urlNode.value = `"${fixCssUrl(relativePath)}"`;
            }
          }
        }
      }
      if (node.type === "Url") {
        const value = node.value;

        const normalizedUrl =
          value.type === "String" ? normalizeQuotes(value.value) : value.value;

        if (isExternal(normalizedUrl, externals)) {
          return;
        }

        if (isLocalFileUrl(normalizedUrl)) {
          const resolved = resolveUrl(normalizedUrl, sourceDir, rootDir);
          const relativePath = path.relative(newCssFileName, resolved.file);

          node.value = {
            ...node.value,
            type: "String",
            // disable keeping query and hash parts of original url, since esbuild doesn't support it yet
            // value: `"${relativePath}${resolved.query}${resolved.hash}"`,
            value: `"${fixCssUrl(relativePath)}"`,
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

// Always use unix-style path separator (/) in urls in CSS, since Windows-style
// separator doesn't work on Windows
function fixCssUrl(filePath: string): string {
  return filePath.split(path.sep).join('/')
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
