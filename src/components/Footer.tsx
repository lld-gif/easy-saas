export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-xs text-zinc-500">
          &copy; {new Date().getFullYear()} EasySaaS
        </p>
      </div>
    </footer>
  )
}
