# Kern-Eingriffe

Register aller Änderungen an Upstream-Dateien. **Jeder** Eingriff in Louez-Code
gehört hier hinein — sonst weiß beim nächsten Merge niemand mehr, warum eine
Zeile anders aussieht als im Upstream.

Regeln siehe [`HOPPGO.md`](../../HOPPGO.md) §3.

Alle Eingriffe auf einen Blick anzeigen:

```bash
git diff upstream/main...HEAD --stat -- apps/web packages docs AGENTS.md CLAUDE.md
```

---

## Format

Pro Eintrag: Datei, Umfang, Begründung, Alternativen die geprüft wurden, und ob
es als Upstream-Beitrag taugt.

---

## P-001 — `CLAUDE.md`: Verweis auf HOPPGO.md

| | |
|---|---|
| **Datei** | `CLAUDE.md` |
| **Umfang** | 1 Zeile hinzugefügt |
| **Datum** | 2026-08-13 |
| **Upstream-Churn** | sehr gering, Datei ist seit Monaten stabil |

**Warum nötig:** Bootstrap. Ohne diesen Verweis lädt kein Agent die
HoppGo-Regeln, und damit greift auch die Schutzregel für Kern-Eingriffe nicht.
Es gibt keine Ebene-1- oder Ebene-2-Alternative, weil die Datei selbst der
Einstiegspunkt ist.

**Alternativen geprüft:**
- `.claude/settings.local.json` — verworfen, ist gitignored und ginge bei
  einem frischen Clone verloren.
- Nur `AGENTS.md` ändern — schlechter, weil `AGENTS.md` deutlich häufiger vom
  Upstream angefasst wird.

**Als Upstream-Beitrag geeignet:** nein, rein HoppGo-spezifisch.

**Konfliktlösung beim Merge:** Bei Konflikt beide Seiten behalten, `HOPPGO.md`
bleibt in Zeile 1.

---

## P-002 — `.gitignore`: HoppGo-Sicherheitsabschnitt

| | |
|---|---|
| **Datei** | `.gitignore` |
| **Umfang** | Abschnitt am Dateiende angehängt |
| **Datum** | 2026-08-13 |
| **Upstream-Churn** | 12 Änderungen in 6 Monaten, alle im oberen Teil |

**Warum nötig:** Das Repository ist öffentlich. Der Upstream-Teil deckt `.env`
und `*.pem` ab, aber keine Service-Account-JSONs, Datenbankabzüge, Backups oder
interne Kalkulationen. Für einen Schutz, der einen frischen Clone überlebt, muss
die Regel getrackt sein — `.git/info/exclude` scheidet damit aus.

**Bewusst ans Dateiende**, weil Git angehängte Blöcke am Ende einer Datei fast
immer konfliktfrei mergen kann.

**Fallstrick, der beim Schreiben auffiel:** `*.sql` hätte auch die
Drizzle-Migrationen unter `packages/db/src/migrations/` erfasst — neue
Migrationen wären still ignoriert worden. Deshalb steht direkt darunter eine
Ausnahme für beide Migrationsverzeichnisse. Bei künftigen Ergänzungen daran
denken: `git check-ignore -v <pfad>` prüft, ob eine Regel zu viel greift.

**Als Upstream-Beitrag geeignet:** teilweise. Service-Account-JSONs und
Datenbankabzüge auszuschließen ist allgemein sinnvoll und wäre ein kleiner,
gut annehmbarer PR.

---

## Geplant / in Diskussion

Änderungen, die absehbar nötig werden, aber noch nicht umgesetzt sind. Erst
nach Rückfrage beim Nutzer umsetzen.

### Pflicht-Zubehör mit eigener Bestandsführung

`product_accessories` kennt heute weder ein `required`-Flag noch eine Menge.
Für die Fotobox brauchen wir ein Zubehör, das zwingend mitgebucht wird und
dessen Lagerbestand dauerhaft sinkt (Verbrauchsartikel, kommt nicht zurück).

**Einschätzung:** Guter Upstream-Kandidat. Pflicht-Zubehör ist für eine
Vermietungsplattform allgemein nützlich (Gasflasche zum Heizstrahler,
Verbrauchsmaterial zum Gerät). Zuerst als PR an Synapsr anbieten.

### Lieferoption je Produkt

`DeliverySettings` gilt heute für den ganzen Store. Wir brauchen es pro
Produkt: Fotobox und Lichttechnik dürfen geliefert und aufgebaut werden,
Hüpfburgen aus Haftungsgründen nicht.

**Einschätzung:** Ebenfalls allgemein nützlich und damit ein Upstream-Kandidat.
Vorher prüfen, ob sich das über Kategorien und Store-Einstellungen abbilden
lässt, ohne den Kern anzufassen.
