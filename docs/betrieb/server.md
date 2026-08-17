# Server

Betriebsstand der Produktivumgebung. Wenn sich hier etwas ändert, gehört es in
diese Datei — nicht in einen Chatverlauf.

## Überblick

| | |
|---|---|
| **Anbieter** | Hetzner Cloud, Projekt „Hopp & Go" |
| **Server** | `hoppgo-prod`, Typ CX33 — 4 vCPU, 8 GB RAM, 80 GB |
| **Standort** | Nürnberg (`nbg1`), Deutschland |
| **Betriebssystem** | Ubuntu 24.04 LTS |
| **Kosten** | 8,49 € brutto im Monat |
| **IPv4** | `91.99.207.61` |
| **IPv6** | `2a01:4f8:1c16:ada2::1` |

## Zugang

```bash
ssh hoppgo@91.99.207.61
```

Anmeldung ausschließlich per SSH-Schlüssel. Root-Login und Passwort-Anmeldung
sind abgeschaltet, `fail2ban` sperrt nach drei Fehlversuchen für eine Stunde.

Ein zusätzlicher Schlüssel wird über die Hetzner-Konsole oder direkt in
`~/.ssh/authorized_keys` des Benutzers `hoppgo` eingetragen.

## Absicherung

Zwei Ebenen, bewusst doppelt:

- **Hetzner-Firewall** `hoppgo-web` — eingehend nur 22, 80, 443 und ICMP
- **ufw** auf dem Server — dieselben Regeln, greift auch wenn die
  Cloud-Firewall versehentlich gelöst wird

Sicherheitsupdates werden über `unattended-upgrades` automatisch eingespielt.

Port 3000 ist **nicht** von außen erreichbar: `LOUEZ_PORT` in der `.env` bindet
die Anwendung auf `127.0.0.1`. Von außen erreicht man ausschließlich Caddy.

Eine 2-GB-Auslagerungsdatei liegt bereit, damit MySQL bei Lastspitzen nicht vom
OOM-Killer beendet wird. `vm.swappiness` steht auf 10 — der Server nutzt sie
also erst, wenn es wirklich eng wird.

## Anwendung

Alles unter `/opt/hoppgo`, ein Klon dieses Repositorys.

```bash
cd /opt/hoppgo

# Zustand
docker compose ps
docker compose logs louez --tail 50 -f

# Neu starten
docker compose restart louez

# Aktualisieren, nachdem im Repository etwas gemerged wurde
git pull
docker compose pull
docker compose up -d
```

Mit TLS-Vorschaltung (sobald die Domain zeigt):

```bash
docker compose -f docker-compose.yml -f deploy/docker-compose.hoppgo.yml up -d
```

### Dienste

| Dienst | Aufgabe |
|---|---|
| `louez` | Next.js-Anwendung, Storefront und Dashboard |
| `db` | MySQL 8.4 |
| `minio` | Objektspeicher für Bilder und Dokumente |
| `background-removal` | Freistellen von Produktbildern, rund 450 MB RAM |
| `caddy` | Reverse Proxy, TLS von Let's Encrypt |

## Zugangsdaten

Die `.env` liegt unter `/opt/hoppgo/.env` mit Rechten `600`. Datenbank-,
MinIO- und Anmeldegeheimnisse wurden **auf dem Server** erzeugt und existieren
nirgendwo sonst.

Sie gehören niemals ins Repository. Neue Werte werden direkt dort ergänzt:

```bash
ssh hoppgo@91.99.207.61
sudo -u hoppgo nano /opt/hoppgo/.env
cd /opt/hoppgo && docker compose up -d
```

## DNS

Die Domain `hoppgo.de` liegt bei GoDaddy (`ns17`/`ns18.domaincontrol.com`).

Nötige Einträge:

| Typ | Name | Wert |
|---|---|---|
| A | `@` | `91.99.207.61` |
| AAAA | `@` | `2a01:4f8:1c16:ada2::1` |
| A | `www` | `91.99.207.61` |
| AAAA | `www` | `2a01:4f8:1c16:ada2::1` |

Für den E-Mail-Versand über Brevo kommen später SPF-, DKIM- und
DMARC-Einträge auf einer eigenen Subdomain dazu, damit die Zustellbarkeit von
`hoppgo.de` selbst unberührt bleibt.

## Datensicherung

**Noch offen.** Vor dem Livegang einzurichten:

- Hetzner-Backups für den ganzen Server, 20 % Aufschlag auf den Serverpreis
- Zusätzlich täglicher `mysqldump` an einen zweiten Ort — ein Server-Backup
  hilft nicht gegen versehentlich gelöschte Datensätze

Ohne beides sollte keine echte Buchung entgegengenommen werden.
