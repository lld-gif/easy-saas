export function BlurredPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 p-6 bg-zinc-900">
      <div className="blur-sm select-none pointer-events-none space-y-4">
        <h3 className="font-bold text-lg text-zinc-100">Tech Spec</h3>
        <p className="text-sm text-zinc-400">Recommended Stack: Next.js + Supabase + Vercel</p>
        <p className="text-sm text-zinc-400">Data Model: users, items, payments, analytics</p>
        <h3 className="font-bold text-lg mt-4 text-zinc-100">Brand Kit</h3>
        <p className="text-sm text-zinc-400">Names: AppFlow, BuildIt, LaunchPad</p>
        <p className="text-sm text-zinc-400">Colors: #FF6B6B, #4ECDC4, #45B7D1</p>
        <h3 className="font-bold text-lg mt-4 text-zinc-100">Launch Checklist</h3>
        <p className="text-sm text-zinc-400">☐ Build MVP ☐ Deploy ☐ Product Hunt launch</p>
      </div>
    </div>
  )
}
