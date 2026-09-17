/**
 * Browser client half of the Plans plugin.
 *
 * Registers a "Plans" tab type in the right sidebar plus a "Plans" footer
 * action that opens it. The tab lists plan-mode plans of the active session and
 * previews the selected plan's markdown.
 *
 * VERIFIED against the shipped client-UI slot registration pattern (the guide /
 * files / documentpreview plugins) and `Slots.listSubTree`:
 *   - `sidebarRightTabs.register(definition)` -> disposer
 *   - `slots.inject('sidebar.right.pane.tab', () => slots.register({name,key}, Body))`
 *   - `slots.inject('sidebar.right.pane.tab.title', ...)`
 *   - `slots.inject('sidebar.footer.action', ...)` and `ctx.sidebarRight.openTab(kind)`
 *   - tab body standard props include `sessionId` (and `useSession`).
 *
 * DATA FLOW (the one integration seam): the plan bodies live on the Host. The
 * client resolves them through the `plansSource` below, which reads a
 * Host->client Remote namespace if present.
 */
import type { Context, Effect } from '@deepseek-ai/cordis'
import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PlanSummary } from './plans.js'

export const name = 'dsh-plan-explorer'
export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight']

const TAB_ID = 'plans-sidebar'
const KIND = 'dshPlans'

// The MarkdownText primitive chrome labels; the plugin ships no locale yet.
const MD_LABELS = {
  code: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  footnotes: 'Footnotes',
}

/** Minimal typed view of the Host's `plans` Remote namespace, when present. */
export interface PlansRemoteFace {
  listPlans(sessionId: string): Promise<PlanSummary[]>
}

function clientOfPlansSource(ctx: Context): PlansRemoteFace | undefined {
  // The Host provides `plans` (see src/index.ts); when a typert Remote namespace
  // is wired, it appears on the client as `ctx.remote.plans`. Typed via a local
  // interface + `any` cast because the namespace is generated at build time.
  const remote = (ctx as unknown as { remote?: { plans?: PlansRemoteFace } }).remote
  return remote?.plans
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
  const source = useMemo(() => clientOfPlansSource(ctx), [ctx])

  useEffect(() => {
    let alive = true
    setList(null)
    setSelected(null)
    Promise.resolve(source?.listPlans(props.sessionId) ?? [])
      .then((plans) => { if (alive) setList(plans) })
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

/** DSH client services this plugin consumes; the standalone cordis `Context` doesn't carry them. */
type PlansServices = {
  slots: {
    inject(slot: string, register: () => Effect): Effect
    register(spec: unknown, component?: unknown): Effect
  }
  sidebarRightTabs: {
    register(definition: unknown): Effect
  }
  sidebarRight: {
    openTab(kind: string): unknown
  }
}

export function apply(ctx: Context): void {
  const c = ctx as Context & PlansServices
  const tabs = c.sidebarRightTabs
  const slots = c.slots
  const right = c.sidebarRight

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

  ctx.effect(() => slots.inject('sidebar.footer.action', () => slots.register(
    { name: 'sidebar.footer.action', id: TAB_ID, order: 20, label: () => 'Plans' },
    () => <button onClick={() => right.openTab(KIND)}>Plans</button>,
  )))
}
