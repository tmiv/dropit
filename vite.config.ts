import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/dropit/',
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', '*.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      manifest: {
          name: "Drop It Like It's Squat!",
          short_name: "Drop It!",
          description: "",
          start_url: "/dropit/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#ffffff",
          orientation: "portrait-primary",
          icons: [
            {
              src: "/dropit/GSquat-192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/dropit/GSquat-512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "/dropit/GSquat-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ],
          shortcuts: [
            {
              name: "Open Timer",
              short_name: "Timer",
              description: "Open the checkbox timer",
              url: "/dropit/",
              icons: [{ "src": "/dropit/GSquat-192.png", "sizes": "192x192" }]
            }
          ],
          categories: ["productivity", "utilities"],
          prefer_related_applications: false
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp4}'],
        },
        devOptions: {
          enabled: true,
          type: 'module'
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp4}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: new RegExp('/*'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'app-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ]
  })