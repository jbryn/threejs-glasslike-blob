import { defineConfig } from 'vite'

export default defineConfig({
    // Relative base so the build works from a sub-path (e.g. GitHub Pages)
    base: './',
    build: {
        rolldownOptions: {
            input: {
                index: 'index.html',
                'glass-blob': 'src/glass-blob.js'
            },
            output: {
                // The component keeps a stable, unhashed URL so embed codes don't break between deploys
                entryFileNames: (chunk) => chunk.name === 'glass-blob' ? 'glass-blob.js' : 'assets/[name]-[hash].js'
            }
        }
    }
})
