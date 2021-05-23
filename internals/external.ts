/**
 * This module mimics original semantics for external paths from esbuild implementation
 *
 * @see https://github.com/evanw/esbuild/blob/f66b586923e2e4569155e758b57bae9d473c7d8f/pkg/api/api_impl.go#L362
 */
export interface WildcardPattern {
  prefix: string;
  suffix: string;
}

export function compilePatterns(paths: string[]): WildcardPattern[] {
  const result = new Array(paths.length);
  for (let i = 0; i < paths.length; i += 1) {
    const path = paths[i] as string;
    const wildcardIndex = path.indexOf("*");
    result[i] = {
      prefix: wildcardIndex !== -1 ? path.substring(0, wildcardIndex) : path,
      suffix: wildcardIndex !== -1 ? path.substring(wildcardIndex + 1) : "",
    };
  }
  return result;
}

export function isExternal(path: string, patterns: WildcardPattern[]): boolean {
  for (let i = 0; i < patterns.length; i += 1) {
    const pattern = patterns[i] as WildcardPattern;
    if (path.length >= pattern.prefix.length + pattern.prefix.length) {
      if (path.startsWith(pattern.prefix) && path.endsWith(pattern.suffix)) {
        return true;
      }
    }
  }
  return false;
}
