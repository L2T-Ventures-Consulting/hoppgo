# Merge-Protokoll

Ein Eintrag pro Upstream-Merge. Zweck: nachvollziehen, auf welchem Louez-Stand
wir sind, was zuletzt gebrochen ist und wo wiederkehrende Konflikte sitzen.

Ablauf siehe [`HOPPGO.md`](../../HOPPGO.md) §4.

---

## Ausgangsstand

| | |
|---|---|
| **Datum** | 2026-08-13 |
| **Upstream-Commit** | `fddfdace` — *fix(license): keep LICENSE as the verbatim AGPL-3.0 text* |
| **Letzter Tag** | `v2.1.0` |
| **Eigene Änderungen** | keine (Fork-Zeitpunkt) |

Fork-Infrastruktur eingerichtet:

- `upstream` → `github.com/Synapsr/Louez`, Push-URL bewusst ungültig gesetzt
- Branch `upstream-main` als reiner Spiegel
- `rerere.enabled` und `rerere.autoupdate` aktiv
- `core.hooksPath = .githooks`, Secret-Schutz vor jedem Commit

---

## Vorlage für neue Einträge

```markdown
## YYYY-MM-DD — Merge auf vX.Y.Z

| | |
|---|---|
| **Von** | `<alter commit>` |
| **Auf** | `<neuer commit>` (Tag vX.Y.Z) |
| **Commits** | N |
| **Konflikte** | Liste der Dateien, oder „keine" |

**Was gebrochen ist:**

**Wie gelöst:**

**Nachher geprüft:** `pnpm install && pnpm check && pnpm build` — Ergebnis
```
