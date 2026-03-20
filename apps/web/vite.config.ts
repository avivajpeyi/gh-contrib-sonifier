import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function withTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export default defineConfig(() => {
  const explicitBase = process.env.VITE_BASE_PATH;
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const base = explicitBase
    ? withTrailingSlash(explicitBase)
    : repository
      ? `/${repository}/`
      : "/";

  return {
    plugins: [react()],
    base
  };
});

