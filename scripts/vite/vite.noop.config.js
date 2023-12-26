import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace';

import { resolvePkgPath } from '../rollup/utils';

const ReactPkgPath = resolvePkgPath('react');
const ReactDOMPkgPath = resolvePkgPath('react-dom');
const ReactNoopRenderer = resolvePkgPath('react-noop-renderer');

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
        find: 'react-noop-renderer',
        replacement: ReactNoopRenderer
      },
      {
        find: 'hostConfig',
        replacement: path.resolve(ReactNoopRenderer, "./src/ReactNoopHostConfig.ts")
      }
    ]
  },
  server: {
    port: 3007
  }
})
