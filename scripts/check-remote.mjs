/**
 * Wire-contract self-check for the `plans` Host Remote namespace.
 *
 * Verifies the two hand-rolled seams of the typert boundary against the real
 * `@deepseek-ai/dsh-typert-protocol` reader, so drift surfaces as a failing check
 * instead of a silent "no plans" tab:
 *   1. `markRemoteMethod` registers a marker the protocol's `remoteMethods`
 *      discovers (the Host Gateway's src-mode dispatch depends on this), and is
 *      idempotent across re-mounts.
 *   2. The client `TYPERT_REMOTE` descriptor passes the strict-codec gate the
 *      client Gateway applies on `$mount` (one JSON parameter + result, both
 *      strict, unique wires, clean endpoint segment), and its wire method/param
 *      line up with the Host marker.
 * Requires a prior `pnpm bundle` (reads `lib/`).
 */
import assert from 'node:assert'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { markRemoteMethod } from '../lib/index.js'

// --- 1. marker reader contract ---------------------------------------------
class DummyService {
  constructor() { markRemoteMethod(this, 'listPlans') }
  listPlans() {}
}
const markers = remoteMethods(new DummyService())
assert.strictEqual(markers.length, 1, 'expected exactly one Remote marker')
assert.strictEqual(markers[0].method, 'listPlans')
assert.deepStrictEqual(markers[0].invocation, { kind: 'direct' })
// Re-construction on the same prototype must not duplicate the marker.
new DummyService()
assert.strictEqual(remoteMethods(new DummyService()).length, 1, 'marker must be idempotent')
console.log('ok: remoteMethods discovers the markRemoteMethod marker')

// --- 2. client contribution descriptor gate --------------------------------
const { TYPERT_REMOTE } = await import('../src/typert/remote.ts')
const descriptor = TYPERT_REMOTE.descriptors[0]
assert.ok(TYPERT_REMOTE.descriptors.length === 1, 'one endpoint')
assert.strictEqual(descriptor.invocation.kind, 'direct')
const wires = new Set()
for (const p of descriptor.parameters) {
  assert.strictEqual(p.source, 'json')
  assert.strictEqual(p.codec.mode, 'strict', `${p.wire} must use a strict codec`)
  assert.ok(!wires.has(p.wire), `repeated wire field ${p.wire}`)
  wires.add(p.wire)
  assert.ok(!!p.codec.schema.parse, `schema must be parseable: ${p.wire}`)
}
assert.strictEqual(descriptor.result.mode, 'strict', 'result must use a strict codec')
assert.ok(!!descriptor.result.schema.parse)
assert.ok(/^[A-Za-z0-9._-]+$/.test(descriptor.namespace) && /^[A-Za-z0-9._-]+$/.test(descriptor.method))
// Wire alignment: the descriptor's single param feed the host method's `request`.
assert.deepStrictEqual(descriptor.parameters.map(p => p.wire), ['request'])
assert.strictEqual(descriptor.method, 'listPlans', 'client method must match host marker')
console.log('ok: TYPERT_REMOTE descriptors pass the strict-codec mount gate')
