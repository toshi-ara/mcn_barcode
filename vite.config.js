import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  root: "src",
  base: "./",
  build: {
    outDir: "../dist",
  },
  plugins: [
    VitePWA({
      manifest: {
        "name": "MCN barcode reader",
        "short_name": "barcode reader",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#317EFB",
        "icons": [
          {
            "src": "icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
      }
    })
  ],
});

