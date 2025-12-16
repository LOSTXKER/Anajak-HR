#!/usr/bin/env node

/**
 * Generate simple placeholder PWA icons
 * Run: node scripts/generate-icons.js
 * 
 * This creates simple colored square icons.
 * For production, replace these with actual designed icons.
 */

const fs = require('fs');
const path = require('path');

// Create output directory
const outputDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const color = '#3b82f6'; // Blue color matching theme

console.log('🎨 Generating placeholder PWA Icons...\n');

sizes.forEach(size => {
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.15}"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.35}" 
    font-weight="bold"
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central">
    HR
  </text>
</svg>`.trim();

  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created: ${filename}`);
});

console.log('\n✨ Done! Generated placeholder icons.');
console.log('\n📝 Note: These are SVG placeholders.');
console.log('For better compatibility, convert them to PNG:');
console.log('  1. Use online tool: https://realfavicongenerator.net');
console.log('  2. Or install ImageMagick and run: ./scripts/generate-icons.sh');
console.log('  3. Or design custom icons in Figma/Photoshop\n');




