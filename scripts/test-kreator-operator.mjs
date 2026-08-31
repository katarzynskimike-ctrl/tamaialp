#!/usr/bin/env node
/**
 * KREATOR REJESTRACJI — pytanie o rodzaj numeru i operatora.
 *
 * Ten test istnieje przez KONKRETNĄ usterkę, złapaną w recenzji 31.08.2026 i wcześniej
 * przepuszczoną przez wszystko inne:
 *
 *   klinika wybiera „Stacjonarny", na liście zaznacza „Inny", wpisuje nazwę operatora,
 *   po czym zmienia zdanie na „Oba" — a wpisana nazwa zostaje po cichu skasowana.
 *   Lista dalej mówi „Inny — wpiszę nazwę", ale pola do wpisania już nie ma i nie da się
 *   go przywołać. Zgłoszenie przechodzi dalej z bezużytecznym „stacjonarny: Inny",
 *   mimo że nazwa miała być obowiązkowa.
 *
 * Dlaczego zwykły test tego nie łapał: usterka nie siedzi w żadnym pojedynczym module,
 * tylko w ZALEŻNOŚCI między dwoma przełącznikami widoczności. Widać ją wyłącznie wtedy,
 * gdy przejdzie się ścieżkę zmiany zdania — pojedynczy wybór wygląda bez zarzutu.
 *
 * Test bierze ŻYWY kod z plików HTML (nie kopię) i uruchamia go na ręcznym, minimalnym
 * modelu DOM — landing nie ma żadnych zależności i ten test też ich nie dokłada.
 *
 * Uruchomienie:  node scripts/test-kreator-operator.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const KATALOG = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLIKI = ['index.html', 'recepcja/index.html', 'en/index.html'];

let PASS = 0, FAIL = 0;
const ok = (warunek, opis, dodatek) => {
  if (warunek) { PASS++; console.log('  ✓ ' + opis); }
  else { FAIL++; console.log('  ✗ ' + opis + (dodatek !== undefined ? '  [' + JSON.stringify(dodatek) + ']' : '')); }
};

/* ── Wycięcie ŻYWEJ logiki z pliku ─────────────────────────────────────── */
function wytnijLogike(html) {
  const od = html.indexOf('    function ustawPole(id, pokaz) {');
  const znacznik = '    window.operatorOpis = function(fd) {';
  const doStart = html.indexOf(znacznik);
  if (od === -1 || doStart === -1) return null;
  const koniec = html.indexOf('\n    };', doStart);
  if (koniec === -1) return null;
  return html.slice(od, koniec + '\n    };'.length);
}

/* ── Minimalny model DOM: dokładnie tyle, ile dotyka wycięty kod ────────── */
function zbudujDom(etykietyRodzaju) {
  const el = (tag, atrybuty = {}) => ({
    tag, _atr: { ...atrybuty }, style: { display: '' }, value: '', checked: false,
    children: [],
    setAttribute(n, v) { this._atr[n] = v; },
    removeAttribute(n) { delete this._atr[n]; },
    hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this._atr, n); },
    querySelector(sel) {
      for (const c of this.children) {
        if (sel.split(',').some(s => s.trim() === c.tag)) return c;
      }
      return null;
    },
    querySelectorAll(sel) {
      const m = /name="([^"]+)"/.exec(sel);
      return this.children.filter(c => !m || c._atr.name === m[1]);
    },
  });

  const wezly = {};
  const dodajPole = (id, tag, nazwa) => {
    const kontener = el('label');
    kontener.style.display = 'none';
    const wejscie = el(tag, { name: nazwa });
    kontener.children.push(wejscie);
    wezly[id] = kontener;
    return wejscie;
  };

  const pola = {
    opFixedField:       dodajPole('opFixedField', 'select', 'operatorFixed'),
    opMobileField:      dodajPole('opMobileField', 'select', 'operatorMobile'),
    opPbxField:         dodajPole('opPbxField', 'select', 'operatorPbx'),
    opFixedOtherField:  dodajPole('opFixedOtherField', 'input', 'operatorFixedOther'),
    opMobileOtherField: dodajPole('opMobileOtherField', 'input', 'operatorMobileOther'),
    opPbxOtherField:    dodajPole('opPbxOtherField', 'input', 'operatorPbxOther'),
  };

  const nagrywanie = el('fieldset');
  nagrywanie.style.display = 'none';
  for (const w of ['a', 'b']) nagrywanie.children.push(el('input', { name: 'recordingStatus', value: w }));
  wezly.recordingField = nagrywanie;

  const document = {
    getElementById: id => wezly[id] || null,
    querySelector: sel => {
      const m = /#(\w+) (select|input)/.exec(sel);
      if (m && wezly[m[1]]) return wezly[m[1]].querySelector(m[2]);
      return null;
    },
  };
  return { document, wezly, pola, etykietyRodzaju };
}

