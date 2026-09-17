/**
 * Host half of the Plans plugin.
 *
 * Exposes plan-mode (`exit_plan_mode`) tool calls from a live session's log as a
 * Host Remote service `plans.listPlans(sessionId)`, readable from the browser
 * client half as `ctx.remote.plans`. The method is registered with the marker
 * typert-protocol stores on the prototype, so the Host typert Gateway's src-mode
 * discovery dispatches `plans/listPlans` to it — no generated `./typert` loader
 * artifact is required for calls to work.
 */
import type { Context } from '@deepseek-ai/cordis'
import { TypertRemoteService, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { SessionId, type Session } from '@deepseek-ai/dsh-session'
import { extractPlans } from './plans.js'
import type { ListPlansRequest, PlanSummary } from '../shared/types.js'

export const name = 'dsh-plan-explorer'
export const inject: string[] = []

/** The narrowed `sessions` service shape we consume. */
export interface SessionsLike {
  get(id: string): Session | undefined
}

/**
 * Prototype key that holds the `{ version: 1, methods: [...] }` Remote-marker
 * descriptor. typert-protocol's `@Remote` decorator writes this via a standard
 * decorator; the bundler (tsdown/rolldown) does not transform stage-3
 * decorators, so we write the same marker shape directly to keep the emitted
 * ESM valid JS. Marking is idempotent per method.
 */
const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods'

/** Register one direct Remote method marker on a service's prototype. */
export function markRemoteMethod(service: object, method: string): void {
  const prototype = Object.getPrototypeOf(service)
  const property = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR)
  const descriptor = property === undefined ? undefined : property.value as { methods?: Array<{ method: string }> }
  if (descriptor?.methods?.some((m) => m.method === method)) return
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze({
      version: 1,
      methods: Object.freeze([...(descriptor?.methods ?? []), Object.freeze({
        method,
        invocation: Object.freeze({ kind: 'direct' }),
      })]),
    }),
  })
}

/**
 * Host Remote face for plan reading. The wire service key and namespace are both
 * `plans`; the client mounts the matching `TYPERT_REMOTE` contribution so
 * `ctx.remote.plans.listPlans({ sessionId })` resolves here.
 */
export class PlansService extends TypertRemoteService {
  static inject = ['sessions']

  constructor(ctx: Context) {
    super(ctx, 'plans')
    markRemoteMethod(this, 'listPlans')
  }

  async listPlans(request: ListPlansRequest): Promise<RemoteResult<PlanSummary[]>> {
    const sessions = this.ctx.get('sessions') as SessionsLike | undefined
    const session = sessions?.get(SessionId(request.sessionId))
    return { ok: true, value: session ? extractPlans(session.snapshotEvents()) : [] }
  }
}

export function apply(ctx: Context): void {
  ctx.plugin(PlansService)
}
