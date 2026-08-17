# HoppGo — Fork-Regeln

> **Diese Datei hat Vorrang vor `AGENTS.md`.** `AGENTS.md` und alles unter `docs/`
> stammen aus dem Louez-Upstream und beschreiben, wie in Louez entwickelt wird.
> Diese Datei beschreibt, wie in **HoppGo** entwickelt wird — als Fork mit
> laufender Upstream-Anbindung.

HoppGo vermietet Hüpfburgen, Sound- und Lichttechnik sowie eine Fotobox im Raum
Coburg. Die Software ist ein Fork von [Louez](https://github.com/Synapsr/Louez)
(AGPL-3.0-only), der dauerhaft mit dem Upstream mitwächst.

---

## 1. Zwei Welten im selben Repository

| | Upstream-Kern | HoppGo |
|---|---|---|
| **Wo** | `apps/web/`, `packages/@louez/*`, `docs/`, `AGENTS.md` | `app/(hoppgo)/`, `components/hoppgo/`, `packages/hoppgo-*`, `.githooks/`, `docs/fork/` |
| **Wem gehört es** | Synapsr | uns |
| **Änderungen** | nur nach Rückfrage (siehe §3) | frei |
| **Beim Merge** | wird überschrieben/gemergt | wird nie berührt |

Der Upstream ist sehr aktiv — rund 370 Commits pro Quartal, davon der Großteil in
`apps/web`. Jede Zeile, die wir dort ändern, zahlen wir bei **jedem** Update
erneut. Deshalb die Schichtung unten.

---

## 2. Wohin gehört eine Änderung?

Immer die **oberste passende** Ebene wählen:

1. **Konfiguration** — `.env`, Store-Einstellungen in der Datenbank,
   Übersetzungen in `apps/web/messages/de.json`, CSS-Variablen in
   `apps/web/app/styles/`.
   → Kein Code, kein Konflikt. Erste Wahl für alles, was nach „Design" oder
   „Text" klingt.

2. **Neue Datei in unserem Bereich** — eigene Route-Group `app/(hoppgo)/`,
   eigene Komponenten in `components/hoppgo/`, eigene Packages
   `packages/hoppgo-*`.
   → Upstream kennt diese Pfade nicht und fasst sie nie an. Kein Konflikt.

3. **Beitrag an den Upstream** — die Änderung ist allgemein nützlich (Beispiel:
   Pflicht-Zubehör, White-Label-Branding). Als Pull Request an Synapsr.
   → Nach dem Merge dort ist es Kern-Code und kostet uns nie wieder etwas.

4. **Chirurgischer Eingriff im Kern** — nur wenn 1–3 nachweislich nicht
   funktionieren. Regeln: kleinstmöglicher Diff, ein Commit pro Zweck,
   Marker-Kommentar `// HOPPGO:` an jeder geänderten Stelle, Eintrag in
   [`docs/fork/PATCHES.md`](docs/fork/PATCHES.md).

---

## 3. Regel für Agenten: vor jedem Kern-Eingriff fragen

Wenn eine Aufgabe eine Datei im Upstream-Kern ändern würde, **nicht einfach
umsetzen.** Stattdessen stoppen und dem Nutzer vorlegen:

1. **Was** geändert werden müsste (Datei, Umfang)
2. **Warum** Ebene 1 und 2 aus §2 nicht ausreichen — konkret, nicht pauschal
3. **Merge-Kosten**: wie oft hat der Upstream diese Datei zuletzt angefasst?
   Prüfen mit: `git log --oneline --since="6 months ago" -- <datei> | wc -l`
4. **Upstream-Option**: taugt die Änderung als Pull Request an Synapsr?
5. **Empfehlung** mit Begründung

Erst nach Zustimmung umsetzen. Das gilt auch für scheinbar triviale Änderungen —
gerade die sammeln sich unbemerkt an.

**Ausnahme**, die keine Rückfrage braucht: Übersetzungen in `messages/de.json`.

---

## 4. Merge-Ablauf

```bash
git fetch upstream --tags
git log --oneline main..upstream/main | wc -l    # Umfang abschätzen
git checkout upstream-main && git merge --ff-only upstream/main
git checkout main && git merge upstream-main
```

- **Immer `merge`, niemals `rebase`.** Rebase schreibt unsere Commits neu und
  erzwingt dieselben Konfliktlösungen bei jedem Update erneut.
- `rerere` ist aktiviert — Git merkt sich gelöste Konflikte und wendet sie
  automatisch wieder an. Nicht deaktivieren.
- **Kadenz:** auf Release-Tags (`v2.2.0`, …), nicht auf einzelne Commits.
  Sicherheitsrelevante Fixes und `pnpm-workspace.yaml`-Overrides jederzeit.
- Nach jedem Merge: `pnpm install && pnpm check && pnpm build`, dann Eintrag in
  [`docs/fork/MERGE-LOG.md`](docs/fork/MERGE-LOG.md).
- **Niemals zu `upstream` pushen.** Die Push-URL ist bewusst auf einen
  ungültigen Wert gesetzt.

### Datenbank

`packages/db/src/schema.ts` ist eine einzelne Datei mit über 3600 Zeilen und die
Migrationen sind fortlaufend nummeriert. Eigene Tabellen dort einzutragen
erzeugt bei jedem Upstream-Schema-Update einen Konflikt und kollidierende
Migrationsnummern.

→ Eigene Tabellen gehören nach `packages/hoppgo-db` mit eigener Schema-Datei,
eigenem Migrationsordner und eigenem Journal, auf derselben Datenbank.
Tabellenpräfix `hg_`. Fremdschlüssel nur in eine Richtung: HoppGo → Louez.

---

## 5. Sicherheit — dieses Repository ist öffentlich

Die AGPL-3.0 verpflichtet uns, den Quellcode den Nutzern des Dienstes
anzubieten. Wir erfüllen das über ein öffentliches Repository. Daraus folgt:

**Was hier committet wird, ist dauerhaft öffentlich — auch nach dem Löschen,
weil die Git-Historie bleibt.**

Niemals committen:

- `.env` und alle echten Umgebungsdateien (`.env.example` ist erlaubt und erwünscht)
- Stripe-Keys, SMTP-Zugangsdaten, `AUTH_SECRET`, API-Tokens jeder Art
- Google-Service-Account-JSONs, private Schlüssel, Zertifikate
- Datenbankabzüge, Backups, echte Kundendaten in Seeds oder Fixtures
- Interne Kalkulationen, Einkaufspreise, Margen, Lieferantenkonditionen

Abgesichert durch:

- [`.githooks/pre-commit`](.githooks/pre-commit) — blockiert Dateinamen- und
  Inhaltsmuster. Aktiv über `git config core.hooksPath .githooks`.
- `.gitignore` — siehe HoppGo-Abschnitt am Dateiende
- Bei Verdacht auf einen bereits gepushten Wert: **sofort beim Anbieter
  rotieren.** Aus der Historie entfernen reicht nicht, es kann längst
  gespiegelt sein.

### Prüfen, ob der Schutz aktiv ist

```bash
git config core.hooksPath          # muss ".githooks" ausgeben
```

---

## 6. Lizenz

- Kern und alles, was im selben Prozess läuft — auch `packages/hoppgo-*` —
  steht unter **AGPL-3.0-only**. Das ist so gewollt.
- `LICENSE` und `NOTICE` bleiben unverändert. Eigene Urheberschaft wird in
  `NOTICE` ergänzt, nicht durch Ersetzen der bestehenden Einträge.
- Die Storefront verlinkt im Footer auf das öffentliche Repository — das ist
  die Erfüllung von AGPL §13.
- **Nucleo-Icons** stehen laut `NOTICE` ausdrücklich *nicht* unter AGPL und sind
  auf 100 Stück gedeckelt. Für den kommerziellen Betrieb brauchen wir eine
  eigene Nucleo-Lizenz. Keine Icons extrahieren oder weiterverbreiten.

---

## 7. Kurz für Agenten

- Vor Codeänderungen: klären, ob es Kern oder HoppGo ist. Im Zweifel `git log`
  auf die Datei ansehen.
- Kern → §3 befolgen, also fragen.
- HoppGo → freie Hand, aber Konventionen aus `docs/code-review/` einhalten,
  damit der Code zum Rest passt.
- Nie Secrets in Code, Beispiele, Tests oder Kommentare schreiben — auch keine
  „nur zum Testen" erfundenen, die echt aussehen.
- Beim Formatieren: `pnpm format` (oxfmt). Niemals einen anderen Formatter über
  `apps/web` laufen lassen.
