const Navbar = () => {
  return (
    <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-600">
            II4021 Kriptografi
          </p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">
            Secure Chat From Dr. Zombie (DZ)
          </h1>
        </div>

        <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <a className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-950" href="/">
            Register
          </a>
          <a className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-950" href="/login">
            Login
          </a>
          <a className="rounded-full px-3 py-1 transition hover:bg-slate-100 hover:text-slate-950" href="/chat">
            Chat
          </a>
        </nav>
      </div>
    </header>
  )
}

export default Navbar