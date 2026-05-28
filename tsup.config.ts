import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    cli: 'src/cli/index.ts',
  },
  outDir: 'dist',
  format: 'esm',
  target: 'node20',
  clean: true,
  dts: false,
  sourcemap: true,
  bundle: true,
  // sql.js has WASM binary, must be external
  external: ['sql.js'],
})
