import Link from 'next/link'

export default function PublicNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-cream text-ink px-6">
      <div className="text-center max-w-md">
        <p className="public-eyebrow text-accent mb-4">404</p>
        <h1 className="font-display text-4xl sm:text-5xl mb-4">Page not found</h1>
        <p className="text-ink-soft mb-8">The page you are looking for doesn&rsquo;t exist or has been moved.</p>
        <Link
          href="/de"
          className="inline-block bg-ink text-cream px-6 py-3 text-sm tracking-wider uppercase hover:bg-black transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
