export function BlurredPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border p-6 bg-card">
      <div className="blur-sm select-none pointer-events-none space-y-4">
        <h3 className="font-bold text-lg text-foreground">Tech Spec</h3>
        <p className="text-sm text-muted-foreground">Recommended Stack: Next.js + Supabase + Vercel</p>
        <p className="text-sm text-muted-foreground">Data Model: users, items, payments, analytics</p>
        <h3 className="font-bold text-lg mt-4 text-foreground">Brand Kit</h3>
        <p className="text-sm text-muted-foreground">Names: AppFlow, BuildIt, LaunchPad</p>
        <p className="text-sm text-muted-foreground">Colors: #FF6B6B, #4ECDC4, #45B7D1</p>
        <h3 className="font-bold text-lg mt-4 text-foreground">Launch Checklist</h3>
        <p className="text-sm text-muted-foreground">☐ Build MVP ☐ Deploy ☐ Product Hunt launch</p>
      </div>
    </div>
  )
}
