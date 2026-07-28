"use client";

import { configureTextBuilder } from "troika-three-text";

/**
 * drei's <Text> typesets through troika-three-text, which by default runs the
 * typesetter in a web worker that troika builds by stringifying its own `init`
 * function (troika-worker-utils `defineWorkerModule`). Turbopack rewrites
 * module scope when it compiles those functions, so the stringified source no
 * longer evaluates to a function once it runs inside the worker blob, and
 * troika throws:
 *
 *   Worker module function was called but `init` did not return a callable function
 *
 * `useWorker: false` is troika's supported escape hatch — it swaps in
 * `typesetOnMainThread`, which runs the exact same code path without the
 * stringify round-trip. Our 3D text is a handful of glyphs (rep counts, chart
 * labels), so the main-thread cost is negligible.
 *
 * Two constraints this file exists to satisfy:
 *   1. It must run before the first font request, or troika warns and ignores
 *      it. Importing this module from every file that renders <Text> works
 *      because imports are evaluated before the component body.
 *   2. It must hit the same troika module instance drei uses — that's why
 *      `troika-three-text` is a direct dependency pinned to drei's range.
 */
if (typeof window !== "undefined") {
  configureTextBuilder({ useWorker: false });
}

export {};
