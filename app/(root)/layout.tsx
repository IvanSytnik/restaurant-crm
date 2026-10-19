import '../globals.css'

// Root layout for `/`, which only redirects to the default public locale.
// The app has one root layout per tree so that <html lang> can come from the
// URL on the public site and from the user's settings in the admin panel.
export default function RedirectRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  )
}
