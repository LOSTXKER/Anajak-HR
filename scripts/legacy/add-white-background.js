#!/usr/bin/env node

/**
 * Add white background to PNG icons for iOS
 * iOS doesn't handle transparent backgrounds well - adds black background instead
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 Adding white background to iOS icons...\n');

// Create simple SVG with white background
const sizes = [180];

sizes.forEach(size => {
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- White background with rounded corners for iOS -->
  <rect width="${size}" height="${size}" fill="white" rx="${size * 0.22}" ry="${size * 0.22}"/>
  
  <!-- Original icon on top -->
  <g transform="translate(${size * 0.15}, ${size * 0.15})">
    <svg width="${size * 0.7}" height="${size * 0.7}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#fbbf24;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ef4444;stop-opacity:1" />
        </linearGradient>
      </defs>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.5}" 
        font-weight="bold"
        fill="url(#grad)" 
        text-anchor="middle" 
        dominant-baseline="central">
        A
      </text>
    </svg>
  </g>
</svg>`.trim();

  const filename = `apple-icon-with-bg-${size}x${size}.svg`;
  const filepath = path.join(__dirname, '../public/icons/', filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created: ${filename}`);
});

console.log('\n📝 Note: SVG icons with white background created.');
console.log('For better iOS compatibility, convert to PNG:');
console.log('  cd public/icons');
console.log('  # Use online converter or ImageMagick to convert SVG → PNG\n');

