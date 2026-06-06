type Props = {
  eyebrow: string
  title: string
  subtitle?: string
}

export function PageHero({ eyebrow, title, subtitle }: Props) {
  return (
    <section className="bg-cream pt-32 pb-12 lg:pt-40 lg:pb-20 border-b border-[var(--border)]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 text-center">
        <p className="public-eyebrow text-accent">{eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-ink leading-[1.1] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 text-base sm:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
