/**
 * Client-side typert contribution for the `plans` Host Remote namespace.
 *
 * This is the consumer half of the boundary the Host face (`PlansService`,
 * `src/host/index.ts`) exports. DSH normally emits it with the typert
 * generator; it is hand-written here to the same `TYPERT_REMOTE` shape, with
 * strict zod-v4 codecs so the client gateway accepts and encodes it.
 *
 * The client half mounts it with `ctx.remote.$mount(TYPERT_REMOTE)`, which
 * creates the `plans` namespace on the shared client Remote. The Host Gateway
 * resolves `plans/listPlans` through its src-mode discovery of the mounted
 * `PlansService`; no generated `./typert` host manifest is required for calls
 * to work (`resolveDescriptor` falls back to source discovery).
 */
import { z } from 'zod'
import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import type { ListPlansRequest, PlanSummary } from '../shared/types.js'

const listPlansRequestSchema = z.object({ sessionId: z.string() })

const planSummarySchema = z.object({
  id: z.string(),
  seq: z.number(),
  title: z.string(),
  plan: z.string(),
})

const listPlansResultSchema = z.union([
  z.object({ ok: z.literal(true), value: z.array(planSummarySchema) }),
  z.object({ ok: z.literal(false), error: z.unknown() }),
])

/** Typed Remote namespace the augmentation below exposes to DSH client consumers. */
export interface PlansRemoteNamespace {
  listPlans(request: ListPlansRequest): Promise<RemoteResult<PlanSummary[]>>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    plans: PlansRemoteNamespace
  }
}

export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: 'dsh-plan-explorer',
  descriptors: [
    {
      id: 'dsh-plan-explorer#plans/listPlans',
      service: 'plans',
      namespace: 'plans',
      method: 'listPlans',
      invocation: { kind: 'direct' },
      parameters: [
        {
          name: 'request',
          wire: 'request',
          source: 'json',
          codec: {
            mode: 'strict',
            typeSymbol: 'dsh-plan-explorer/types#ListPlansRequest',
            schema: listPlansRequestSchema,
          },
        },
      ],
      result: {
        mode: 'strict',
        typeSymbol: 'dsh-plan-explorer/types#RemoteResult<PlanSummary[]>',
        schema: listPlansResultSchema,
      },
    },
  ],
}

export default TYPERT_REMOTE
