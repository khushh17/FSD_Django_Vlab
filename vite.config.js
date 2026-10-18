import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base: the site uses HashRouter, so the document URL never changes
// and './' works under any GitHub Pages repo path without knowing the repo name.
// TODO: if you prefer an absolute base, set it to '/<REPO_NAME>/'.
export default defineConfig({
  base: './',
  plugins: [react()],
})
