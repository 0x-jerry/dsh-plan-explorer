/**
 * Plan-extraction domain logic, owned by the Host half. Types live in
 * src/shared/types.ts.
 */
import type { PlanSummary, ToolCallEventLike } from '../shared/types.js'

/** Extract the display title from a plan body. */
export function extractTitle(plan: string): string {
  const heading = /^#{1,6}\s+(.+)/m.exec(plan)
  if (heading) return heading[1]!.trim()
  const first = plan.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0)
  return first ?? 'Untitled plan'
}

/**
 * Select `exit_plan_mode` tool calls from an event log and build owned,
 * minimal `PlanSummary` objects (never the live Session/Event objects).
 * Malformed or non-string payloads are skipped; results are newest-first.
 */
export function extractPlans(events: readonly unknown[]): PlanSummary[] {
  const plans: PlanSummary[] = []
  for (const raw of events) {
    const ev = raw as ToolCallEventLike
    if (!ev || typeof ev !== 'object') continue
    if (ev.type !== 'tool/call') continue
    const data = ev.data
    if (!data || typeof data !== 'object') continue
    if (data.name !== 'exit_plan_mode') continue
    if (typeof data.arguments !== 'string') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(data.arguments)
    } catch {
      continue
    }
    if (parsed === null || typeof parsed !== 'object') continue
    const plan = (parsed as { plan?: unknown }).plan
    if (typeof plan !== 'string') continue
    plans.push({ id: String(ev.seq), seq: ev.seq, title: extractTitle(plan), plan })
  }
  plans.sort((a, b) => b.seq - a.seq)
  return plans
}
