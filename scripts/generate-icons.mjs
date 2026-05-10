import sharp from 'sharp'
import { mkdirSync } from 'fs'

// Create icons directory
mkdirSync('./public/icons', { recursive: true })

// Bunkwise logo SVG — dark navy square with graduation cap
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#091426"/>
  <path d="M256 140 L380 196 L256 252 L132 196 Z" fill="white" stroke="white" stroke-width="4" stroke-linejoin="round"/>
  <path d="M168 220 L168 300 C200 336 312 336 344 300 L344 220" fill="none" stroke="white" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="380" cy="196" r="12" fill="#85f8c4"/>
  <line x1="380" y1="208" x2="380" y2="280" stroke="white" stroke-width="12" stroke-linecap="round"/>
</svg>`

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of sizes) {
  await sharp(Buffer.from(svgIcon))
    .resize(size, size)
    .png()
    .toFile(`./public/icons/icon-${size}x${size}.png`)
  console.log(`✓ icon-${size}x${size}.png`)
}

// Apple touch icon (180x180)
await sharp(Buffer.from(svgIcon))
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png')
console.log('✓ apple-touch-icon.png')

// Maskable icon (512x512 with padding for safe zone)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#091426"/>
  <path d="M256 160 L360 206 L256 252 L152 206 Z" fill="white" stroke="white" stroke-width="4" stroke-linejoin="round"/>
  <path d="M184 228 L184 296 C210 324 302 324 328 296 L328 228" fill="none" stroke="white" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="360" cy="206" r="10" fill="#85f8c4"/>
  <line x1="360" y1="216" x2="360" y2="276" stroke="white" stroke-width="10" stroke-linecap="round"/>
</svg>`

await sharp(Buffer.from(maskableSvg))
  .resize(512, 512)
  .png()
  .toFile('./public/icons/maskable-512x512.png')
console.log('✓ maskable-512x512.png')

console.log('\n✅ All icons generated!')
