import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'docs/media/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Images are arbitrary admin-provided URLs (menu, gallery, promotions), so
    // next/image would need an open remotePatterns list. Plain <img> is intended.
    rules: { '@next/next/no-img-element': 'off' },
  },
]

export default config
