# AP Lernapp

Lern-Webapp zur Vorbereitung auf die **Abschlussprüfung Fachinformatiker für
Systemintegration** (IT-Berufe, AO 2020) – **AP1 (Teil 1 / GA1)** als Grundlage und
**AP2**. Echte Prüfungsfragen + themenbezogene Lernzettel, mehrere Lernmodi inkl.
Spaced Repetition, optionales Konto für geräteübergreifenden Fortschritt.

## Funktionen

- 📇 **Karteikarten** über echte Prüfungsfragen (mit Filter & Zufallsmodus)
- 📝 **Lernzettel** – durchsuchbare Themen-Spickzettel (AP1 + AP2)
- 🔁 **Wiederholen** – Spaced Repetition (Leitner, 5 Boxen) über Fragen **und** Lernzettel
- 🎯 **Quiz** mit Selbsteinschätzung und Auswertung
- 🎓 **Klausur-Simulation** – ganze Prüfung mit echten Fragen, Freitext-Antworten und
  **flexibler Schlagwort-Prüfung** (abweichende Formulierungen zählen), optional mit Timer
- 📊 **Statistik** – Lernstand, Box-Verteilung, Schwachstellen, Verlauf
- 🔥 **Motivation** – Lern-Streak, Tagesziel, Aktivitäts-Heatmap, Erfolge/Badges und
  ein Konfetti-Moment bei bestandener Klausur
- 🔍 **Volltextsuche** über alle Inhalte
- 📱 **Installierbar & offline** (PWA) + mobile Bottom-Navigation; schlanker Start dank
  Code-Splitting (Start-Chunk ~32 kB)
- 👤 **Konto (optional)** – Fortschritt geräteübergreifend; ohne Konto läuft alles lokal

**Datenstand:** 178 lernbare Prüfungsfragen (6 Termine) + 278 Lernzettel-Einheiten
(111 AP1 + 167 AP2).

## Aufbau des Repos

| Pfad | Inhalt |
|---|---|
| [`lernapp/`](lernapp/) | Frontend (React 19 + Vite 6 + Tailwind 4, HashRouter) |
| [`server/`](server/) | Backend (Fastify + `node:sqlite`): Auth + Fortschritts-Sync |
| `Pruefungen_Rohdaten/`, `Pruefungen_Aufbereitet/` | Quell-/aufbereitetes Lernmaterial |
| [`DEPLOYMENT.md`](DEPLOYMENT.md), [`PROXMOX_SETUP.md`](PROXMOX_SETUP.md) | Hosting (Docker, Proxmox/VPS) |
| [`ROADMAP.md`](ROADMAP.md), [`DECISIONS.md`](DECISIONS.md), [`IMPROVEMENTS.md`](IMPROVEMENTS.md) | Plan, Architektur-Entscheidungen, Backlog |

## Schnellstart (lokal)

```bash
# Frontend (läuft auch allein, rein lokal)
cd lernapp && npm install && npm run dev      # http://localhost:5173

# Optional: Backend für Konto/Sync (zweites Terminal)
cd server && npm install && npm run dev        # http://localhost:3001
```

Details: [`lernapp/README.md`](lernapp/README.md) · [`server/README.md`](server/README.md).

## Deployment

Containerisiert (Backend + Caddy mit automatischem HTTPS) – läuft auf Proxmox-LXC
und auf einem VPS:

```bash
cp .env.example .env      # SITE_ADDRESS setzen
docker compose up -d --build
```

Schritt-für-Schritt: [`DEPLOYMENT.md`](DEPLOYMENT.md) und [`PROXMOX_SETUP.md`](PROXMOX_SETUP.md).

## Tests

```bash
cd lernapp && npm test     # Frontend (Vitest)
cd server  && npm test     # Backend (node:test)
```
