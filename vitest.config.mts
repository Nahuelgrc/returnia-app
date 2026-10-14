import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: false,
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup-env.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup-env.ts", "tests/setup-dom.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["app/actions/**", "app/api/prices/route.ts", "app/api/search/route.ts", "lib/**", "auth.ts"],
      exclude: ["lib/db.ts", "lib/types.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 70, functions: 70, statements: 70, branches: 70 },
    },
  },
});
