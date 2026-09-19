/**
 * Placeholder for an admin section that is planned but not built yet.
 *
 * Presentational only — the caller resolves the copy from `messages`, so the
 * component stays reusable for any future section. Pair it with a `badge:
 * 'soon'` entry in the AdminShell nav so the sidebar and the page agree.
 */
export function ComingSoon({
  icon,
  title,
  subtitle,
  metrics,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  metrics: string[]
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-10 sm:px-10 sm:py-14">
      <div className="max-w-xl mx-auto text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
          {icon}
        </div>

        <h1 className="mt-5 text-xl sm:text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2.5 text-sm text-gray-500 leading-relaxed">{subtitle}</p>

        {metrics.length > 0 && (
          <ul className="mt-8 space-y-2.5 text-left border-t border-gray-100 pt-8">
            {metrics.map((metric) => (
              <li key={metric} className="flex items-start gap-2.5 text-sm text-gray-400">
                <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                <span>{metric}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
