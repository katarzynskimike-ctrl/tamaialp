# CHANGELOG — landing tamaia.pl

Format: data — co i po co. Wpis dodajemy przy każdej promocji na produkcję.

## [niewydane] — na becie
- 2026-08-02: **angielska wersja strony** — `/en` (landing), `/en/offer`, `/en/calculator` plus angielskie
  animacje w iframe (`/en/anim-hero.html`, `/en/anim-problem-efekt-light.html`). Przełącznik PL/EN
  w nawigacji obu wersji, `hreflang` (pl / en / x-default) na wszystkich stronach, sitemap z parami
  językowymi. Ceny bez zmian, w PLN brutto, z opisem „gross, 23% VAT". Pliki PL nietknięte poza
  dodanym przełącznikiem i tagami `hreflang`.
- 2026-08-02: **angielskie logo** `en/logo_tamaia_en.png` — symbol i wordmark skopiowane z oryginału
  piksel w piksel, podmieniony wyłącznie podpis pod spodem („The front desk that turns calls into
  appointments"). Kreski ozdobne przeniesione jako bitmapy, więc zachowały złoty gradient; podpis
  złożony w Poppins Regular (waga i rozmiar ustalone pomiarem oryginału). Używane w nawigacji EN,
  w sekcji z logo oraz w animacji `/en/anim-problem-efekt-light.html`.
- Architektura wdrożeń beta→prod (GitHub Actions): okna 06:30/22:15 PL, zatwierdzanie `[ship]`,
  backup przed, smoke + Lighthouse po, auto-rollback. Pliki: `.github/workflows/*`, `scripts/smoke-test.mjs`,
  `ARCHITEKTURA_DEPLOY_LANDING.md`. (do wgrania w bootstrapie)

## Wcześniej (przed CHANGELOG-iem, z HANDOFF)
- 2026-06-23: oferta startowa „1000 minut gratis do 31.07", licznik przyłączonych, poprawka „1 numer stacjonarny PL w cenie".
- 2026-06: sekcja telefonii Ringostat (4 karty cenowe) pod cennikiem.
