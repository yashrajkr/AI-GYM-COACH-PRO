/**
 * `troika-three-text` ships no type declarations (no `types` field in its
 * package.json), so under `noImplicitAny` any direct import of it is an error.
 * We only reach for one function — the worker toggle that keeps drei's <Text>
 * working under Turbopack (see components/three/troika-text-config.ts) — so
 * declaring just that is enough.
 *
 * `@react-three/drei` imports far more from this module in its own .d.ts
 * files; those stay unaffected because tsconfig sets `skipLibCheck: true`.
 */
declare module "troika-three-text" {
  export interface TextBuilderConfig {
    defaultFontURL?: string | null;
    unicodeFontsURL?: string | null;
    sdfGlyphSize?: number;
    sdfMargin?: number;
    sdfExponent?: number;
    textureWidth?: number;
    /** Run typesetting in a web worker. Defaults to true. */
    useWorker?: boolean;
  }

  /** Must be called before the first font request, or it is ignored. */
  export function configureTextBuilder(config: TextBuilderConfig): void;
}
