import convert from 'fbx2gltf';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.resolve(
  __dirname,
  '../../RabiRiichi-Cocos/assets/Models/Tile.fbx',
);
const dest = path.resolve(__dirname, '../public/assets/tile.glb');

console.log(`Converting ${src} to ${dest}...`);
convert(src, dest, ['--binary'])
  .then((destPath) => {
    console.log(`Success: Converted to ${destPath}`);
  })
  .catch((err) => {
    console.error(`Error:`, err);
    process.exit(1);
  });
