import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace';

import { resolvePkgPath } from '../rollup/utils';

const ReactPkgPath = resolvePkgPath('react');
const ReactDOMPkgPath = resolvePkgPath('react-dom');

export default defineConfig({
  plugins: [
    react(),
    replace({
      __DEV__: true,
      preventAssignment: true
    })
  ],
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: ReactPkgPath
      },
      {
        find: 'react-dom',
        replacement: ReactDOMPkgPath
      },
      {
        find: 'hostConfig',
        replacement: path.resolve(ReactDOMPkgPath, "./src/ReactDOMHostConfig.ts")
      }
    ]
  },
  server: {
    port: 3007
  }
})
