// Quick script to generate PWA icons from SVG
// Run: node scripts/generate-icons.js
// Requires: none (uses inline SVG → canvas approach in browser, or just use favicon for now)

const fs = require('fs');

// Create a simple SVG icon
const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="32" fill="#1A237E"/>
  <text x="96" y="115" font-size="80" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">MS</text>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#1A237E"/>
  <text x="256" y="310" font-size="220" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">MS</text>
</svg>`;

fs.writeFileSync('public/icon-192.svg', svg192);
fs.writeFileSync('public/icon-512.svg', svg512);
console.log('SVG icons created. Convert to PNG with any tool or use SVG directly.');
