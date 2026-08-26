# Stripe und Brevo einrichten

Offene Schritte für Zahlungen und E-Mail-Versand. Abhaken, wenn erledigt.

---

## Stripe

### Was ungewöhnlich ist

Louez nutzt **Stripe Connect**, auch bei einem einzelnen Shop. Es gibt damit
zwei Ebenen, die beide dasselbe Stripe-Konto sein dürfen:

1. **Plattform-Ebene** — liefert die Schlüssel für die `.env` auf dem Server
2. **Verbundenes Konto** — wird im Dashboard per Klick angebunden, dorthin
   fließt das Geld

Wirkt umständlich, ist aber Louez' Architektur. Der Nutzen: Auszahlungen und
Kautionen sind sauber getrennt, und der Stripe-Saldo erscheint im Dashboard.

### Schritt 1 — Schlüssel holen

Stripe-Dashboard → **Entwickler → API-Schlüssel**

| Variable | Feld in Stripe | Format |
|---|---|---|
| `STRIPE_SECRET_KEY` | Geheimer Schlüssel | `sk_test_…` bzw. `sk_live_…` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Veröffentlichbarer Schlüssel | `pk_test_…` bzw. `pk_live_…` |

**Mit dem Testmodus anfangen.** Dann lässt sich eine vollständige Buchung mit
Testkarte durchspielen — einschließlich Kautions-Reservierung —, bevor echtes
Geld fließt. Testkarte: `4242 4242 4242 4242`, beliebiges künftiges Ablaufdatum,
beliebige Prüfziffer.

### Schritt 2 — Werte auf dem Server eintragen

```bash
ssh hoppgo@91.99.207.61
nano /opt/hoppgo/.env
```

Am Dateiende ergänzen:

```
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

> `NEXT_PUBLIC_*` wird zur **Bauzeit** eingebettet. Nach dem Eintragen muss das
> Image neu gebaut werden, ein Neustart genügt nicht:
>
> ```bash
> cd /opt/hoppgo && docker compose \
>   -f docker-compose.yml \
>   -f deploy/docker-compose.hoppgo.yml \
>   -f deploy/docker-compose.bauen.yml up -d --build
> ```

### Schritt 3 — Webhooks anlegen

Werden per API erzeugt, sobald der geheime Schlüssel gesetzt ist. Zwei
Endpunkte:

| Zweck | URL |
|---|---|
| Zahlungen | `https://hoppgo.de/api/webhooks/stripe` |
| Connect-Konto | `https://hoppgo.de/api/webhooks/stripe/connect` |

Die dabei erzeugten Geheimnisse kommen in die `.env`:

```
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_WEBHOOK_SECRET="whsec_..."
```

### Schritt 4 — Konto im Dashboard verbinden

Dashboard → **Einstellungen → Zahlungen → Stripe verbinden**

Führt durch Stripes Onboarding: Firmendaten, Bankverbindung, Ausweisprüfung.
Danach steht im Dashboard „Zahlungen aktiviert".

**Ohne diesen Schritt nimmt der Shop keine Zahlungen an** — auch wenn die
Schlüssel gesetzt sind. Louez prüft `stripeAccountId` und
`stripeChargesEnabled`, beide entstehen erst hier.

### Schritt 5 — Kaution prüfen

Die Kaution soll auf der Karte **reserviert**, nicht abgebucht werden.
Einstellung nach dem Verbinden gegenprüfen und mit einer Testbuchung
verifizieren: In Stripe muss die Zahlung als *authorized* erscheinen, nicht als
*captured*.

---

## Brevo

### Schritt 1 — SMTP-Zugang holen

Brevo → **Einstellungen → SMTP & API → SMTP**

| Variable | Wert | Häufige Verwechslung |
|---|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | Port 587 nutzt STARTTLS, nicht TLS von Beginn an |
| `SMTP_USER` | `9xxxxx@smtp-brevo.com` | **nicht** die Anmeldeadresse |
| `SMTP_PASSWORD` | der SMTP-Schlüssel | **nicht** das Kontopasswort |
| `SMTP_FROM` | `Hopp & Go <buchung@hoppgo.de>` | |

Beide Verwechslungen sind der übliche Grund, warum der Versand nicht
funktioniert.

### Schritt 2 — Absender verifizieren

Brevo → **Senders, Domains & Dedicated IPs**

`buchung@hoppgo.de` eintragen. Brevo schickt eine Bestätigungsmail dorthin —
die muss abrufbar sein.

### Schritt 3 — DNS-Einträge setzen

Nach der Verifizierung nennt Brevo DKIM- und SPF-Einträge. Die kommen zu
GoDaddy. **Ohne sie landen Buchungsbestätigungen im Spam.**

Empfehlung: eine eigene Subdomain für den Versand (`mail.hoppgo.de`), damit die
Zustellbarkeit von `hoppgo.de` selbst unberührt bleibt, falls der Versand je
Probleme macht.

### Schritt 4 — Testmail schicken

Dashboard → **Einstellungen → Benachrichtigungen** → Testversand.
Danach eine echte Buchung anlegen und prüfen, ob die Bestätigung ankommt und
**nicht** im Spam landet.

---

## Absendername

Alle Kundenmails nutzen `store.name`, also **„Hopp & Go"** — geprüft in
`apps/web/lib/email/send.ts`. Der Name `Louez.io` erscheint nur bei einer
Rechnungsmail für gemietete Telefonnummern, die euch nicht betrifft.

---

## Zugangsdaten nicht in den Chat

Die Werte gehören direkt in die `.env` auf dem Server oder in eine lokale Datei
mit `chmod 600`. Alles, was im Gesprächsverlauf steht, bleibt dort — auch nach
dem Widerrufen.

---

## Reihenfolge

1. Stripe im **Testmodus** — Schlüssel, Webhooks, Konto verbinden
2. Vollständige Testbuchung: Zahlung, Kautions-Reservierung, Bestätigungsmail
3. Brevo — SMTP, Absender, DNS
4. Erst danach auf **Live** umstellen

Damit ist eine echte Fehlbuchung mit echtem Geld ausgeschlossen.
