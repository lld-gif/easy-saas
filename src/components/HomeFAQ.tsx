"use client"

import { useState } from "react"

interface FAQItem {
  question: string
  answer: string
}

export function HomeFAQ({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="divide-y divide-border/50">
      {items.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-foreground hover:text-orange-500 transition-colors"
          >
            {item.question}
            <span className="ml-4 shrink-0 text-muted-foreground">
              {openIndex === i ? "\u2212" : "+"}
            </span>
          </button>
          {openIndex === i && (
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {item.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
