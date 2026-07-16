import { describe, expect, it, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkArchitecture, checkFoundation } from "../../scripts/verify/architecture-rules.mjs";

let workDir: string | undefined;

afterEach(() => {
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true });
    workDir = undefined;
  }
});

function fixture(modulesRoot: string, relPath: string, content: string) {
  const full = join(modulesRoot, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

describe("architecture gate", () => {
  it("passes on an empty modules tree", () => {
    workDir = mkdtempSync(join(tmpdir(), "arch-test-"));
    const modulesRoot = join(workDir, "src", "modules");
    mkdirSync(modulesRoot, { recursive: true });

    const result = checkArchitecture(modulesRoot);

    expect(result.violations).toEqual([]);
    expect(result.filesChecked).toBe(0);
  });

  it("passes on a well-formed module using another module's public index only", () => {
    workDir = mkdtempSync(join(tmpdir(), "arch-test-"));
    const modulesRoot = join(workDir, "src", "modules");

    fixture(modulesRoot, "work-thread/domain/work-thread.ts", `export const create = () => ({});`);
    fixture(
      modulesRoot,
      "work-thread/application/assign-work.ts",
      `import { create } from "../domain/work-thread";\nimport { getMember } from "@modules/identity-access";\nexport const assignWork = () => create();`
    );

    const result = checkArchitecture(modulesRoot);

    expect(result.violations).toEqual([]);
    expect(result.filesChecked).toBe(2);
  });

  it("flags domain code importing a framework or provider SDK", () => {
    workDir = mkdtempSync(join(tmpdir(), "arch-test-"));
    const modulesRoot = join(workDir, "src", "modules");

    fixture(
      modulesRoot,
      "work-thread/domain/work-thread.ts",
      `import { createClient } from "@supabase/supabase-js";\nexport const create = () => createClient();`
    );

    const result = checkArchitecture(modulesRoot);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("@supabase/supabase-js");
  });

  it("flags a cross-module import that reaches past the public index", () => {
    workDir = mkdtempSync(join(tmpdir(), "arch-test-"));
    const modulesRoot = join(workDir, "src", "modules");

    fixture(
      modulesRoot,
      "work-thread/application/assign-work.ts",
      `import { internalHelper } from "@modules/identity-access/domain/internal-helper";\nexport const assignWork = () => internalHelper();`
    );

    const result = checkArchitecture(modulesRoot);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("@modules/identity-access/domain/internal-helper");
  });
});

describe("foundation gate", () => {
  it("passes when foundation code stays framework-free", () => {
    workDir = mkdtempSync(join(tmpdir(), "arch-test-"));
    const foundationRoot = join(workDir, "src", "foundation");

    fixture(
      foundationRoot,
      "result/result.ts",
      `export const ok = (v: unknown) => ({ ok: true, v });`
    );

    const result = checkFoundation(foundationRoot);

    expect(result.violations).toEqual([]);
    expect(result.filesChecked).toBe(1);
  });

  it("flags foundation code importing a framework or provider SDK, anywhere in the tree", () => {
    workDir = mkdtempSync(join(tmpdir(), "arch-test-"));
    const foundationRoot = join(workDir, "src", "foundation");

    fixture(
      foundationRoot,
      "ports/some-adapter.ts",
      `import { createClient } from "@supabase/supabase-js";\nexport const client = createClient();`
    );

    const result = checkFoundation(foundationRoot);

    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("@supabase/supabase-js");
  });
});
