import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const projectDir = process.cwd();
const openNextDir = join(projectDir, ".open-next");
const assetsDir = join(openNextDir, "assets");
const distDir = join(projectDir, "dist");
const bundleDir = mkdtempSync(join(tmpdir(), "elearning-sites-worker-"));
const wranglerBinary = join(
  projectDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler",
);

if (!existsSync(join(openNextDir, "worker.js")) || !existsSync(assetsDir)) {
  throw new Error("OpenNext output is missing. Run the Cloudflare build first.");
}

try {
  const result = spawnSync(wranglerBinary, ["deploy", "--dry-run", "--outdir", bundleDir], {
    cwd: projectDir,
    env: {
      ...process.env,
      WRANGLER_LOG_PATH: join(tmpdir(), "elearning-sites-wrangler.log"),
    },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Wrangler bundle failed with exit code ${result.status ?? "unknown"}.`);
  }

  const bundledWorker = join(bundleDir, "worker.js");
  if (!existsSync(bundledWorker)) {
    throw new Error("Wrangler did not produce worker.js.");
  }

  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(join(distDir, "server"), { recursive: true });
  cpSync(bundledWorker, join(distDir, "server", "index.js"));

  const sourceMap = join(bundleDir, "worker.js.map");
  if (existsSync(sourceMap)) {
    cpSync(sourceMap, join(distDir, "server", "index.js.map"));
  }

  cpSync(assetsDir, join(distDir, "client"), { recursive: true });
  console.log("Sites build prepared in dist/.");
} finally {
  rmSync(bundleDir, { recursive: true, force: true });
}
