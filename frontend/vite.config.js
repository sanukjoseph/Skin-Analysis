import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build", // Optional: specify output directory, CRA uses 'build'
  },
  server: {
    proxy: {
      // Change this to any base path you are using. Here's an example
      // for a common scenario wa graphql server locally.
      "/api": {
        target: "http://127.0.0.1:5000", // Backend address
      },
    },
  },
});
