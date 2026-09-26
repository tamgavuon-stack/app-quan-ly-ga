import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "apps/windows/web");
const output = path.join(root, "apps/windows/web-dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({ entryPoints: [path.join(source, "app.js")], bundle: true, format: "esm", platform: "browser", outfile: path.join(output, "app.js"), sourcemap: true, target: "es2020" });
await Promise.all([cp(path.join(source, "index.html"), path.join(output, "index.html")), cp(path.join(source, "styles.css"), path.join(output, "styles.css"))]);
console.log(`Windows frontend bundled to ${path.relative(root, output)}`);
