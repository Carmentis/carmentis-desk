<p align="center">
  <img src="public/carmentis.svg" alt="Carmentis logo" width="120" />
</p>

<h1 align="center">Carmentis Desk</h1>

<p align="center">The native desktop companion for the Carmentis network.</p>

---

## Overview

Carmentis Desk is a cross-platform native application (built with [Tauri](https://tauri.app/),
Vue 3 and PrimeVue) that lets you create and manage everything you need to operate on the
Carmentis network from a single place:

- **Wallets** — create and secure wallets, inspect on-chain balances and review the breakdown
  between spendable, staked and vested tokens.
- **Organizations** — declare and manage the organizations you operate.
- **Applications** — create and administer applications tied to your organizations, including
  their administrators and API keys.
- **Nodes** — claim nodes and stake tokens to them directly from the application.

Keys are stored locally and securely (Tauri Stronghold), and the app stays in sync with the
chain through the Carmentis indexer, so you always work against an up-to-date view of your
accounts.

## Getting started

Once installed, create a new wallet, purchase tokens online using your public key and start by
creating a new organization that you will declare online. You can then create applications and
nodes associated to your organization. A node can be claimed and you can stake tokens to it
directly from the application.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS) and [pnpm](https://pnpm.io/)
- The [Rust toolchain](https://www.rust-lang.org/tools/install) and the
  [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your platform.

### Install dependencies

```shell
pnpm install
```

### Launch in dev mode

To launch the application in dev mode (with hot-reload), run:

```shell
pnpm run tauri dev
```

This starts the Vite dev server and the native Tauri shell together. The first run compiles the
Rust backend and can take a few minutes; subsequent runs are much faster.

> Tip: you can run the web frontend on its own with `pnpm run dev`, but features relying on the
> native layer (secure storage, deep links, SQL, updater…) require `pnpm run tauri dev`.

### Building for production

To build the application for production, run:

```shell
pnpm run tauri build
```

### Formatting

```shell
pnpm run format
```
