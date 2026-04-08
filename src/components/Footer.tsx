export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} EasySaaS
        </p>
      </div>
    </footer>
  )
}
