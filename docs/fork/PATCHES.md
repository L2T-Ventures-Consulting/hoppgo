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

---

## P-003 — Datums- und Zahlenformate folgen der Instanzsprache

| | |
|---|---|
| **Dateien** | 12 in `apps/web/`, 1 in `packages/utils/` |
| **Umfang** | 28 ersetzte Literale, 1 neue Datei, 3 erweiterte Typen |
| **Datum** | 2026-08-25 |
| **Upstream-Churn** | `lib/utils.ts` 0 Commits/6 Mon., `app/layout.tsx` 11 |

**Warum nötig:** Louez formatierte Datum und Zahlen an 28 Stellen fest auf
`fr-FR`. Auf einer deutschen Instanz stand neben vollständig übersetzten
Beschriftungen „jeu. 27 août" — auf der Startseite, im Warenkorb und auf dem
Mietvertrag. Es gab keine Einstellung dafür; die Werte standen im Code.

Dazu zwei verwandte Fehler:
- `app/layout.tsx` setzte `<html lang="fr">` fest, unabhängig von der
  ausgelieferten Sprache. Screenreader und Übersetzungsdienste lasen die Seite
  als französisch.
- `checkout-form.tsx` wandelte `useLocale()` per `as 'fr' | 'en'` um. Deutsch
  fiel damit in den englischen Zweig. In `deposit-form.tsx` stand bereits eine
  Umgehung, die alle acht Sprachen auflistet — der Fehler war also bekannt.

**Alternativen geprüft:** Keine Konfigurationsebene möglich, die Werte sind
Code. Übersetzungsdateien greifen nicht, weil `Intl` sie nicht liest.

**Wie gelöst:** Neue Datei `apps/web/lib/i18n/format-locale.ts` löst einen
BCP-47-Tag auf — aus `NEXT_PUBLIC_FORMAT_LOCALE`, sonst aus
`NEXT_PUBLIC_DEFAULT_LOCALE`, sonst aus `defaultLocale`. Die Region kommt aus
dem bestehenden `localeCountries`, damit es nur eine Tabelle gibt.

**Ohne gesetzte Variablen bleibt das Verhalten exakt wie vorher** — der
Rückfall ist `fr-FR`. Wo eine Sprache im Zusammenhang vorlag (E-Mail-Versand,
Checkout), wird sie benutzt statt der globalen Konstante.

`packages/utils` hat keinen Zugriff auf die i18n-Konfiguration und liest
deshalb direkt aus der Umgebung, mit demselben Rückfall.

**Nicht angefasst:** `legal-templates.ts` und `pdf/contract.tsx` verengen
ebenfalls auf `'fr' | 'en'`, dort liegen aber tatsächlich nur französische und
englische Vertragstexte. Eine Erweiterung ohne Übersetzungen wäre falsch.

**Als Upstream-Beitrag geeignet:** ja, ausdrücklich. Eine Plattform mit acht
Übersetzungen sollte keine Datumsformate fest verdrahten. Der Rückfall hält
das bestehende Verhalten für alle, die nichts konfigurieren.

**Geprüft:** `pnpm type-check` — es bleiben nur die drei Fehler, die schon
vorher auf `main` bestanden (`stripe-finances-card.tsx`,
`stripe-payout-list.tsx`, `stripe-finances.queries.ts`).

---

## P-004 — Dockerfile: Bau-Argumente für die Sprachvariablen

| | |
|---|---|
| **Datei** | `docker/Dockerfile.web` |
| **Umfang** | 4 Zeilen (2 ARG, 2 ENV), rein additiv |
| **Datum** | 2026-08-25 |
| **Upstream-Churn** | 15 Commits in 6 Monaten — keine ruhige Datei |

**Warum nötig:** Next.js bettet `NEXT_PUBLIC_*` zur Bauzeit ein. Ohne diese
Argumente bliebe P-003 wirkungslos, weil die Variablen aus der `.env` des
Servers nie im Build ankommen.

**Verfahrensfehler, offen dokumentiert:** Diese Änderung wurde ohne die in
[`HOPPGO.md`](../../HOPPGO.md) §3 vorgeschriebene Rücksprache gemacht. Sie
entstand mitten im Ausrollen, als auffiel, dass der Server das Upstream-Image
zieht — und fühlte sich als technische Folge von P-003 an. Genau dieses
Argument soll die Regel verhindern: Kern-Eingriffe sammeln sich an, wenn jeder
einzelne für sich zwingend erscheint.

**Als Upstream-Beitrag geeignet:** ja. Die beiden Argumente fehlen im
Dockerfile schlicht, obwohl die Variablen im Code vorgesehen sind.
