'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'

type Image = {
  id: string
  url: string
  alt: string
  categoryId: string
  categoryName: string
}

type Category = {
  id: string
  name: string
}

type Props = {
  images: Image[]
  categories: Category[]
  labels: {
    all: string
    close: string
    prev: string
    next: string
    empty: string
  }
}

export function GalleryGrid({ images, categories, labels }: Props) {
  const [filterCatId, setFilterCatId] = useState<string | null>(null)
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const filtered = useMemo(
    () => (filterCatId ? images.filter((i) => i.categoryId === filterCatId) : images),
    [images, filterCatId]
  )

  const close = useCallback(() => setOpenIdx(null), [])
  const next = useCallback(() => {
    setOpenIdx((i) => (i === null ? null : (i + 1) % filtered.length))
  }, [filtered.length])
  const prev = useCallback(() => {
    setOpenIdx((i) => (i === null ? null : (i - 1 + filtered.length) % filtered.length))
  }, [filtered.length])

  // Keyboard navigation
  useEffect(() => {
    if (openIdx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIdx, close, next, prev])

  // Body scroll lock when lightbox open
  useEffect(() => {
    if (openIdx !== null) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [openIdx])

  // Touch swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.targetTouches[0].clientX)
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) next()
      else prev()
    }
    setTouchStartX(null)
  }

  const current = openIdx !== null ? filtered[openIdx] : null

  if (images.length === 0) {
    return <p className="text-center text-ink-soft py-20">{labels.empty}</p>
  }

  return (
    <>
      {/* Category filter (only if more than one category) */}
      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setFilterCatId(null)}
            className={`px-4 py-2 text-xs tracking-widest uppercase border transition-colors ${
              filterCatId === null
                ? 'bg-ink text-cream border-ink'
                : 'bg-transparent text-ink-soft border-[var(--border)] hover:border-ink hover:text-ink'
            }`}
          >
            {labels.all}
          </button>
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setFilterCatId(c.id)}
              className={`px-4 py-2 text-xs tracking-widest uppercase border transition-colors ${
                filterCatId === c.id
                  ? 'bg-ink text-cream border-ink'
                  : 'bg-transparent text-ink-soft border-[var(--border)] hover:border-ink hover:text-ink'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {filtered.map((img, idx) => (
          <button
            type="button"
            key={img.id}
            onClick={() => setOpenIdx(idx)}
            className="group relative aspect-square overflow-hidden bg-cream-soft cursor-zoom-in"
          >
            <img
              src={img.url}
              alt={img.alt}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {current && (
        <div
          className="fixed inset-0 z-50 bg-ink/95 flex flex-col"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 text-cream/80 text-xs tracking-widest uppercase">
            <span>
              {(openIdx ?? 0) + 1} / {filtered.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                close()
              }}
              className="hover:text-cream"
              aria-label={labels.close}
            >
              {labels.close} ✕
            </button>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-12 pb-4">
            <img
              src={current.url}
              alt={current.alt}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Caption + nav */}
          <div className="px-6 py-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="text-cream/80 hover:text-cream text-xs tracking-widest uppercase"
              aria-label={labels.prev}
            >
              ← {labels.prev}
            </button>
            <p className="text-center text-cream/80 text-sm flex-1 truncate">
              {current.alt || current.categoryName}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="text-cream/80 hover:text-cream text-xs tracking-widest uppercase"
              aria-label={labels.next}
            >
              {labels.next} →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
