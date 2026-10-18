import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// public/engine is copied as-is with fixed file names, and GitHub Pages lets
// browsers cache it for 10 minutes. Renaming the folder after its content hash
// means a returning visitor can never pair an old cached engine with a newer
// app bundle after a deploy.
function hashedEngineDir() {
  let outDir;
  return {
    name: 'hashed-engine-dir',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const engineDir = join(outDir, 'engine');
      const hash = createHash('sha256');
      for (const file of readdirSync(engineDir).sort()) {
        hash.update(file).update(readFileSync(join(engineDir, file)));
      }
      const hashedName = `engine-${hash.digest('hex').slice(0, 8)}`;
      renameSync(engineDir, join(outDir, hashedName));

      const indexPath = join(outDir, 'index.html');
      const html = readFileSync(indexPath, 'utf8');
      if (!html.includes('./engine/')) throw new Error('hashed-engine-dir: index.html no longer references ./engine/');
      writeFileSync(indexPath, html.replaceAll('./engine/', `./${hashedName}/`));
    },
  };
}

export default defineConfig({
  plugins: [react(), hashedEngineDir()],
  base: './',
  build: {
    target: 'es2022',
  },
});
