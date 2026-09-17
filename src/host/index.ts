/**
 * Host half of the Plans plugin.
 *
 * Reads plan-mode (`exit_plan_mode`) tool calls from a live session's log and
 * exposes them as a host-side service `plans.listPlans(sessionId)`.
 *
 * VERIFIED against the real `sessions` service (`ctx.get('sessions')` ->
 * `sessions.get(id)` -> `session.snapshotEvents()`) and the `Session`
 * /`SessionEvent` types. This half is correct and self-contained on the host.
 *
 * The host service must be bridged to the browser client half through a
 * Remote/typert namespace (typert codegen), which requires a deepseek-harness
 * checkout.
 */
import type { Context } from '@deepseek-ai/cordis'
import { SessionId, type Session } from '@deepseek-ai/dsh-session'
import { extractPlans } from './plans.js'
import type { PlanSummary } from '../shared/types.js'

export const name = 'dsh-plan-explorer'
export const inject: string[] = []

export interface PlansHostService {
  /** List plan-mode plans of one session, newest first. Empty when the session is unknown. */
  listPlans(sessionId: string): PlanSummary[]
}

/** The narrowed `sessions` service shape we consume. */
export interface SessionsLike {
  get(id: string): Session | undefined
}

export function apply(ctx: Context): void {
  function listPlans(sessionId: string): PlanSummary[] {
    const sessions = ctx.get('sessions')
    const session = sessions?.get(SessionId(sessionId))
    if (!session) return []
    return extractPlans(session.snapshotEvents())
  }

  ctx.provide(name, { listPlans })
}
