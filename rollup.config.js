import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'

export default {
  input: 'src/index.mjs',
  external: [
    'fs/promises',
    'stream/promises',
    'sade',
    'mime/lite.js',
    'tinydate',
    '@googleapis/sheets',
    '@googleapis/drive',
    '@google-cloud/datastore',
    '@google-cloud/storage'
  ],
  plugins: [
    resolve(),
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: process.env.npm_package_version
      }
    })
  ],
  output: {
    file: 'dist/pixprices.mjs',
    format: 'esm',
    sourcemap: false,
    banner: '#!/usr/bin/env node'
  }
}
