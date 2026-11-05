import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const configPath = resolve("dist/perigon_mcp_server/wrangler.json");
let config;
try {
  config = JSON.parse(readFileSync(configPath, "utf8"));
} catch {
  console.error(
    `Missing or invalid ${configPath}. Run production build first (CLOUDFLARE_ENV=production).`,
  );
  process.exit(1);
}

const errors = [];

if (config.targetEnvironment !== "production") {
  errors.push(
    `targetEnvironment must be "production" (got ${JSON.stringify(config.targetEnvironment)}).`,
  );
}

if (config.assets?.run_worker_first !== true) {
  errors.push(
    `assets.run_worker_first must be true (got ${JSON.stringify(config.assets?.run_worker_first)}).`,
  );
}

if (config.vars?.ENVIRONMENT !== "production") {
  errors.push(
    `vars.ENVIRONMENT must be "production" (got ${JSON.stringify(config.vars?.ENVIRONMENT)}).`,
  );
}

if (config.vars?.MCP_PUBLIC_URL !== "https://mcp.perigon.io") {
  errors.push(
    `vars.MCP_PUBLIC_URL must be https://mcp.perigon.io (got ${JSON.stringify(config.vars?.MCP_PUBLIC_URL)}).`,
  );
}

if (errors.length > 0) {
  console.error("Production deploy config check failed:\n");
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  console.error(
    "\nDeploy with: bunx wrangler deploy --config dist/perigon_mcp_server/wrangler.json",
  );
  process.exit(1);
}

console.log("Production deploy config OK (run_worker_first, vars, targetEnvironment).");
