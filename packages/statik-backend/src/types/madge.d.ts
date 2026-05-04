/**
 * Minimal type stub for `madge`.
 *
 * @types/madge doesn't exist on npm at the time of writing, so we
 * declare just the surface we actually call.
 */

declare module "madge" {
  interface MadgeOptions {
    fileExtensions?: string[];
    excludeRegExp?: RegExp[];
    includeNpm?: boolean;
    detectiveOptions?: Record<string, unknown>;
    tsConfig?: string;
    baseDir?: string;
  }

  interface MadgeInstance {
    obj(): Record<string, string[]>;
    circular(): string[][];
    orphans(): string[];
    leaves(): string[];
    depends(name: string): string[];
    warnings(): { skipped: string[] };
  }

  function madge(
    path: string | string[],
    options?: MadgeOptions
  ): Promise<MadgeInstance>;

  export default madge;
}
