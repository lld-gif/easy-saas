export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} EasySaaS
        </p>
      </div>
    </footer>
  )
}
