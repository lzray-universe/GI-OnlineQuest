import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repoName = env.GITHUB_REPOSITORY?.split('/')[1]
  const base = env.VITE_BASE || (repoName ? `/${repoName}/` : '/')

  return {
    plugins: [react()],
    base,
    build: {
      sourcemap: true,
    },
    test: {
      environment: 'jsdom',
    },
  }
})
