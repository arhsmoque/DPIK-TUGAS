// Pure, testable core of the architecture gate. See check-architecture.mjs
// for the CLI wrapper that runs this against the real src/modules tree.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const FRAMEWORK_OR_PROVIDER_PATTERNS = [/^react/, /^react-dom/, /^@supabase\//, /^supabase-js/];

export function listFilesRecursive(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listFilesRecursive(full);
    if (/\.(ts|tsx)$/.test(entry.name)) return [full];
    return [];
  });
}

export function importSpecifiers(source) {
  const specifiers = [];
  const importRe = /import\s+(?:[^'"]+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = importRe.exec(source)) !== null) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function moduleNameOf(filePath, modulesRoot) {
  return relative(modulesRoot, filePath).split(/[\\/]/)[0];
}

function layerOf(filePath, modulesRoot) {
  return relative(modulesRoot, filePath).split(/[\\/]/)[1] ?? "";
}

const TEST_DOUBLE_IMPORTS = ["FixedClock", "SequentialIdPort"];

function importsTestDouble(source) {
  return TEST_DOUBLE_IMPORTS.filter((name) => {
    const namedImport = new RegExp(`import\\s+(?:type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}`);
    return namedImport.test(source);
  });
}

export function checkArchitecture(modulesRoot) {
  const violations = [];
  const files = listFilesRecursive(modulesRoot);

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const thisModule = moduleNameOf(file, modulesRoot);
    const thisLayer = layerOf(file, modulesRoot);
    const rel = relative(modulesRoot, file);

    if (!file.endsWith(".test.ts") && (thisLayer === "application" || thisLayer === "adapters")) {
      for (const testDouble of importsTestDouble(source)) {
        violations.push(
          `${rel}: imports test double "${testDouble}" -- application and adapter code must receive production ports through composition.`
        );
      }
    }

    for (const spec of importSpecifiers(source)) {
      if (thisLayer === "domain" && FRAMEWORK_OR_PROVIDER_PATTERNS.some((p) => p.test(spec))) {
        violations.push(
          `${rel}: domain code imports "${spec}" -- domain must not depend on React, Supabase, or any provider SDK.`
        );
      }

      const crossModuleMatch = spec.match(/^@modules\/([^/]+)(\/.*)?$/);
      if (crossModuleMatch) {
        const targetModule = crossModuleMatch[1];
        const subPath = crossModuleMatch[2] ?? "";
        if (targetModule !== thisModule && subPath !== "" && subPath !== "/index") {
          violations.push(
            `${rel}: imports "${spec}" -- cross-module imports must go through @modules/${targetModule} (its public index.ts) only.`
          );
        }
      }
    }
  }

  return { violations, filesChecked: files.length };
}

// Foundation is the shared kernel every module's domain/application layer
// imports -- if it depended on React or Supabase, that dependency would leak
// into every module transitively, defeating the point of gating "domain".
// So the whole tree is checked, not just a "domain" sub-layer.
export function checkFoundation(foundationRoot) {
  const violations = [];
  const files = listFilesRecursive(foundationRoot);

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const rel = relative(foundationRoot, file);

    for (const spec of importSpecifiers(source)) {
      if (FRAMEWORK_OR_PROVIDER_PATTERNS.some((p) => p.test(spec))) {
        violations.push(
          `${rel}: foundation code imports "${spec}" -- the shared kernel must not depend on React, Supabase, or any provider SDK.`
        );
      }
    }
  }

  return { violations, filesChecked: files.length };
}
