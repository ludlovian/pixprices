import process from 'node:process'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import copy from 'rollup-plugin-copy'
import gzip from 'rollup-plugin-gzip'
import terser from '@rollup/plugin-terser'
import run from '@rollup/plugin-run'
import babel from '@rollup/plugin-babel'

const dev = process.env.NODE_ENV !== 'production'
const watch = process.env.ROLLUP_WATCH === 'true'
const ignore = name => ({
  name: 'ignore-import',
  resolveId: source => source === name ? name : null,
  load: id => id === name ? 'export default null' : null
})

export default [
  {
    input: 'src/index.mjs',
    output: {
      file: 'dist/index.mjs',
      format: 'es',
      sourcemap: dev
    },
    external: ['@googleapis/sheets', 'better-sqlite3'],
    plugins: [
      commonjs(),
      nodeResolve(),
      !dev && terser(),
      watch && run()
    ]
  },
  {
    input: 'src/client/main.mjs',
    output: {
      file: 'dist/public/main.mjs',
      format: 'es',
      sourcemap: dev
    },
    plugins: [
      !dev && ignore('preact/debug'),
      nodeResolve(),
      babel({ babelHelpers: 'bundled' }),
      !dev && terser(),
      copy({
        targets: [
          { src: 'src/client/*.html', dest: 'dist/public' },
          { src: 'src/client/inject.mjs', dest: 'dist/public' },
          { src: 'src/client/bootstrap.min.*', dest: 'dist/public' }
        ]
      }),
      !dev && gzip({
        additionalFiles: [
          'dist/public/bootstrap.min.css',
          'dist/public/bootstrap.min.js'
        ]
      })
    ]
  }
]