/* ── Uruchomienie wyciętej logiki ───────────────────────────────────────── */
function zaladuj(kod, dom) {
  const window = {};
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', kod + '\n;return window;')(dom.document, window);
  return window;
}

const widoczne = kontener => kontener.style.display !== 'none';
const wymagane = kontener => kontener.querySelector('select,input').hasAttribute('required');

/* ═══ PRZEBIEG ═══════════════════════════════════════════════════════════ */
const logiki = {};

for (const plik of PLIKI) {
  console.log('\n── ' + plik + ' ──');
  const html = readFileSync(join(KATALOG, plik), 'utf8');
  const kod = wytnijLogike(html);
  ok(!!kod, 'logika kreatora znaleziona w pliku');
  if (!kod) continue;
  logiki[plik] = kod;

  const angielski = plik.startsWith('en/');
  const R = angielski
    ? { stac: 'Landline', kom: 'Mobile', oba: 'Both', pbx: 'Phone system (PBX)' }
    : { stac: 'Stacjonarny', kom: 'Komórkowy', oba: 'Oba', pbx: 'Centralka telefoniczna' };

  const dom = zbudujDom(R);
  const w = zaladuj(kod, dom);
  const fd = pary => ({ get: n => (pary[n] === undefined ? null : pary[n]) });

  /* ── 1. USTERKA Z RECENZJI: zmiana zdania kasowała wpisaną nazwę ─────── */
  w.toggleNumberType('stacjonarny');
  dom.pola.opFixedField.value = 'Inny';
  w.toggleOperatorOther('Fixed');
  ok(widoczne(dom.wezly.opFixedOtherField), 'po wybraniu „Inny" pole na nazwę jest widoczne');
  ok(wymagane(dom.wezly.opFixedOtherField), 'pole na nazwę jest obowiązkowe');

  dom.pola.opFixedOtherField.value = 'Telefonia Osiedlowa Sp. z o.o.';
  w.toggleNumberType('oba');   // ← klinika zmienia zdanie; lista stacjonarna ZOSTAJE na ekranie

  ok(dom.pola.opFixedOtherField.value === 'Telefonia Osiedlowa Sp. z o.o.',
     'wpisana nazwa PRZEŻYWA zmianę zdania na „Oba"', dom.pola.opFixedOtherField.value);
  ok(widoczne(dom.wezly.opFixedOtherField),
     'pole na nazwę nadal widoczne, skoro lista nadal mówi „Inny"');
  ok(wymagane(dom.wezly.opFixedOtherField),
     'pole na nazwę nadal obowiązkowe — inaczej przejdzie puste „Inny"');

  dom.pola.opMobileField.value = 'Play';
  ok(w.operatorOpis(fd({ numberType: R.oba, operatorFixed: 'Inny',
                         operatorFixedOther: 'Telefonia Osiedlowa Sp. z o.o.', operatorMobile: 'Play' }))
       .includes('Telefonia Osiedlowa'),
     'doradca dostaje wpisaną nazwę, nie samo słowo „Inny"',
     w.operatorOpis(fd({ numberType: R.oba, operatorFixed: 'Inny',
                         operatorFixedOther: 'Telefonia Osiedlowa Sp. z o.o.', operatorMobile: 'Play' })));

  /* ── 2. Znikająca lista NIE zostawia obowiązkowego pola pod spodem ───── */
  /* To druga strona tej samej monety: pole `required` schowane przez display:none
     blokuje formularz BEZ komunikatu, bo przeglądarka nie ma nad czym pokazać dymka. */
  const ukryteObowiazkowe = () => Object.keys(dom.wezly)
    .filter(id => id !== 'recordingField')
    .filter(id => !widoczne(dom.wezly[id]) && wymagane(dom.wezly[id]));

  const sekwencja = ['stacjonarny', 'oba', 'centralka', 'oba', 'komorkowy', 'centralka'];
  let potkniecia = [];
  for (const krok of sekwencja) {
    w.toggleNumberType(krok);
    // po każdym kroku klinika zaznacza „Inny" wszędzie, gdzie się da
    for (const [k, id] of [['Fixed', 'opFixedField'], ['Mobile', 'opMobileField'], ['Pbx', 'opPbxField']]) {
      if (widoczne(dom.wezly[id])) { dom.pola[id].value = 'Inny'; w.toggleOperatorOther(k); }
    }
    const zle = ukryteObowiazkowe();
    if (zle.length) potkniecia.push({ krok, zle });
  }
  ok(potkniecia.length === 0,
     'przez całą sekwencję zmian zdania ANI RAZU nie ma ukrytego pola obowiązkowego', potkniecia);

  /* ── 3. Pytanie o nagrywanie tylko przy centralce ─────────────────────── */
  w.toggleNumberType('centralka');
  const przyCentralce = widoczne(dom.wezly.recordingField);
  w.toggleNumberType('komorkowy');
  const przyKomorce = widoczne(dom.wezly.recordingField);
  ok(przyCentralce && !przyKomorce, 'pytanie o nagrywanie pojawia się tylko przy centralce',
     { przyCentralce, przyKomorce });

  /* ── 4. Słownictwo opisu zgodne z językiem strony ─────────────────────── */
  const opis = w.operatorOpis(fd({ numberType: R.oba, operatorFixed: 'Orange', operatorMobile: 'Play' }));
  ok(angielski ? /landline/.test(opis) : /stacjonarny/.test(opis),
     'opis dla „Oba" w języku strony', opis);
}

