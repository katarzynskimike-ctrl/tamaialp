#!/usr/bin/env node
/**
 * KREATOR REJESTRACJI — na czym stoi rejestracja kliniki i u jakiego operatora.
 *
 * Pytanie jest WIELOKROTNE (numer stacjonarny / komórkowy / centralka, dowolna kombinacja),
 * bo przy wyborze jednokrotnym klinika z centralką ORAZ komórką musiała skłamać, a my
 * zapisywaliśmy jej wtedy „nie mamy centralki" — twierdzenie, którego nikt nie wypowiedział.
 *
 * Ten test istnieje przez KONKRETNĄ usterkę, złapaną w recenzji 31.08.2026:
 *
 *   klinika zaznacza jeden rodzaj numeru, na liście wybiera „Inny", wpisuje nazwę operatora,
 *   po czym dokłada drugi rodzaj — a wpisana nazwa zostaje po cichu skasowana. Lista dalej
 *   mówi „Inny — wpiszę nazwę", ale pola do wpisania już nie ma i nie da się go przywołać.
 *   Zgłoszenie przechodzi dalej z bezużytecznym „stacjonarny: Inny", mimo że nazwa miała
 *   być obowiązkowa.
 *
 * Dlaczego zwykły test tego nie łapał: usterka nie siedzi w żadnym pojedynczym module,
 * tylko w ZALEŻNOŚCI między dwoma przełącznikami widoczności. Widać ją wyłącznie wtedy,
 * gdy przejdzie się ścieżkę zmiany zdania — pojedyncze zaznaczenie wygląda bez zarzutu.
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
  const doStart = html.indexOf('    window.operatorOpis = function(fd) {');
  if (od === -1 || doStart === -1) return null;
  const koniec = html.indexOf('\n    };', doStart);
  if (koniec === -1) return null;
  return html.slice(od, koniec + '\n    };'.length);
}

/* ── Minimalny model DOM: dokładnie tyle, ile dotyka wycięty kod ────────── */
function zbudujDom(rodzaje) {
  const el = (tag, atrybuty = {}) => ({
    tag, _atr: { ...atrybuty }, style: { display: '' }, value: '', checked: false, children: [],
    setAttribute(n, v) { this._atr[n] = v; },
    removeAttribute(n) { delete this._atr[n]; },
    hasAttribute(n) { return Object.prototype.hasOwnProperty.call(this._atr, n); },
    querySelector(sel) {
      for (const c of this.children) if (sel.split(',').some(s => s.trim() === c.tag)) return c;
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

  // trzy kratki wyboru rodzaju numeru — z `required` w znacznikach, jak na stronie
  const kratki = rodzaje.map(w => el('input', { name: 'numberKinds', type: 'checkbox', required: 'required' }));
  kratki.forEach((k, i) => { k.value = rodzaje[i]; });

  const nagrywanie = el('fieldset');
  nagrywanie.style.display = 'none';
  for (const w of ['a', 'b']) nagrywanie.children.push(el('input', { name: 'recordingStatus', value: w }));
  wezly.recordingField = nagrywanie;

  const document = {
    getElementById: id => wezly[id] || null,
    querySelector: sel => {
      const m = /#(\w+) (select|input)/.exec(sel);
      return m && wezly[m[1]] ? wezly[m[1]].querySelector(m[2]) : null;
    },
    querySelectorAll: sel => {
      if (!/numberKinds/.test(sel)) return [];
      return /:checked/.test(sel) ? kratki.filter(k => k.checked) : kratki.slice();
    },
  };
  return { document, wezly, pola, kratki };
}

function zaladuj(kod, dom) {
  const window = {};
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', kod + '\n;return window;')(dom.document, window);
  return window;
}

const widoczne = k => k.style.display !== 'none';
const wymagane = k => k.querySelector('select,input').hasAttribute('required');

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
    ? { stac: 'Landline', kom: 'Mobile', pbx: 'Phone system (PBX)' }
    : { stac: 'Stacjonarny', kom: 'Komórkowy', pbx: 'Centralka telefoniczna' };

  const dom = zbudujDom([R.stac, R.kom, R.pbx]);
  const w = zaladuj(kod, dom);

  const zaznacz = (...wartosci) => {
    dom.kratki.forEach(k => { k.checked = wartosci.indexOf(k.value) !== -1; });
    w.toggleNumberKinds();
  };
  const fd = pary => ({
    get: n => (pary[n] === undefined ? null : pary[n]),
    getAll: n => (n === 'numberKinds' ? (pary.numberKinds || []) : []),
  });

  /* ── 1. „Przynajmniej jedno zaznaczenie" ──────────────────────────────── */
  /* HTML nie zna takiego warunku dla grupy kratek — trzymamy `required` na wszystkich,
     dopóki żadna nie jest zaznaczona, i zdejmujemy je z chwilą pierwszego zaznaczenia. */
  zaznacz();
  ok(dom.kratki.every(k => k.hasAttribute('required')),
     'gdy nic nie zaznaczone, kreator nie przepuści dalej');
  zaznacz(R.stac);
  ok(dom.kratki.every(k => !k.hasAttribute('required')),
     'jedno zaznaczenie wystarczy — reszta przestaje być obowiązkowa');

  /* ── 2. USTERKA Z RECENZJI: dołożenie rodzaju kasowało wpisaną nazwę ──── */
  dom.pola.opFixedField.value = 'Inny';
  w.toggleOperatorOther('Fixed');
  ok(widoczne(dom.wezly.opFixedOtherField), 'po wybraniu „Inny" pole na nazwę jest widoczne');
  ok(wymagane(dom.wezly.opFixedOtherField), 'pole na nazwę jest obowiązkowe');

  dom.pola.opFixedOtherField.value = 'Telefonia Osiedlowa Sp. z o.o.';
  zaznacz(R.stac, R.kom);           // ← klinika DOKŁADA drugi rodzaj; pierwsza lista zostaje

  ok(dom.pola.opFixedOtherField.value === 'Telefonia Osiedlowa Sp. z o.o.',
     'wpisana nazwa PRZEŻYWA dołożenie drugiego rodzaju numeru', dom.pola.opFixedOtherField.value);
  ok(widoczne(dom.wezly.opFixedOtherField), 'pole na nazwę nadal widoczne, skoro lista nadal mówi „Inny"');
  ok(wymagane(dom.wezly.opFixedOtherField), 'pole na nazwę nadal obowiązkowe — inaczej przejdzie puste „Inny"');

  const opis = w.operatorOpis(fd({
    numberKinds: [R.stac, R.kom], operatorFixed: 'Inny',
    operatorFixedOther: 'Telefonia Osiedlowa Sp. z o.o.', operatorMobile: 'Play',
  }));
  ok(opis.includes('Telefonia Osiedlowa'), 'doradca dostaje wpisaną nazwę, nie samo słowo „Inny"', opis);
  ok(opis.includes('Play'), 'i drugiego operatora obok pierwszego', opis);

  /* ── 3. Znikająca lista NIE zostawia obowiązkowego pola pod spodem ───── */
  /* Druga strona tej samej monety: pole `required` schowane przez display:none blokuje
     formularz BEZ komunikatu, bo przeglądarka nie ma nad czym pokazać dymka. */
  const ukryteObowiazkowe = () => Object.keys(dom.wezly)
    .filter(id => id !== 'recordingField')
    .filter(id => !widoczne(dom.wezly[id]) && wymagane(dom.wezly[id]));

  const sekwencja = [
    [R.stac], [R.stac, R.kom], [R.pbx], [R.kom, R.pbx],
    [R.stac, R.kom, R.pbx], [R.kom], [R.stac, R.pbx],
  ];
  const potkniecia = [];
  for (const zestaw of sekwencja) {
    zaznacz(...zestaw);
    for (const [k, id] of [['Fixed', 'opFixedField'], ['Mobile', 'opMobileField'], ['Pbx', 'opPbxField']]) {
      if (widoczne(dom.wezly[id])) { dom.pola[id].value = 'Inny'; w.toggleOperatorOther(k); }
    }
    const zle = ukryteObowiazkowe();
    if (zle.length) potkniecia.push({ zestaw, zle });
  }
  ok(potkniecia.length === 0,
     'przez całą sekwencję zmian zdania ANI RAZU nie ma ukrytego pola obowiązkowego', potkniecia);

  /* ── 4. Nagrywanie pojawia się WSZĘDZIE tam, gdzie jest centralka ─────── */
  /* Przy wyborze jednokrotnym to pytanie nie padało nigdy poza czystą „Centralką" —
     klinika z centralką i komórką nie była o nie pytana w ogóle. */
  zaznacz(R.pbx);
  const samaCentralka = widoczne(dom.wezly.recordingField);
  zaznacz(R.kom, R.pbx);
  const centralkaZKomorka = widoczne(dom.wezly.recordingField);
  zaznacz(R.kom);
  const bezCentralki = widoczne(dom.wezly.recordingField);
  ok(samaCentralka && centralkaZKomorka && !bezCentralki,
     'pytanie o nagrywanie pada zawsze przy centralce, także w parze z komórką',
     { samaCentralka, centralkaZKomorka, bezCentralki });

  /* ── 5. Słownictwo opisu zgodne z językiem strony ─────────────────────── */
  const opisJez = w.operatorOpis(fd({
    numberKinds: [R.stac, R.kom], operatorFixed: 'Orange', operatorMobile: 'Play',
  }));
  ok(angielski ? /landline/.test(opisJez) : /stacjonarny/.test(opisJez),
     'opis w języku strony', opisJez);

  /* ── 6. Listy nie zawierają już pozycji „nie wiem" ────────────────────── */
  ok(!/Nie wiem — sprawdzimy|Not sure — we will check/.test(html),
     'brak furtki „nie wiem" — kto nie zna operatora, wybiera „Inny" i wpisuje z faktury');

  /* ── 7. „Ma centralkę?" znów jest ODPOWIEDZIĄ, nie naszym wnioskiem ───── */
  /* Sprawdzane po ROLI: wyrażenie wypełniające `currentPbx` musi czytać zaznaczenia
     kratek, a nie zgadywać z rodzaju numeru. */
  const bezKom = html.replace(/<!--[\s\S]*?-->/g, '');
  ok(new RegExp("currentPbx: fd\\.getAll\\('numberKinds'\\)\\.indexOf\\('" + R.pbx.replace(/[()]/g, '\\$&') + "'\\)").test(bezKom),
     'currentPbx wyliczane z zaznaczonych kratek, nie zgadywane');
}

/* ── 8. Trzy kopie kreatora mają IDENTYCZNĄ logikę ─────────────────────── */
console.log('\n── parytet trzech kopii ──');
/* Rozjazd między kopiami ujawnia się dopiero u klienta, który wszedł na inną podstronę,
   więc żaden pojedynczy test strony go nie złapie. */
const bezJezyka = k => k
  .replace(/'(stacjonarny|komórkowy|centralka|landline|mobile|phone system): '/g, "'X: '")
  .replace(/'(Stacjonarny|Komórkowy|Centralka telefoniczna|Landline|Mobile|Phone system \(PBX\))'/g, "'Y'");
const [a, b, c] = PLIKI.map(p => logiki[p] && bezJezyka(logiki[p]));
ok(a && b && a === b, 'index.html i recepcja/index.html — ta sama logika');
ok(a && c && a === c, 'index.html i en/index.html — ta sama logika (poza słownictwem)');

/* ── 9. Awaryjny mail wymienia rodzaj numeru we WSZYSTKICH kopiach ─────── */
/* Gdy POST /api/lead padnie, formularz wysyła zgłoszenie mailem. Wersja angielska
   przez chwilę nie miała tej linii — klient z /en gubił wtedy całą odpowiedź. */
for (const plik of PLIKI) {
  const bezKomentarzy = readFileSync(join(KATALOG, plik), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  ok(/'(Numer i operator|Number \/ operator): '\s*\+\s*\(data\.numberType/.test(bezKomentarzy),
     plik + ' — awaryjny mail podaje rodzaj numeru');
}

console.log(`\n${FAIL === 0 ? '✅' : '❌'} zdane: ${PASS}, niezdane: ${FAIL}`);
process.exit(FAIL === 0 ? 0 : 1);
