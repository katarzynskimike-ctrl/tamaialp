# Architektura wdrożeń — landing tamaia.pl

Stan: 2026-06-23. Repo: `katarzynskimike-ctrl/tamaialp` → Vercel → tamaia.pl.
Cel: każda zmiana landingu jest trwała (historia w git), najpierw ląduje na **becie**, a na **produkcję** wchodzi tylko w bezpiecznych oknach (rano / po 22:00), zawsze z **backupem przed** i **automatycznym testem po** — z **auto-cofnięciem**, gdy coś się zepsuje.

## TL;DR — jak to działa

```
edycja → gałąź BETA ──(Vercel)──▶ beta.tamaia.pl   ← tu testujesz
                                         │
                        oznaczasz commit „[ship]"  (= gotowe do publikacji)
                                         │
        okno 06:30 lub 22:15 (PL) → GitHub Action:
          1. BACKUP produkcji (tag + kopia HTML)
          2. promocja beta → MAIN ──(Vercel)──▶ tamaia.pl
          3. AUTO-TEST produkcji (smoke + Lighthouse)
          4. test padł? → AUTOMATYCZNY ROLLBACK do backupu
```

Silnik to **GitHub Actions** — działa w chmurze GitHuba, więc po jednorazowym ustawieniu chodzi sam, bez Twojego i mojego udziału.

## Gałęzie i hosting

- **`main` = produkcja.** Nikt nie edytuje main ręcznie. Zmiany wchodzą wyłącznie przez betę i promocję.
- **`beta` = staging.** Tu trafiają wszystkie zmiany do testu. Vercel buduje z niej `beta.tamaia.pl`.
- Vercel jest podpięty do repo przez integrację Git: push na `main` deployuje produkcję, push na `beta` deployuje betę — automatycznie, bez tokenów w Actions.

## Codzienny obieg zmiany

1. Zmiana w `index.html` (lub innym pliku) trafia na gałąź **beta** (upload na GitHub / push).
2. Vercel buduje **beta.tamaia.pl** (~30–90 s). Action „Test bety" odpala smoke test i mówi, czy beta jest zdrowa.
3. Testujesz na becie (zawsze też na telefonie).
4. Gdy gotowe — w opisie commita na becie wpisz **`[ship]`** (albo poproś mnie, dodam). To znacznik „to wolno wypuścić".
5. W najbliższym oknie (06:30 lub 22:15 PL) Action sam promuje betę na produkcję, z backupem i testem.
6. Wpis do `CHANGELOG.md`.

## Zatwierdzenie do produkcji („tylko zatwierdzone")

Produkcja **nie** zmienia się sama tylko dlatego, że coś jest na becie. Action promuje wyłącznie, gdy beta jest **zatwierdzona**, czyli zachodzi jedno z:

- ostatni commit na becie ma w opisie **`[ship]`**, albo
- tag **`ready`** wskazuje czubek bety (`git tag -f ready` → push; ja robię to jednym ruchem).

Bez tego znacznika okno mija „na pusto" — nic nie wchodzi na produkcję. To celowy bezpiecznik.

## Okna promocji

- **06:30** i **22:15** czasu polskiego (poza godzinami ruchu klientów).
- GitHub kroni działa w UTC i nie zna czasu letniego/zimowego, więc workflow ma 4 wpisy cron (po dwa na okno) plus strażnik, który dopuszcza tylko realne 06:30 / 22:15 PL — działa tak samo latem i zimą.
- Awaryjnie możesz puścić promocję od ręki: zakładka **Actions → „Promocja na produkcję" → Run workflow** (opcja `force` pomija okno i wymóg `[ship]`).

## Backup przed wgraniem

Przed każdą promocją Action:

- tworzy tag **`backup/prod-RRRRMMDD-GGMM`** wskazujący poprzedni stan produkcji (punkt powrotu — rollback to jedno polecenie/jeden klik),
- pobiera żywą stronę i zapisuje jako artefakt **`prod-backup-html`** (30 dni) — czytelna kopia na wszelki wypadek.

Koniec z plikami `*.bak` — historią i backupem jest git (zgodnie ze standardem architektury).

## Auto-test po wgraniu

- **Smoke test** (`scripts/smoke-test.mjs`): HTTP 200, typ `text/html`, obecność kluczowych sekcji (TAMAIA, MAIA, Ringostat, Cennik, Premium), rozmiar strony (łapie obcięty plik) i czas pobrania. Błąd = strona zbita.
- **Lighthouse** (wydajność, dostępność, SEO): informacyjnie, z progami jako *ostrzeżenia*. Raport ląduje jako artefakt z linkiem. Spadek wydajności **nie** cofa wdrożenia (działająca, choć wolniejsza strona zostaje) — ale jest widoczny w logu i do poprawy na becie.

## Rollback

- **Automatyczny:** gdy smoke test produkcji padnie, Action przywraca `main` z taga `backup/prod-…`, Vercel buduje poprzednią (działającą) wersję i zakłada *issue* „Deploy nieudany — rollback". Zero Twojej akcji.
- **Ręczny (gdyby trzeba):** w Vercel → Deployments → poprzedni deploy → „Promote/Rollback" (jedno kliknięcie). Albo z taga: `git push origin +refs/tags/backup/prod-RRRRMMDD-GGMM:refs/heads/main`.

## Bootstrap — jednorazowa konfiguracja

Te kroki trzeba wykonać raz (zrobię je sam, gdy podłączysz „Claude in Chrome"; albo prowadzę Cię klik po kliku):

1. **Wgraj pliki architektury** z `deploy/` do repo `tamaialp` (root): `.github/workflows/promote-prod.yml`, `.github/workflows/beta-check.yml`, `.github/lighthouserc.json`, `scripts/smoke-test.mjs`.
2. **Utwórz gałąź `beta`** od `main`.
3. **Vercel:** w projekcie landingu przypisz domenę **beta.tamaia.pl** do gałęzi `beta` (Settings → Domains / Git → production branch = `main`).
4. **DNS:** dodaj rekord dla `beta.tamaia.pl` wg instrukcji Vercel (CNAME na Vercel). DNS tamaia.pl prowadzi obecnie OVH — dodać tam wpis.
5. **Uprawnienia Actions:** Settings → Actions → General → „Workflow permissions" = **Read and write** (workflow promuje main i tworzy tagi/issue).
6. **(Opcjonalnie) Ochrona `main`:** wymagaj, by zmiany szły tylko przez promocję — Action ma prawo zapisu, więc nie blokuj bota.

Po bootstrapie cały obieg jest automatyczny.

## Pliki w repo

| Plik | Rola |
|---|---|
| `.github/workflows/promote-prod.yml` | promocja beta→prod w oknach, backup, test, rollback |
| `.github/workflows/beta-check.yml` | test bety po każdym pushu na `beta` |
| `.github/lighthouserc.json` | progi Lighthouse (ostrzeżenia) |
| `scripts/smoke-test.mjs` | szybki test strony (prod i beta) |
| `ARCHITEKTURA_DEPLOY_LANDING.md` | ten dokument |
| `CHANGELOG.md` | rejestr zmian produkcyjnych |

## FAQ awaryjne

- **Produkcja zepsuta, a Action nie cofnął?** Vercel → Deployments → poprzedni → Rollback (1 klik). To zawsze działa, niezależnie od git.
- **Chcę wypuścić natychmiast, nie czekać na okno.** Actions → „Promocja na produkcję" → Run workflow → `force = true`.
- **Coś jest na becie, ale NIE ma iść na produkcję.** Nie dawaj `[ship]` / nie ustawiaj taga `ready`. Okno minie bez zmian.
