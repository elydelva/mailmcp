/**
 * Syncs the root package.json version to all workspace packages.
 * Run before publishing to ensure all packages share the same version.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const rootPkg = await Bun.file(join(root, "package.json")).json();
const version: string = rootPkg.version;

const packagesDir = join(root, "packages");
const entries = await readdir(packagesDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  const pkgPath = join(packagesDir, entry.name, "package.json");
  const file = Bun.file(pkgPath);

  if (!(await file.exists())) continue;

  const pkg = await file.json();
  if (pkg.private) continue;

  pkg.version = version;
  await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${pkg.name} → ${version}`);
}

console.log(`\nAll packages synced to ${version}`);
