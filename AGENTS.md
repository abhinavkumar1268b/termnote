# AGENTS.md — TERMNOTE

## Project Identity

TermNote is a private-first, command-driven notes and
file management web application.

It uses a minimal Cyber Blue terminal-inspired UI.

## Product Philosophy

- Simple, fast and minimal.
- Command-first, not command-only.
- Private by default.
- Markdown-friendly.
- Reliable persistent storage.
- No unnecessary features.

## Approved Features

1. Notes and folders.
2. File management.
3. Terminal command interface.
4. Command autocomplete.
5. Command history.
6. Hybrid rich text and Markdown editor.
7. ChatGPT formatting preservation.
8. Starred items.
9. Trash and recovery.
10. Individual note sharing.
11. Note version history.
12. Search and autosave.

## Explicitly Excluded

Do not implement:
- Knowledge graph.
- Portable ZIP workspace.
- Focus mode.
- AI writing assistant.
- Public social feed.
- Gamification.
- Public workspace discovery.
- Any unapproved product feature.

## Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Tiptap
- Zod
- Lucide
- Vercel

Use compatible stable versions.

## Architecture Rules

- Keep command parsing separate from UI.
- Use modular feature folders.
- Use reusable components.
- Use strict TypeScript.
- Validate inputs with Zod.
- Use Supabase RLS.
- Never expose service-role credentials.
- Use server-side authorization.
- Use private storage buckets.
- Handle loading, empty and error states.
- Use database migrations.
- Avoid duplicated business logic.
- Keep components maintainable.

## UI Rules

- Background: #05070B
- Sidebar: #090E17
- Surface: #0D1420
- Elevated surface: #111C2B
- Neon blue: #168BFF
- Bright blue: #43A5FF
- Primary text: #F5F8FF
- Secondary text: #8995A8
- Border: #1B2A3D
- Success: #42D6A4
- Error: #FF647C

Use JetBrains Mono for terminal elements.
Use Inter for application content.

No excessive gradients, shadows, glow,
glassmorphism or unnecessary animation.

## Command Rules

Commands must use a safe application parser.
Never execute operating-system shell commands.

All commands must:
- Be validated.
- Have defined arguments.
- Check permissions.
- Return structured results.
- Handle errors.
- Have tests.

Destructive commands require confirmation.

## Data Rules

- Notes belong to workspaces.
- Workspaces belong to authenticated users.
- Folders support nested hierarchy.
- Note content uses Tiptap JSON as canonical data.
- Markdown is generated for indexing and export.
- Files use private Supabase Storage.
- Deleted resources use soft deletion.
- History snapshots are preserved.
- Sharing is limited to individual notes.

## Security

- Enforce RLS for user data.
- Verify ownership on the server.
- Verify collaborator permissions.
- Validate uploaded files.
- Sanitize rendered content.
- Protect invitation tokens.
- Never trust client-side permission checks.
- Never expose private storage paths publicly.

## Development Workflow

Before implementing a phase:
1. Inspect the current project.
2. Read this file.
3. Review existing code.
4. Create a short implementation plan.
5. Implement only the requested phase.
6. Run type checks.
7. Run lint.
8. Run relevant tests.
9. Fix errors.
10. Summarize completed work and remaining issues.

Never rewrite working modules unnecessarily.
Never replace real functionality with fake buttons.
Never claim a feature is complete without testing it.

Do not silently add unapproved features.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
