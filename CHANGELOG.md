# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2022-01-08
### Changed
- Migrate to [compile](https://sass-lang.com/documentation/js-api/modules#compile) function instead of [render](https://sass-lang.com/documentation/js-api/modules#render), since it is deprecated
- Do not support node v10 anymore, since some updated packages doesn't support it anymore
- Move to pnpm package manager
- Update dependencies
- [#36](https://github.com/koluch/esbuild-plugin-sass/pull/36): Watch all files, used by entry Sass file 
- Move to [new workflow](https://thomaspoignant.medium.com/simple-git-flow-who-works-dac82430e484) 
