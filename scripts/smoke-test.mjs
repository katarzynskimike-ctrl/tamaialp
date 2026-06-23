#!/usr/bin/env node
/**
 * smoke-test.mjs — szybki test landingu TAMAIA po wgraniu (prod albo beta).
 *
 * Użycie:
 *   node scripts/smoke-test.mjs https://tamaia.pl
 *   node scripts/smoke-test.mjs https://beta.tamaia.pl
 *
 * Sprawdza:
 *   1. HTTP 200 i typ text/html
 *   2. Obecność kluczowych, stabilnych fragmentów treści (sekcje, marka)
 *   3. Czas pobrania strony (miękki budżet — ostrzeżenie/błąd gdy za wolno)
 *
 * Kod wyjścia: 0 = OK, 1 = błąd krytyczny (zbita strona) → workflow robi rollback.
 */

const url = process.argv[2];
if (!url) {
  console.error('Podaj URL, np. node scripts/smoke-test.mjs https://tamaia.pl');
  process.exit(2);
}

const REQUIRED = ['TAMAIA', 'MAIA', 'Ringostat', 'Cennik', 'Premium'];
const SOFT_MS = 3500;
const HARD_MS = 8000;
const TIMEOUT_MS = 20000;

function fail(msg) { console.error('FAIL: ' + msg); process.exit(1); }
function ok(msg)   { console.log('OK: ' + msg); }
function warn(msg) { console.log('WARN: ' + msg); }

const ctrl = new AbortController();
const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
const t0 = Date.now();

let res;
try {
  res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'TAMAIA-smoke-test' } });
} catch (e) {
  clearTimeout(to);
  fail('Strona nie odpowiedziala (' + url + '): ' + e.message);
}
clearTimeout(to);
const ms = Date.now() - t0;

if (res.status !== 200) fail('Zly status HTTP: ' + res.status + ' (oczekiwano 200) dla ' + url);
ok('HTTP 200 (' + url + ')');

const ctype = res.headers.get('content-type') || '';
if (!/text\/html/i.test(ctype)) fail('Zly Content-Type: "' + ctype + '" (oczekiwano text/html)');
ok('Content-Type: ' + ctype);

const html = await res.text();
if (html.length < 5000) fail('Strona podejrzanie krotka (' + html.length + ' znakow) - mozliwe obciecie pliku');
ok('Rozmiar HTML: ' + html.length + ' znakow');

const missing = REQUIRED.filter(s => !html.includes(s));
if (missing.length) fail('Brak kluczowych fragmentow: ' + missing.join(', '));
ok('Wszystkie kluczowe sekcje obecne: ' + REQUIRED.join(', '));

if (ms > HARD_MS)      fail('Strona laduje sie zbyt wolno: ' + ms + ' ms (limit twardy ' + HARD_MS + ' ms)');
else if (ms > SOFT_MS) warn('Strona wolniejsza niz zwykle: ' + ms + ' ms (prog ' + SOFT_MS + ' ms)');
else                   ok('Czas pobrania: ' + ms + ' ms');

console.log('\nSMOKE TEST OK - ' + url);
process.exit(0);
