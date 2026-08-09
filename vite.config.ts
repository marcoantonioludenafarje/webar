import { defineConfig } from "vite";
import { resolve } from "node:path";

// Multi-page setup: the root page is the lab launcher, each demo is its own
// HTML entry point under src/demos/<demo>/index.html. This keeps every demo
// runnable independently (Demo 01 acceptance criteria) without introducing
// a client-side router.
export default defineConfig({
  // Relative base so the built site works both at a domain root and under a
  // subpath (e.g. GitHub Pages project sites at <user>.github.io/<repo>/).
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        demo01: resolve(__dirname, "src/demos/demo-01-camera/index.html"),
        demo02: resolve(__dirname, "src/demos/demo-02-tracking/index.html"),
      },
    },
  },
});
