import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep heavy charting libs out of the main UI chunk.
          if (id.includes('node_modules')) {
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts'
            if (id.includes('react-icons')) return 'icons'
            return 'vendor'
          }

          // Split large static datasets/utilities so they don't bloat the entry chunk.
          if (id.includes('/src/data/')) return 'data'
          if (id.includes('/src/utils/')) return 'utils'
        },
      },
    },
  },
})
