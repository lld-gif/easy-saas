export function BlurredPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 p-6 bg-gray-50">
      <div className="blur-sm select-none pointer-events-none space-y-4">
        <h3 className="font-bold text-lg">Tech Spec</h3>
        <p className="text-sm text-gray-600">Recommended Stack: Next.js + Supabase + Vercel</p>
        <p className="text-sm text-gray-600">Data Model: users, items, payments, analytics</p>
        <h3 className="font-bold text-lg mt-4">Brand Kit</h3>
        <p className="text-sm text-gray-600">Names: AppFlow, BuildIt, LaunchPad</p>
        <p className="text-sm text-gray-600">Colors: #FF6B6B, #4ECDC4, #45B7D1</p>
        <h3 className="font-bold text-lg mt-4">Launch Checklist</h3>
        <p className="text-sm text-gray-600">☐ Build MVP ☐ Deploy ☐ Product Hunt launch</p>
      </div>
    </div>
  )
}
