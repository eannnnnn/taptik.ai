# taptik.ai

Local NestJS runtime for connecting one or more Discord bot clients from `config.toml`.

## Requirements

- Bun 1.2+
- Node.js 20+
- pnpm 9+

## Install

```bash
pnpm install
```

## Configure

Copy the template and edit your local runtime config:

```bash
cp config-sample.toml config.toml
```

Then edit `config.toml` with your real token(s). The full commented template lives in `config-sample.toml`.

Notes:

- `enabled` defaults to `true` if omitted.
- `thinking_level` defaults to `medium` and is passed to `opencode run --variant` for DM/mention execution.
- `scheduler.jobs[].agent_name` must match one of `[[bots]].name`.
- `scheduler.jobs[].exec` is a natural-language prompt passed to `opencode run --agent <agent_name> -- "<prompt>"`.
- Scheduler jobs execute in the matched bot `workspace` directory.
- Keep real bot tokens in local-only config values and never commit secrets.
- `config.toml` is gitignored; commit `config-sample.toml` for shared defaults.

## Run

```bash
pnpm start:dev
```

## Validation

```bash
pnpm lint
bun test
pnpm build
```
