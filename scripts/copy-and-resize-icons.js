#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 Copying and resizing icons...\n');

const sourceDir = '/Users/lostxker/Downloads/favicon-for-public';
const targetDir = path.join(__dirname, '../public/icons');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy 192x192 and 512x512
const files = [
  { from: 'web-app-manifest-192x192.png', to: 'icon-192x192.png' },
  { from: 'web-app-manifest-512x512.png', to: 'icon-512x512.png' }
];

files.forEach(({ from, to }) => {
  const source = path.join(sourceDir, from);
  const target = path.join(targetDir, to);
  
  try {
    fs.copyFileSync(source, target);
    console.log(`✅ Copied: ${to}`);
  } catch (err) {
    console.error(`❌ Failed to copy ${from}:`, err.message);
  }
});

// Generate other sizes using sips (macOS)
const sizes = [72, 96, 128, 144, 152, 384];
const source512 = path.join(targetDir, 'icon-512x512.png');

console.log('\n📐 Generating other sizes...\n');

sizes.forEach(size => {
  const output = path.join(targetDir, `icon-${size}x${size}.png`);
  
  try {
    execSync(`sips -z ${size} ${size} "${source512}" --out "${output}"`, { 
      stdio: 'pipe' 
    });
    console.log(`✅ Created: icon-${size}x${size}.png`);
  } catch (err) {
    console.error(`❌ Failed to create icon-${size}x${size}.png:`, err.message);
  }
});

// Remove old SVG files
console.log('\n🗑️  Removing old SVG files...\n');
try {
  const files = fs.readdirSync(targetDir);
  files.forEach(file => {
    if (file.endsWith('.svg') && file.startsWith('icon-')) {
      fs.unlinkSync(path.join(targetDir, file));
      console.log(`✅ Removed: ${file}`);
    }
  });
} catch (err) {
  console.error('❌ Failed to remove SVG files:', err.message);
}

console.log('\n✨ Done! All icons updated.\n');

// List all PNG icons
console.log('📁 Icon files:');
try {
  const files = fs.readdirSync(targetDir)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      const sizeA = parseInt(a.match(/\d+/)?.[0] || '0');
      const sizeB = parseInt(b.match(/\d+/)?.[0] || '0');
      return sizeA - sizeB;
    });
  
  files.forEach(file => {
    const stats = fs.statSync(path.join(targetDir, file));
    const size = (stats.size / 1024).toFixed(1);
    console.log(`  ${file} (${size} KB)`);
  });
} catch (err) {
  console.error('Error listing files:', err.message);
}

console.log('\n✅ Ready to build! Run: npm run build\n');

