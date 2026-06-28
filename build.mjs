// Build pipeline: compile TypeScript, run unit tests, then inline CSS + JS +
// template data into a single self-contained index.html (CLAUDE.md §9).
// Usage:
//   node build.mjs             full build (test -> compile -> bundle -> release)
//   node build.mjs --test-only compile the test bundle only (used by `npm test`)
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const testOnly = process.argv.includes("--test-only");

function run(cmd) {
  console.log("> " + cmd);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// Replace a marker with literal text without interpreting `$` patterns.
function inject(haystack, marker, replacement) {
  const idx = haystack.indexOf(marker);
  if (idx === -1) {
    throw new Error("Marker not found: " + marker);
  }
  return haystack.slice(0, idx) + replacement + haystack.slice(idx + marker.length);
}

// 1) Compile and run the unit tests first; a failing test aborts the build.
run("npx tsc -p tsconfig.test.json");
run("node dist/test.js");

if (testOnly) {
  console.log("Test bundle ready.");
  process.exit(0);
}

// 2) Compile the browser bundle.
run("npx tsc -p tsconfig.json");

// 3) Inline everything into the HTML shell.
const css = read("src/styles.css");
const js = read("dist/bundle.js");
const templateData = read("CLAUDE_Template.data");
let html = read("index.template.html");

html = inject(html, "/*INLINE_CSS*/", css);
html = inject(html, '/*INLINE_TEMPLATE*/""', JSON.stringify(templateData));
html = inject(html, "/*INLINE_JS*/", js);

writeFileSync(join(root, "index.html"), html, "utf8");
console.log("Wrote index.html (" + html.length + " bytes)");

// 4) Copy the runtime artifacts into release/.
const releaseDir = join(root, "release");
if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}
for (const file of ["index.html", "README.md", "history.html"]) {
  if (existsSync(join(root, file))) {
    copyFileSync(join(root, file), join(releaseDir, file));
    console.log("Copied -> release/" + file);
  }
}
console.log("Build complete.");
