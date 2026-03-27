/**
 * Syncs the root package.json version to all workspace packages,
 * and replaces workspace:* references between @mailmcp/* packages
 * with the actual version so bun publish emits correct cross-deps.
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

  for (const depField of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    if (!pkg[depField]) continue;
    for (const [name, spec] of Object.entries(pkg[depField])) {
      if (
        name.startsWith("@mailmcp/") &&
        (spec === "workspace:*" || String(spec).startsWith("workspace:"))
      ) {
        pkg[depField][name] = version;
      }
    }
  }

  await Bun.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${pkg.name} → ${version}`);
}

console.log(`\nAll packages synced to ${version}`);
