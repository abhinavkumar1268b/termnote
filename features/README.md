# Feature modules

Each approved feature gets its own folder here. Keep feature-specific
components, server actions, schemas and tests colocated with the feature.

Planned folders (created as features are implemented):

- `auth/` — authentication and session helpers
- `notes/` — note CRUD, editor, autosave
- `folders/` — nested folder hierarchy
- `files/` — private storage uploads and downloads
- `commands/` — the safe command parser and registry (UI stays in `components/`)
- `search/` — indexing and search
- `sharing/` — individual note sharing and invitation tokens
- `history/` — note version snapshots
- `trash/` — soft deletion and recovery

Rules:

- Command parsing stays independent of React components.
- Business logic lives here, not in route handlers or components.
- All external input is validated with Zod.
- Authorization is always enforced on the server.