/* ── 5. Trzy kopie kreatora mają IDENTYCZNĄ logikę przełączania ─────────── */
console.log('\n── parytet trzech kopii ──');
/* Rozjazd między kopiami ujawnia się dopiero u klienta, który wszedł na inną podstronę,
   więc żaden pojedynczy test strony go nie złapie. Porównujemy logikę po usunięciu
   różnic czysto językowych. */
const bezJezyka = k => k.replace(/'(stacjonarny|komórkowy|landline|mobile): '/g, "'X: '");
const [a, b, c] = PLIKI.map(p => logiki[p] && bezJezyka(logiki[p]));
ok(a && b && a === b, 'index.html i recepcja/index.html — ta sama logika');
ok(a && c && a === c, 'index.html i en/index.html — ta sama logika (poza słownictwem)');

/* ── 6. Awaryjny mail wymienia rodzaj numeru we WSZYSTKICH kopiach ──────── */
/* Gdy POST /api/lead padnie, formularz wysyła zgłoszenie mailem. Wersja angielska
   przez chwilę nie miała tej linii — klient z /en gubił wtedy całą odpowiedź. */
for (const plik of PLIKI) {
  const html = readFileSync(join(KATALOG, plik), 'utf8');
  const bezKomentarzy = html.replace(/<!--[\s\S]*?-->/g, '');
  ok(/'(Numer i operator|Number \/ operator): '\s*\+\s*\(data\.numberType/.test(bezKomentarzy),
     plik + ' — awaryjny mail podaje rodzaj numeru');
}

console.log(`\n${FAIL === 0 ? '✅' : '❌'} zdane: ${PASS}, niezdane: ${FAIL}`);
process.exit(FAIL === 0 ? 0 : 1);
