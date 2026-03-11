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
cp config.example.toml config.toml
```

Then edit `config.toml` with your real token(s). The full commented template lives in `config.example.toml`.

Notes:

- `LANG` defaults to `ko` if omitted.
- Each bot lives under `[bot.<name>]`.
- Required bot fields are `client`, `token`, and `workspace`.
- Optional bot fields are `agent` and `ultrawork`.
- Relative `workspace` paths resolve from the `config.toml` directory.
- Keep real bot tokens in local-only config values and never commit secrets.
- `config.toml` is gitignored; commit `config.example.toml` for shared defaults.

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
