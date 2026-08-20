import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page setup: the root page is the lab launcher, each lab is its own
// HTML entry point under src/labs/<lab>/index.html. This keeps every lab
// runnable independently without introducing a client-side router.
export default defineConfig({
  // Relative base so the built site works both at a domain root and under a
  // subpath (e.g. GitHub Pages project sites at <user>.github.io/<repo>/).
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        lab01: resolve(__dirname, "src/labs/lab-01-camera/index.html"),
        lab02: resolve(__dirname, "src/labs/lab-02-image-tracking/index.html"),
        lab03: resolve(__dirname, "src/labs/lab-03-3d-character/index.html"),
      },
    },
  },
});
