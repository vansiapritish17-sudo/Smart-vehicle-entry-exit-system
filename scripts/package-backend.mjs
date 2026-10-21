// Builds the Spring Boot jar with the Maven wrapper; the jar bundles ../dist (run `vite build` first).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const backend = fileURLToPath(new URL("../backend/", import.meta.url));
// Absolute path: some Windows shells do not search the current directory for commands.
const wrapper = `"${backend}${process.platform === "win32" ? "mvnw.cmd" : "mvnw"}"`;

const result = spawnSync(wrapper, ["-q", "-B", "clean", "package", "-DskipTests"], {
  cwd: backend,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
