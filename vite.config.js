import restart from 'vite-plugin-restart'
// import { defineConfig } from 'vite'

// export default defineConfig({
//     build: {
//         target: 'es2022'
//     }
// })

export default {
    root: 'src/', // Sources files (typically where index.html is)
    base: '/sphere/',
    publicDir: '../static/', // Path from "root" to static assets (files that are served as they are)
    server:
    {
        host: true, // Open to local network and display URL
        open: !('SANDBOX_URL' in process.env || 'CODESANDBOX_HOST' in process.env) // Open if it's not a CodeSandbox
    },
    build:
    {
        // changed for github pages
        outDir: '../docs', // Output in the dist/ folder
        emptyOutDir: true, // Empty the folder first
        sourcemap: true, // Add sourcemap
        target: 'es2022'
    },
    plugins:
        [
            restart({ restart: ['../static/**',] }) // Restart server on static file change
        ],
}