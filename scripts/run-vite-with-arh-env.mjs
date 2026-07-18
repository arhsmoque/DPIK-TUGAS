import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const command = process.argv[2];
if (command !== "dev" && command !== "build") {
  console.error("Usage: node scripts/run-vite-with-arh-env.mjs <dev|build>");
  process.exit(2);
}

const vaultPath = process.env.ARH_VAULT;

let supabaseUrl;
let supabaseAnonKey;

if (vaultPath) {
  let vault;
  try {
    vault = JSON.parse(readFileSync(vaultPath, "utf8"));
  } catch {
    console.error("Unable to read the ARH vault. No credential values were printed.");
    process.exit(1);
  }
  supabaseUrl = vault.tugas_supabase_url;
  supabaseAnonKey = vault.tugas_supabase_anon_key;
  if (typeof supabaseUrl !== "string" || typeof supabaseAnonKey !== "string") {
    console.error("ARH vault is missing the DPIK TUGAS Supabase browser configuration.");
    process.exit(1);
  }
} else {
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (typeof supabaseUrl !== "string" || typeof supabaseAnonKey !== "string") {
    console.error(
      "Neither ARH_VAULT nor VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set. " +
        "Load the ARH environment profile locally, or provide the two VITE_SUPABASE_* " +
        "variables directly (e.g. from repository secrets in a cloud session)."
    );
    process.exit(1);
  }
}

const viteBin = resolve("node_modules", "vite", "bin", "vite.js");
const args = [viteBin];
if (command === "build") args.push("build");
args.push("--config", "apps/internal/vite.config.ts");
args.push(...process.argv.slice(3));

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey
  }
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => {
  console.error("Unable to start Vite.");
  process.exit(1);
});
