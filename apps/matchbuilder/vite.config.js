import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-shared-referencedata',
      buildStart() {
        // Copy shared referencedata files to public folder during build
        const sharedPath = resolve(__dirname, '../../referencedata')
        const publicPath = resolve(__dirname, 'public')
        try {
          copyFileSync(`${sharedPath}/characters.csv`, `${publicPath}/characters.csv`)
          copyFileSync(`${sharedPath}/capsules.csv`, `${publicPath}/capsules.csv`)
          copyFileSync(`${sharedPath}/capsule-rules.yaml`, `${publicPath}/capsule-rules.yaml`)
        } catch (err) {
          console.warn('Could not copy shared referencedata files:', err.message)
        }
      }
    }
  ],
  base: '/SparkingZero/matchbuilder/'
})