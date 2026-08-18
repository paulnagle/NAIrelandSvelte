# NA Ireland

Find Narcotics Anonymous meetings in Ireland — in person, hybrid, and online.

Built with SvelteKit 2 / Svelte 5 (runes) / Tailwind CSS 4 / Capacitor 8. A rewrite of [NA-Ireland-Ionic-6](https://github.com/paulnagle/NA-Ireland-Ionic-6) following the same patterns as [BMLTSearchSvelte](https://github.com/bmlt-enabled/BMLTSearchSvelte).

## Features

- Browse meetings by county
- Map search — find meetings near any location
- Just For Today — today's NA daily reading
- Cleantime Calculator — with keytag milestones
- NA Speakers — convention recordings
- Events — NA Ireland news and events
- Contact — NA Ireland service body contacts
- Two languages: English and Gaeilge

## Getting started

```bash
npm install
cp .env.example .env   # add your Google Maps keys
npm run dev            # http://localhost:5173
```

## Commands

```bash
npm run dev       # dev server
npm run build     # production build
npm run check     # type check (svelte-check)
npm run lint      # Prettier + ESLint
npm run test      # Vitest
npm run all       # format + lint + check + test + build
npm run ios       # build, sync, open Xcode
npm run android   # build, sync, open Android Studio
```

## Contributing

See [AGENTS.md](AGENTS.md) for architecture notes and rules that apply to every contributor, and [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) for setup, commands, and project structure.
