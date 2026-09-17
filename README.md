# dsh-plan-explorer

A **Plans** plugin for the DeepSeek Harness (DSH) that lists and previews **plan-mode plans** in the active session, built the official way — **TypeScript + tsdown**.

A **Plans** tab in the right sidebar that:

- Lists every plan-mode plan produced in the active session (each `exit_plan_mode` tool call in its log), newest first, with a title (first markdown heading) and sequence number.
- Lets you select a plan and preview it **rendered as markdown** in the same tab, with a back-to-list affordance. Rendering reuses DSH's own `MarkdownText` primitive from `@deepseek-ai/dsh-client-ui-primitives` (the same micromark-based renderer the GUI uses everywhere), so plans preview exactly like native DSH markdown.
- Tracks the currently active session and leaves no side effects on unload.

## Layout

```
dsh-plan-explorer/
├── README.md
├── package.json         # dsh.bundle + dsh.client manifest, tsdown script
├── tsdown.config.ts     # builds host (lib/index.js) + client (lib/client.js)
├── tsconfig.json
├── cordis.patch.yml     # bundle patch layer inserting the plugin row
└── src/
    ├── host/
    │   ├── index.ts   # Host half: sessions read -> plans.listPlans service
    │   └── plans.ts   # plan-extraction domain logic (unit-testable)
    ├── client/
    │   └── index.tsx  # Client half: sidebar tab/body + data source
    └── shared/
        └── types.ts    # plan data types shared by host + client
```

## Building

The package follows the official guide (<https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/>). It bundles with **tsdown** and requires a **deepseek-harness source checkout** (this repo is not the checkout, so `tsdown` and the in-repo peer packages must come from it):

```sh
cd deepseek-harness           # your source checkout
# vendor this package under packages/ (or reference it), then:
pnpm --filter dsh-plan-explorer bundle
# or, from the monorepo root, build clients so plugin bundles resolve in-repo peers
pnpm dev:web
```

Install into a profile (see the "Package and install" guide):

```sh
dsh plugin --profile demo add .
dsh --profile demo --dump-config   # shows the "# == dsh-plan-explorer" layer
```

## Verification status

- **Verified / correct:** Host half (session-log read via the `sessions` service keyed by a real `SessionId` from `@deepseek-ai/dsh-session`, plan extraction in `src/host/plans.ts`), and Client half against the real slot + `sidebarRightTabs` APIs; the markdown preview reuses DSH's `MarkdownText` primitive.
- **Open (needs the checkout):** the Host→Client **Remote/typert** namespace so `ctx.remote.plans` exists on the browser client (typert codegen).

## License

Private / internal. No license specified.
