const { build } = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

const mainConfig = {
  entryPoints: [
    path.join(__dirname, 'src/main/main.ts'),
    path.join(__dirname, 'src/main/preload.ts')
  ],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: path.join(__dirname, 'dist/main'),
  external: [
    'electron',
    'electron-updater',
    'electron-store',
    'electron-log',
    'systeminformation',
    'node-machine-id',
    'axios',
    'uuid'
  ],
  format: 'cjs',
  sourcemap: true,
  minify: false
};

async function buildMain() {
  try {
    if (watch) {
      const ctx = await require('esbuild').context(mainConfig);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await build(mainConfig);
      console.log('Main process build completed!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildMain();
