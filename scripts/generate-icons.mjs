/**
 * Rasterize public/logo.svg into Electron + PWA icon assets.
 * Requires: npm install (sharp is a devDependency)
 */
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const logoSvg = join(publicDir, 'logo.svg');

const PNG_SIZES = [512, 256, 128, 64, 32, 16];

mkdirSync(publicDir, { recursive: true });

async function renderPng(size) {
  return sharp(logoSvg, { density: 144 })
    .resize(size, size)
    .png()
    .toBuffer();
}

async function main() {
  const pngBuffers = {};
  for (const size of PNG_SIZES) {
    const buf = await renderPng(size);
    pngBuffers[size] = buf;
    writeFileSync(join(publicDir, `icon-${size}.png`), buf);
  }

  // Primary Electron / electron-builder source (512×512)
  writeFileSync(join(publicDir, 'icon.png'), pngBuffers[512]);
  writeFileSync(join(publicDir, 'icon-512.png'), pngBuffers[512]);
  writeFileSync(join(publicDir, 'icon-192.png'), await renderPng(192));

  // Windows ICO (multi-size)
  const icoBuffer = await pngToIco([
    pngBuffers[256],
    pngBuffers[128],
    pngBuffers[64],
    pngBuffers[32],
  ]);
  writeFileSync(join(publicDir, 'icon.ico'), icoBuffer);

  // macOS ICNS via iconutil
  const iconsetDir = join(publicDir, 'LabTools.iconset');
  rmSync(iconsetDir, { recursive: true, force: true });
  mkdirSync(iconsetDir, { recursive: true });

  const icnsMap = [
    [512, 'icon_512x512.png'],
    [512, 'icon_512x512@2x.png'],
    [256, 'icon_256x256.png'],
    [256, 'icon_256x256@2x.png'],
    [128, 'icon_128x128.png'],
    [128, 'icon_128x128@2x.png'],
    [64, 'icon_32x32@2x.png'],
    [32, 'icon_32x32.png'],
    [32, 'icon_16x16@2x.png'],
    [16, 'icon_16x16.png'],
  ];

  for (const [size, name] of icnsMap) {
    const buf = pngBuffers[size] ?? (await renderPng(size));
    writeFileSync(join(iconsetDir, name), buf);
  }

  if (process.platform === 'darwin') {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${join(publicDir, 'icon.icns')}"`, {
      stdio: 'inherit',
    });
    rmSync(iconsetDir, { recursive: true, force: true });
  } else {
    rmSync(iconsetDir, { recursive: true, force: true });
    console.warn('Skipping icon.icns generation (requires macOS iconutil). Run on macOS before mac builds.');
  }

  console.log('Generated Lab Tools icon assets in public/:');
  console.log('  logo.svg, logo-light.svg, favicon.svg');
  console.log('  icon.png, icon.icns, icon.ico');
  console.log('  icon-512.png, icon-192.png');
  console.log('  icon-512.png, icon-256.png, icon-128.png, icon-64.png, icon-32.png, icon-16.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
