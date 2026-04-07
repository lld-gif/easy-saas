export function HowItWorks() {
  const steps = [
    { emoji: "🌐", title: "We scan the internet", description: "Twitter, Reddit, Fiverr, HN, Product Hunt, and more" },
    { emoji: "🤖", title: "AI extracts ideas", description: "Every mention is classified, deduplicated, and ranked" },
    { emoji: "🚀", title: "You build the next big thing", description: "Browse validated ideas with real demand signals" },
  ]

  return (
    <section className="py-16 px-4 bg-muted/50">
      <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {steps.map((step, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl mb-3">{step.emoji}</div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
