import { defineConfig } from "vite";

// Relative base so the build works under a GitHub Pages subpath (/AyushKr2003/)
// as well as at a domain root.
export default defineConfig({
  base: "./",
});
