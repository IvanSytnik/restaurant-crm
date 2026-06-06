'use client'

import { useEffect, useState } from 'react'

type NavItem = { slug: string; name: string }

type Props = {
  categories: NavItem[]
}

export function MenuAnchorNav({ categories }: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(categories[0]?.slug ?? null)

  // Highlight current section as user scrolls.
  useEffect(() => {
    if (categories.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the section closest to the top that is at least partially visible.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          const id = (visible[0].target as HTMLElement).id
          const slug = id.replace(/^cat-/, '')
          setActiveSlug(slug)
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )

    categories.forEach((c) => {
      const el = document.getElementById(`cat-${c.slug}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [categories])

  const onClick = (slug: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const el = document.getElementById(`cat-${slug}`)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 100
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveSlug(slug)
  }

  if (categories.length === 0) return null

  return (
    <div className="sticky top-20 z-20 bg-cream/95 backdrop-blur border-b border-[var(--border)]">
      <div className="max-w-8xl mx-auto px-6 lg:px-12">
        <nav className="flex gap-7 overflow-x-auto py-4 text-xs tracking-widest uppercase no-scrollbar">
          {categories.map((c) => (
            <a
              key={c.slug}
              href={`#cat-${c.slug}`}
              onClick={onClick(c.slug)}
              className={`whitespace-nowrap transition-colors pb-1 border-b ${
                activeSlug === c.slug
                  ? 'text-ink border-accent'
                  : 'text-ink-soft border-transparent hover:text-ink'
              }`}
            >
              {c.name}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
