import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';
import { getPackageJSON, resolvePkgPath, getBaseRollupPlugins } from './utils';

const { name, module } = getPackageJSON('react-dom');
const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

export default [
    {
        input: `${pkgPath}/${module}`,
        output: [
            {
                file: `${pkgDistPath}/index.js`,
                name: 'index.js',
                format: 'umd'
            },
            {
                file: `${pkgDistPath}/client.js`,
                name: 'client.js',
                format: 'umd'
            }
        ],
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
    }
]