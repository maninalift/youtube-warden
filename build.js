//   Why we have a build.js instead of a vite.config.js 
//   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
//   Chrome extensions require us to specify all of our source files
//   in the manifest.json. For this reason we want to build our javascript
//   files as bundled single files.
//
//   Rollup, which is used by Vite for bundling, does not allow any module
//   to appear more than once in the output and for this reason, when there
//   are multiple entry points (inputs), it will not allow mode:'iife' or 
//   inlineDynamicImports: true, which options would normally be used to 
//   bundle js imports into a single file.
//
//   For this reason we need to use this manual build process, where
//   each input is built separately by vite and combined together.

import { build } from 'vite';
import * as fs from "fs";

const entrypoints = [
  ["page", 'src/page.ts'],
  ["options", 'src/options.ts'],
];

async function buildEntryPoints() {
  fs.rmSync("./dist", { recursive: true, force: true });
  fs.cpSync("./public", "./dist", { recursive: true });

  for (const [filename, filepath] of entrypoints) {
    console.log('Building', filepath)

    await build({
      publicDir: false,
      build: {
        rollupOptions: {
          output: {
            entryFileNames: '[name].js',
            manualChunks: false,
            inlineDynamicImports: true,
            assetFileNames: '[name].[ext]',
            format: 'iife',
          },
          input: {
            [filename]: filepath,
          },
        },
        emptyOutDir: false
      },
      configFile: false,
    })
  }
}

buildEntryPoints() 
