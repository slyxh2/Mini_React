import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';
import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';

const { name, module, peerDependencies } = getPackageJSON('react-dom');
const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

export default [
    // react-dom
    {
        input: `${pkgPath}/${module}`,
        output: [
            {
                file: `${pkgDistPath}/index.js`,
                name: 'ReactDOM',
                format: 'umd'
            },
            {
                file: `${pkgDistPath}/client.js`,
                name: 'client',
                format: 'umd'
            }
        ],
        external: [...Object.keys(peerDependencies)],
        plugins: [...getBaseRollupPlugins(),
        alias({
            entries: {
                hostConfig: `${pkgPath}/src/ReactDOMHostConfig.ts`
            }
        }),
        generatePackageJson({
            inputFolder: pkgPath,
            outputFolder: pkgDistPath,
            baseContents: ({ name, description, version }) => ({
                name,
                description,
                version,
                peerDependencies: {
                    react: version
                },
                main: 'index.js'
            })
        })]
    },
    // test-utils
    {
        input: `${pkgPath}/test-utils/ReactTestUtils.ts`,
        output: [
            {
                file: `${pkgDistPath}/test-utils.js`,
                name: 'test-utils',
                format: 'umd'
            }
        ],
        external: ['react-dom', 'react'],
        plugins: [...getBaseRollupPlugins()]
    }
]