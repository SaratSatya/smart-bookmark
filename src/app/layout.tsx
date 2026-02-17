import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
          <main className="w-full">{children}</main>
        </div>
      </body>
    </html>
  )
}
