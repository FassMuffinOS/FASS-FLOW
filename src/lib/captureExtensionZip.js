// The capture extension is packaged into this static asset at build time by
// scripts/build-extension-zip.mjs (wired into the `dev` and `build` npm
// scripts). Served from public/, it downloads as a real .zip that expands to a
// `capture-extension/` folder ready for chrome://extensions → Load unpacked.
export const EXTENSION_ZIP_URL = '/fass-capture-extension.zip'
