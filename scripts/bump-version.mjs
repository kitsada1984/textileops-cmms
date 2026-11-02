import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Read package.json to determine current version
const pkgPath = path.join(rootDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const currentSemver = pkg.version

let targetSemver = process.argv[2]
if (!targetSemver) {
  // Auto-increment patch
  const parts = currentSemver.split('.').map(Number)
  parts[2] = (parts[2] || 0) + 1
  targetSemver = parts.join('.')
} else {
  targetSemver = targetSemver.replace(/^v/, '')
}

const targetVersionWithV = `v${targetSemver}`
const today = new Date().toISOString().slice(0, 10)

console.log(`[Version Bumper] Bumping version from v${currentSemver} -> ${targetVersionWithV} (${today})`)

// 1. Update package.json
pkg.version = targetSemver
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
console.log(`  ✓ Updated package.json: version = "${targetSemver}"`)

// 2. Update src/version.js
const versionJsPath = path.join(rootDir, 'src', 'version.js')
let versionJsContent = fs.readFileSync(versionJsPath, 'utf8')
versionJsContent = versionJsContent.replace(
  /export const APP_VERSION = 'v\d+\.\d+\.\d+'/,
  `export const APP_VERSION = '${targetVersionWithV}'`
)
versionJsContent = versionJsContent.replace(
  /export const APP_BUILD_DATE = '\d{4}-\d{2}-\d{2}'/,
  `export const APP_BUILD_DATE = '${today}'`
)
fs.writeFileSync(versionJsPath, versionJsContent, 'utf8')
console.log(`  ✓ Updated src/version.js: APP_VERSION = '${targetVersionWithV}', APP_BUILD_DATE = '${today}'`)

// 3. Update public/sw.js
const swJsPath = path.join(rootDir, 'public', 'sw.js')
let swJsContent = fs.readFileSync(swJsPath, 'utf8')
swJsContent = swJsContent.replace(
  /const CACHE_NAME = 'textileops-v\d+\.\d+\.\d+'/,
  `const CACHE_NAME = 'textileops-${targetVersionWithV}'`
)
fs.writeFileSync(swJsPath, swJsContent, 'utf8')
console.log(`  ✓ Updated public/sw.js: CACHE_NAME = 'textileops-${targetVersionWithV}'`)

// 4. Update public/manual/index.html (if present)
const manualHtmlPath = path.join(rootDir, 'public', 'manual', 'index.html')
if (fs.existsSync(manualHtmlPath)) {
  let manualContent = fs.readFileSync(manualHtmlPath, 'utf8')
  manualContent = manualContent.replace(
    /v\d+\.\d+\.\d+ \(Latest Enterprise Build\)/,
    `${targetVersionWithV} (Latest Enterprise Build)`
  )
  fs.writeFileSync(manualHtmlPath, manualContent, 'utf8')
  console.log(`  ✓ Updated public/manual/index.html: ${targetVersionWithV}`)
}

console.log(`\n🎉 Version successfully synchronized across all Release Protocol targets: ${targetVersionWithV}`)
