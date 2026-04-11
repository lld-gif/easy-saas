import { createClient } from "@supabase/supabase-js"
import type { Idea } from "@/types"

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface DedupCandidate {
  id: string
  idea_a: string
  idea_b: string
  similarity: number
  status: string
  reviewed_at: string | null
  created_at: string
}

export interface DedupPair {
  candidate: DedupCandidate
  ideaA: Idea
  ideaB: Idea
  sourceCountA: number
  sourceCountB: number
}

export interface DedupStats {
  pending: number
  merged: number
  dismissed: number
}

export async function getDedupStats(): Promise<DedupStats> {
  const supabase = getServiceClient()

  const [
    { count: pending },
    { count: merged },
    { count: dismissed },
  ] = await Promise.all([
    supabase
      .from("dedup_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("dedup_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "merged"),
    supabase
      .from("dedup_candidates")
      .select("*", { count: "exact", head: true })
      .eq("status", "dismissed"),
  ])

  return {
    pending: pending || 0,
    merged: merged || 0,
    dismissed: dismissed || 0,
  }
}

export async function getDedupCandidates(): Promise<{
  pairs: DedupPair[]
  stats: DedupStats
}> {
  const supabase = getServiceClient()

  // Fetch stats
  const stats = await getDedupStats()

  // Fetch pending candidates ordered by similarity desc
  const { data: candidates, error } = await supabase
    .from("dedup_candidates")
    .select("*")
    .eq("status", "pending")
    .order("similarity", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Failed to fetch dedup candidates:", error)
    return { pairs: [], stats }
  }

  if (!candidates || candidates.length === 0) {
    return { pairs: [], stats }
  }

  // Collect all idea IDs
  const ideaIds = new Set<string>()
  for (const c of candidates) {
    ideaIds.add(c.idea_a)
    ideaIds.add(c.idea_b)
  }

  // Fetch all referenced ideas
  const { data: ideas } = await supabase
    .from("ideas")
    .select("*")
    .in("id", Array.from(ideaIds))

  const ideaMap = new Map<string, Idea>()
  for (const idea of (ideas || []) as Idea[]) {
    ideaMap.set(idea.id, idea)
  }

  // Fetch source counts for all referenced ideas
  const { data: sourceCounts } = await supabase
    .from("idea_sources")
    .select("idea_id")
    .in("idea_id", Array.from(ideaIds))

  const sourceCountMap = new Map<string, number>()
  for (const row of sourceCounts || []) {
    sourceCountMap.set(row.idea_id, (sourceCountMap.get(row.idea_id) || 0) + 1)
  }

  // Build pairs
  const pairs: DedupPair[] = []
  for (const candidate of candidates as DedupCandidate[]) {
    const ideaA = ideaMap.get(candidate.idea_a)
    const ideaB = ideaMap.get(candidate.idea_b)

    // Skip if either idea was deleted
    if (!ideaA || !ideaB) continue

    pairs.push({
      candidate,
      ideaA,
      ideaB,
      sourceCountA: sourceCountMap.get(candidate.idea_a) || 0,
      sourceCountB: sourceCountMap.get(candidate.idea_b) || 0,
    })
  }

  return { pairs, stats }
}

export async function mergeIdeas(winnerId: string, loserId: string) {
  const supabase = getServiceClient()

  const { error } = await supabase.rpc("merge_ideas", {
    winner_id: winnerId,
    loser_id: loserId,
  })

  if (error) throw new Error(error.message)
}

export async function dismissCandidate(candidateId: string) {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from("dedup_candidates")
    .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
    .eq("id", candidateId)

  if (error) throw new Error(error.message)
}

export async function refreshDedupCandidates(): Promise<number> {
  const supabase = getServiceClient()

  const { data, error } = await supabase.rpc("find_dedup_candidates")

  if (error) throw new Error(error.message)

  return data as number
}
