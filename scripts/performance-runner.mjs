import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));

export function performanceEnvironment(base = process.env) {
  return {
    ...base,
    POVKH_SITE_ORIGIN: "http://127.0.0.1:4322",
    HOST: "127.0.0.1",
    PORT: "4322",
  };
}

function runBuild() {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "node_modules/astro/bin/astro.mjs"), "build"],
    { cwd: root, env: performanceEnvironment(), stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

function runServer() {
  const child = spawn(process.execPath, [resolve(root, "dist/server/entry.mjs")], {
    cwd: root,
    env: performanceEnvironment(),
    stdio: "inherit",
  });
  child.once("error", (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "build") runBuild();
  else if (process.argv[2] === "serve") runServer();
  else {
    console.error("Usage: node scripts/performance-runner.mjs <build|serve>");
    process.exitCode = 1;
  }
}
