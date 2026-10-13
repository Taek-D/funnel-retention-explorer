# Changelog

All notable changes to Funnel & Retention Explorer are documented in this file.

## [Unreleased]

### Changed
- Migrate deployment from Netlify to Vercel (`netlify.toml` removed)
- Modified `Icons.tsx`, added `Toast.tsx` (uncommitted)

---

## 2026-02-06

### Added — React Frontend & SaaS Upgrade
- **React frontend** scaffolding with Vite 6 + React 19 + TypeScript (`e428c57`, `e57227e`)
- Wire real analytics engines (funnel, retention, segment, insights) ported from vanilla JS (`1bbb6dd`)
- **SaaS upgrade**: Landing page, Supabase Auth (email/password), Supabase DB (projects, datasets, snapshots with RLS), Gemini AI insights panel (`ffb05e2`)
- SPA `_redirects` for client-side routing (`ad2b7b4`)
- Vitest integration tests for data analysis pipeline (`0660d7f`)
- Mobile responsive UI: sidebar drawer, scroll-aware header, hero animations (`c8b53b7`)
- UI refinement across all components and page layouts (`bd492b3`)

### Fixed
- Netlify config updated to build React frontend (`07a137a`)
- Handle missing Supabase env vars to prevent blank page (`55df7c8`, `9461454`)
- Remove dead importmap and CSS references from `index.html` (`ad2b7b4`)

### Docs
- README rewritten for SaaS architecture (`8e92b36`, `9c57c3e`)

---

## 2026-01-30

### Added
- **Subscription analytics**: KPI summary, paid retention, lifecycle funnel with new UI controls and sample data (`50f0fba`)
- **n8n webhook integration**: email report delivery with configuration UI (`2623e31`)
- n8n workflow refactor: consolidated data processing, HTML email generation, attachment handling (`65ebea2`)
- Sample subscription and e-commerce event data, PNG export documentation (`ea43d93`)
- Netlify deployment configuration and auto-deploy guides (`8f0d9c4`, `b2bdbf7`)

### Changed
- Enhanced responsiveness for KPI grids, detail cards, summary metrics (`27cedbb`)

---

## 2026-01-29

### Added
- **Initial release**: Funnel & Retention Explorer with CSV upload, column mapping, funnel analysis, retention analysis, segment comparison, and insights (`1260bd4`)
- Vanilla JS (ES6+) SPA with Chart.js, PapaParse, jsPDF, dark theme
- Korean language UI
