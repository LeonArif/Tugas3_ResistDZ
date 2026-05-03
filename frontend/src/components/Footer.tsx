const Footer = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>Frontend untuk registrasi, login JWT, dan desain chat terenkripsi.</p>
        <p>FastAPI backend, ECDH key exchange, dan AES messaging sudah disiapkan.</p>
      </div>
    </footer>
  )
}

export default Footer