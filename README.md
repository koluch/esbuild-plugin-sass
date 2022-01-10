# esbuild-plugin-sass

![Node.js CI](https://github.com/koluch/esbuild-plugin-sass/workflows/Node.js%20CI/badge.svg)

Plugin for [esbuild](https://esbuild.github.io/) to support Sass style sheets

## Install

```shell
npm i esbuild esbuild-plugin-sass
```

or, using [pnpm](https://pnpm.io/):

```shell
pnpm add esbuild esbuild-plugin-sass
```

## Usage example

Create file `src/test.scss`:

```scss
body {
  &.isRed {
    background: red;
  }
}
```

Create file `src/index.js`:

```js
import "./test.scss";
```

Create file `build.js`:

```js
const esbuild = require("esbuild");
const sassPlugin = require("esbuild-plugin-sass");

esbuild
  .build({
    entryPoints: ["src/index.js"],
    bundle: true,
    outfile: "bundle.js",
    plugins: [sassPlugin()],
  })
  .catch((e) => console.error(e.message));
```

Run:

```console
$ node build.js
```

File named `bundle.css` with following content will be created:

```css
body.isRed {
  background: red;
}
```

# API

Module default-exports a function, which need to be called with or without options object:

```typescript
import sass = require("sass");

interface Options {
  rootDir?: string;
  customSassOptions?: Omit<sass.Options, "file">;
}

export = (options: Options = {}) => Plugin;
```

Supported options:

- `rootDir` - folder to resolve paths against
- `customSassOptions` - options object passed to `sass` [compile](https://sass-lang.com/documentation/js-api/modules#compile) function, except `file` option, which is overriden by plugin for each processed file
