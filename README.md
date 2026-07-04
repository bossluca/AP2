# AP Lernapp

Lern-Webapp zur Vorbereitung auf die **Abschlussprüfung Fachinformatiker für
Systemintegration** (IT-Berufe, AO 2020) – **AP1 (Teil 1 / GA1)** als Grundlage und
**AP2**. Echte Prüfungsfragen + themenbezogene Lernzettel, mehrere Lernmodi inkl.
Spaced Repetition, optionales Konto für geräteübergreifenden Fortschritt.

## Funktionen

- 📚 **„Heute lernen"** – kurze Smart-Session mit einem Klick, priorisiert Fälliges/
  Schwaches; **Confidence-Abfrage** („Weiß ich"/„Bin unsicher") deckt Fehl-Sicherheit auf
- 🧭 **Lernpfade + Modul-Training** – geführter Lernweg, je Modul ein abschließbarer
  Lern-Loop (Lernzettel → Lückentexte → Prüfungsfragen)
- 📇 **Karteikarten** über Prüfungsfragen (mit Filter & Zufallsmodus)
- 📝 **Lernzettel** – durchsuchbare Themen-Spickzettel (AP1 + AP2)
- 🔁 **Wiederholen** – Spaced Repetition mit **FSRS**-Gedächtnismodell (4-stufige
  Bewertung, Intervall-Vorschau) über Fragen **und** Lernzettel
- 🎯 **Quiz** mit Selbsteinschätzung · ✍️ **Lückentext** (automatisch aus den
  Lernzetteln) · ⚡ **Drill** (Multiple Choice mit automatischen Distraktoren)
- 🎓 **Klausur-Simulation** – ganze Prüfung mit Freitext-Antworten und
  **flexibler Schlagwort-Prüfung** (abweichende Formulierungen zählen), optional mit Timer
- 📊 **Statistik** – Lernstand, **Prüfungsreife-Prognose** (punktgewichtet), Schwachstellen,
  Verlauf; 🎯 **Prüfungstermin + Tagesplan** („heute X Wiederholungen + Y neue")
- 🔥 **Motivation** – Lern-Streak (mit Freezes), Tagesziel, Tages-Quests, XP/Level,
  Aktivitäts-Heatmap, Erfolge/Badges und Konfetti-Momente
- 🔍 **Volltextsuche** über alle Inhalte · ⌨️ **Command-Palette** (Cmd/Ctrl+K)
- 📱 **Installierbar & offline** (PWA) + mobile Bottom-Navigation; schlanker Start dank
  Code-Splitting (Start-Chunk ~32 kB)
- 👤 **Konto (optional)** – Fortschritt + Streak/XP geräteübergreifend, Passwort-Reset
  per **Recovery-Code**, DSGVO-Konto-Löschung; ohne Konto läuft alles lokal
- 💾 **Backup** – Fortschritt als JSON exportieren/importieren (nicht-destruktives Merge)

**Datenstand:** 243 lernbare Prüfungsfragen (6 paraphrasierte AP1-Prüfungen + 3
KI-generierte AP2-Übungsklausuren) + 278 Lernzettel-Einheiten (111 AP1 + 167 AP2).

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

Containerisiert (Backend non-root + Nginx mit Security-Headern; TLS/HTTPS über den
vorgelagerten Nginx Proxy Manager) – läuft auf Proxmox-LXC und auf einem VPS:

```bash
cp .env.example .env      # WEB_PORT setzen (Default 8080)
docker compose up -d --build
```

Schritt-für-Schritt: [`DEPLOYMENT.md`](DEPLOYMENT.md) und [`PROXMOX_SETUP.md`](PROXMOX_SETUP.md).

## Tests

```bash
cd lernapp && npm test     # Frontend (Vitest)
cd server  && npm test     # Backend (node:test)
```
