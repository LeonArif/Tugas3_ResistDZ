import { useEffect, useState } from 'react'

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  useEffect(() => {
    setIsLoggedIn(Boolean(window.localStorage.getItem('authToken')))
    const onStorage = () => setIsLoggedIn(Boolean(window.localStorage.getItem('authToken')))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleLogout = () => {
    window.localStorage.removeItem('authToken')
    window.localStorage.removeItem('authEmail')
    window.localStorage.removeItem('authUsername')
    window.localStorage.removeItem('authPassword')
    window.location.href = '/login'
  }

  return (
    <header className="h-20 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-600">
            II4021 Kriptografi
          </p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">
            Pembuatan Aplikasi Chat Web 🗝₊˚⊹♡
          </h1>
        </div>

        <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="rounded-full bg-red-50 px-3 py-1 text-red-700 hover:bg-red-100"
            >
              Logout
            </button>
          ) : (
            <a></a>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar