# TAMAIA — Doskonała Rejestracja Stomatologiczna

Landing page dla aplikacji **TAMAIA** z asystentką **MAIA** — AI dla gabinetów stomatologicznych.

## Co to jest

Statyczny landing page (HTML + CSS + JavaScript, bez zależności build'owych). Promuje:
- **Aplikację TAMAIA** — centralka telefoniczna z AI dla rejestracji stomatologicznej
- **MAIA** — cyfrową asystentkę jakości w aplikacji
- **Skrypty Doskonałej Rejestracji** — autorska metodologia Michała Katarzyńskiego
- **Partnerstwo z Ringostat** — sprawdzona na całym świecie telefonia AI

## Stack

- HTML5 + CSS3 + Vanilla JavaScript
- Brak zależności (npm/build)
- Pojedynczy plik `index.html`
- Logo i zdjęcia jako pliki obok

## Struktura plików

```
.
├── index.html              ← landing page
├── logo_tamaia.png         ← logo MAIA (twoje, dodaj!)
├── michal_katarzynski.jpg  ← zdjęcie założyciela (twoje, dodaj!)
├── vercel.json             ← konfiguracja Vercel
├── README.md
└── .gitignore
```

## Deployment

### Opcja A — Vercel (rekomendowane)

1. Wrzuć kod na GitHub
2. W Vercel: New Project → wybierz repo → Deploy
3. Vercel sam wykryje statyczny site, użyje `vercel.json`
4. Otrzymasz URL `tamaia.vercel.app` (lub własny po podpięciu domeny)

### Opcja B — Cloudflare Pages

1. Wrzuć kod na GitHub
2. Cloudflare Pages → Connect to Git → wybierz repo
3. Build command: brak (puste)
4. Output directory: `/`

### Opcja C — Direct upload (bez Git)

Drag & drop folderu do:
- Vercel → New Project → Upload assets
- Cloudflare Pages → Direct Upload

## Domena (OVH)

W panelu OVH → Strefa DNS:
```
Typ: CNAME
Subdomena: www (lub @)
Target: cname.vercel-dns.com  (dla Vercel)
        twojprojekt.pages.dev  (dla Cloudflare)
```

W Vercel: Project → Settings → Domains → Add → wpisz domenę.

## Aktualizacje

Każdy push do `main` na GitHubie = automatyczny redeploy (Vercel & Cloudflare). Stary build dostępny do rollback'u.

## Co dodać po klonie

Przed pierwszym deployem upewnij się że masz w katalogu:
- `logo_tamaia.png` — logo brand (TA granat + MAIA złoto)
- `michal_katarzynski.jpg` — zdjęcie założyciela (do sekcji Founder)

Jeśli ich nie ma, fallback'i tekstowe i URL z `doskonalaobslugapacjenta.pl` zadziałają, ale gorzej wyglądają.

## Backend (do podłączenia)

Formularz w `<section id="cta">` używa `mailto:` jako fallback. Aby aktywować płatność / trial:

1. **POST /api/lead** — przyjmuje JSON `{ name, clinic, phone, email, nip, address, drs_plan, ringostat_plan, count, intent }`
2. **Webhook do CRM** — HubSpot / Pipedrive
3. **Płatność** — Przelewy24 (BLIK/karta) + Stripe Subscriptions (recurring)
4. **Provisioning Ringostat** — zgłoszenie do portalu partnerskiego z promokodem `Ringostat_DOP`

Stack rekomendowany: Node.js + Express na Vercel Edge Functions / Cloudflare Workers.

## Kontakt

- **Excellent Patient Service sp. z o.o.**
- ul. Lubomirskiego 39E, 36-040 Boguchwała
- NIP: 5170359961
- 📞 +48 579 774 089
- ✉️ biuro@doskonalaobslugapacjenta.pl
- 🌐 [doskonalaobslugapacjenta.pl](https://doskonalaobslugapacjenta.pl)

## Licencja

© 2026 Excellent Patient Service sp. z o.o. Wszystkie prawa zastrzeżone.
