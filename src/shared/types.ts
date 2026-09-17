/**
 * Plan data types shared by the Host (src/host/plans.ts) and the Client
 * (src/client/client.tsx). The extraction logic lives on the Host.
 *
 * A "plan" is an `exit_plan_mode` tool-call event: the session log stores it as
 * a `tool/call` `SessionEvent` whose `data.arguments` JSON string carries a
 * `plan` field with the markdown body.
 */

export interface PlanSummary {
  /** Stable id; the event sequence number formatted as a string. */
  id: string
  /** The event sequence number; used for newest-first ordering. */
  seq: number
  /** First markdown heading (H1–H6), else first non-empty line, else a fallback. */
  title: string
  /** The raw markdown plan body. */
  plan: string
}

/**
 * Wire payload of the `plans.listPlans` Remote call. Single request object so the
 * generated typert boundary stays a one-parameter unary method.
 */
export interface ListPlansRequest {
  /** The session whose plan-mode plans are requested. */
  sessionId: string
}

/** Minimal structural shape of a `tool/call` SessionEvent that we read. */
export interface ToolCallEventLike {
  type: string
  seq: number
  data?: { name?: unknown; arguments?: unknown }
}
