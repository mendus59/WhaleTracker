import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the same build works at a domain root
  // (Firebase Hosting) and under /WhaleTracker/ (GitHub Pages).
  base: './',
  test: { environment: 'node' },
} as any);
