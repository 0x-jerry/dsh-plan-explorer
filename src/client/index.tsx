/**
 * Browser client half of the Plans plugin.
 *
 * Registers a "Plans" tab type in the right sidebar. The tab lists plan-mode
 * plans of the active session and previews the selected plan's markdown.
 *
 * VERIFIED against the shipped client-UI slot registration pattern (the guide /
 * files / documentpreview plugins) and `Slots.listSubTree`:
 *   - `sidebarRightTabs.register(definition)` -> disposer
 *   - `slots.inject('sidebar.right.pane.tab', () => slots.register({name,key}, Body))`
 *   - `slots.inject('sidebar.right.pane.tab.title', ...)`
 *   - tab body standard props include `sessionId` (and `useSession`).
 *
 * DATA FLOW (the one integration seam): plan bodies live on the Host. The client
 * reads them through the `plans` Host Remote namespace: `apply` mounts the
 * `TYPERT_REMOTE` contribution (`ctx.remote.$mount`), which materialises
 * `ctx.remote.plans`; the Host Gateway src-dispatches `plans/listPlans` to the
 * `PlansService` face. A Remote unary call resolves to a `RemoteResult` envelope
 * (`{ok:true,value}|{ok:false,error}`), never a rejection.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { TYPERT_REMOTE, type PlansRemoteNamespace } from '../typert/remote.js'
import type { PlanSummary } from '../shared/types.js'

export const name = 'dsh-plan-explorer'
export const inject = ['slots', 'sidebarRightTabs', 'remote']

const TAB_ID = 'plans-sidebar'
const KIND = 'dshPlans'

// The MarkdownText primitive chrome labels; the plugin ships no locale yet.
const MD_LABELS = {
  code: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  footnotes: 'Footnotes',
}

/** The `plans` namespace on the shared client Remote, once this plugin mounts it. */
function plansRemote(ctx: Context): PlansRemoteNamespace {
  return ctx.remote.plans
}

const styles: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', padding: 12, gap: 8, boxSizing: 'border-box' },
  header: { fontWeight: 600 },
  list: { display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', flex: 1 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
    padding: '8px 10px', border: 'none', borderRadius: 6, background: 'transparent',
    color: 'inherit', textAlign: 'left', cursor: 'pointer', font: 'inherit',
  },
  rowTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowSeq: { opacity: 0.6, fontSize: 12, flexShrink: 0 },
  back: { alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '4px 6px' },
  preview: { flex: 1, overflow: 'auto' },
  note: { padding: 8, opacity: 0.7 },
}

interface PlanBodyProps {
  sessionId: string
}

function PlanBody(props: PlanBodyProps, ctx: Context): ReactElement {
  const [list, setList] = useState<PlanSummary[] | null>(null)
  const [selected, setSelected] = useState<PlanSummary | null>(null)
  const source = useMemo(() => plansRemote(ctx), [ctx])

  useEffect(() => {
    let alive = true
    setList(null)
    setSelected(null)
    Promise.resolve(source?.listPlans({ sessionId: props.sessionId }))
      .then((result) => { if (alive) setList(result?.ok ? result.value : []) })
      .catch(() => { if (alive) setList([]) })
    return () => { alive = false }
  }, [source, props.sessionId])

  if (list === null) {
    return <div style={styles.note}>Loading plans…</div>
  }
  if (selected !== null) {
    return (
      <div style={styles.root}>
        <button style={styles.back} onClick={() => setSelected(null)}>← Back to list</button>
        <div style={styles.preview}>
          <h3>{selected.title}</h3>
          <MarkdownText text={selected.plan} labels={MD_LABELS} />
        </div>
      </div>
    )
  }
  return (
    <div style={styles.root}>
      <div style={styles.header}>Plans</div>
      {list.length === 0 ? (
        <div style={styles.note}>No plan-mode plans in this session.</div>
      ) : (
        <div style={styles.list}>
          {list.map((p) => (
            <button key={p.id} style={styles.row} onClick={() => setSelected(p)}>
              <span style={styles.rowTitle}>{p.title}</span>
              <span style={styles.rowSeq}>#{p.seq}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** DSH client services this plugin consumes; typed by the package Context augmentations. */
export function apply(ctx: Context): void {
  const tabs = ctx.sidebarRightTabs
  const slots = ctx.slots

  // Mount the `plans` Remote namespace on the shared client Remote, owned by this
  // plugin fiber so it unmounts (and its methods withdraw) on unload.
  ctx.effect(async () => ctx.remote.$mount(TYPERT_REMOTE))

  tabs.register({
    id: TAB_ID,
    kind: KIND,
    priority: 'extension',
    title: () => 'Plans',
    guide: [{ order: 30, title: () => 'Plans', description: () => 'Browse plan-mode plans in this session' }],
  })

  ctx.effect(() => slots.inject('sidebar.right.pane.tab', () => slots.register(
    { name: 'sidebar.right.pane.tab', key: TAB_ID },
    (props: PlanBodyProps) => PlanBody(props, ctx),
  )))

  ctx.effect(() => slots.inject('sidebar.right.pane.tab.title', () => slots.register(
    { name: 'sidebar.right.pane.tab.title', key: TAB_ID },
    () => <span>Plans</span>,
  )))
}
