# Dragon Ball Sparking Zero League — Website

The central website for DBSZL. Built with React + Vite + Tailwind CSS, powered by YAML content files that anyone can edit.

## Quick Start

```bash
cd apps/website
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Home | `/` | Hero, top standings, team grid, how-it-works |
| Teams | `/teams` | Expandable team list with full rosters |
| Season | `/season` | Standings table, weekly schedule, playoffs |
| Archives | `/archives` | Past seasons, legacy site links, history |
| Community | `/community` | Volunteer roles, tools & resources |

## Content Management (CMS)

### Option 1: Edit YAML Files Directly
All content lives in `public/content/*.yaml`. Non-technical users can edit these files in GitHub's web editor — no code knowledge needed:

| File | What it controls |
|------|-----------------|
| `site.yaml` | Site name, tagline, social links, navigation |
| `teams.yaml` | Team names, colors, descriptions, rosters |
| `season.yaml` | Standings, weekly schedule, playoff bracket |
| `archives.yaml` | Past season history and links |
| `community.yaml` | Volunteer roles, resources & tools |

### Option 2: Decap CMS (Visual Editor)
Navigate to `/admin/` on the deployed site for a visual content editor powered by [Decap CMS](https://decapcms.org/) (free, open-source). It provides a form-based UI for editing all the YAML files above — no Git knowledge required.

**Setup:** Decap CMS uses GitHub OAuth. For the admin panel to work on a deployed site, you need to configure GitHub OAuth (see [Decap CMS docs](https://decapcms.org/docs/github-backend/)).

**For local development with Decap CMS**, you can use the [Decap CMS proxy server](https://decapcms.org/docs/beta-features/#working-with-a-local-git-repository):
```bash
npx decap-server
```

## How to Update Content

### Updating Team Rosters
Edit `public/content/teams.yaml`. Each team has:
```yaml
- name: "Budokai"
  slug: "budokai"
  color: "#F97316"
  description: "The martial arts veterans..."
  manager: "TBD"
  roster:
    - "Goku (Z - End)"
    - "Vegeta (Super)"
```

### Recording Match Results
Edit `public/content/season.yaml`:
1. Update the `standings` section with new W/L/T numbers
2. Add/update matches in the appropriate `schedule` week
3. When playoffs start, fill in the `playoffs.bracket` section

### Adding a New Season to Archives
Edit `public/content/archives.yaml` and add a new entry.

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool
- **Tailwind CSS 3** — Styling
- **js-yaml** — Runtime YAML parsing
- **React Router** — Client-side routing
- **Decap CMS** — Optional visual content editor
- **Lucide React** — Icons

## Theming

Dark/light mode toggle is built in. The site defaults to dark mode with an orange/yellow/red Dragon Ball color palette.
