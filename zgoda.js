/* ============================================================================
   TAMAIA — okno zgody na ciasteczka + Consent Mode v2
   ----------------------------------------------------------------------------
   Do 05.09.2026 strona NIE MIALA dzialajacego okna zgody: HTML i logika byly
   zakomentowane („TYMCZASOWO WYLACZONY"). Uchodzilo to na sucho, bo jedyny
   pomiar — Vercel Web Analytics — jest bezciasteczkowy. Z chwila wpiecia GTM
   (GA4, piksel Meta) zgoda przestaje byc opcjonalna.

   TRZY RZECZY, KTORE TEN PLIK ROBI INACZEJ NIZ STARY, ZAKOMENTOWANY BANNER:

   1. ODMOWA JEST ROWNIE LATWA JAK ZGODA. Stary CSS dawal „Akceptuje" cale
      wolne miejsce (flex:1), zlote tlo i pogrubienie, a „Tylko niezbedne"
      kurczyl do tresci i wyszarzal. To wzorzec ciemny — i gorszy niz brak
      okna, bo tworzy pozor zgodnosci. Tu oba przyciski maja te sama
      szerokosc, ten sam rozmiar pisma i te sama grubosc.

   2. NIC NIE DZIEJE SIE BEZ DECYZJI. Consent Mode startuje z ODMOWA
      wszystkiego poza bezpieczenstwem (ustawiane w <head>, przed GTM).
      Zamkniecie okna klawiszem Esc ani klikniecie obok NIE JEST zgoda —
      okno nie ma nawet krzyzyka. Milczenie to odmowa.

   3. STYLE SA WLASNE, NIE ZE STRONY. Dwanascie z pietnastu stron nie ma
      zmiennych --gold-1 ani --warm-border, wiec banner oparty na nich
      rozjechalby sie wszedzie poza strona glowna. Kolory sa wpisane wprost.

   Wycofanie zgody musi byc tak samo latwe jak jej udzielenie — stad odnosnik
   „Ustawienia ciasteczek" dokladany do stopki kazdej strony.
   ============================================================================ */

(function () {
  'use strict';

  var KLUCZ = 'cookieDecision';          // nazwa z poprzedniej wersji — nie zmieniamy,
                                          // zeby decyzje sprzed wylaczenia bannera ocalaly
  var ROK = 60 * 60 * 24 * 365;

  var ANG = (location.pathname === '/en' || location.pathname.indexOf('/en/') === 0);

  var T = ANG ? {
    tytul: 'Cookies and measurement',
    tresc: 'We use cookies to measure traffic and how well our ads work. Until you agree, we run no analytics or marketing tools at all. Details in our ',
    polityka: 'Privacy Policy',
    tak: 'Accept all',
    nie: 'Essential only',
    stopka: 'Cookie settings',
    etykieta: 'Cookie consent'
  } : {
    tytul: 'Ciasteczka i pomiar',
    tresc: 'Używamy ciasteczek, żeby liczyć ruch i skuteczność reklam. Dopóki nie wyrazisz zgody, nie uruchamiamy żadnych narzędzi analitycznych ani marketingowych. Szczegóły w ',
    polityka: 'Polityce prywatności',
    tak: 'Akceptuję wszystkie',
    nie: 'Tylko niezbędne',
    stopka: 'Ustawienia ciasteczek',
    etykieta: 'Zgoda na ciasteczka'
  };

  /* --- pamiec decyzji: localStorage z zapasem na ciasteczko --- */
  function odczytaj() {
    try { var ls = localStorage.getItem(KLUCZ); if (ls) return ls; } catch (e) {}
    var m = document.cookie.match(/(?:^|;\s*)cookieDecision=([^;]+)/);
    return m ? m[1] : null;
  }
  function zapisz(v) {
    try { localStorage.setItem(KLUCZ, v); } catch (e) {}
    try { document.cookie = 'cookieDecision=' + v + '; max-age=' + ROK + '; path=/; SameSite=Lax'; } catch (e) {}
  }

  /* --- sygnal do GTM ---
     gtag() to tutaj WYLACZNIE nakladka na dataLayer.push (definiowana w <head>),
     a nie wywolanie czegokolwiek u Google — taki jest udokumentowany ksztalt
     Consent Mode. Zadnych bezposrednich wywolan gtag/fbq jako znacznikow. */
  function zglos(zgoda) {
    var stan = zgoda ? 'granted' : 'denied';
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: stan,
        ad_user_data: stan,
        ad_personalization: stan,
        analytics_storage: stan,
        functionality_storage: stan,
        personalization_storage: stan
      });
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'consent_update', consent_state: zgoda ? 'granted' : 'denied' });
  }

  /* --- style: samowystarczalne, bez zmiennych ze strony --- */
  function style() {
    if (document.getElementById('tamaiaZgodaStyl')) return;
    var s = document.createElement('style');
    s.id = 'tamaiaZgodaStyl';
    s.textContent = [
      '#tamaiaZgoda{position:fixed;left:20px;bottom:20px;max-width:460px;background:#FFFFFF;',
      'border:1px solid #E8E1CF;border-radius:12px;padding:20px 22px;z-index:2147483000;',
      'box-shadow:0 20px 50px rgba(0,0,0,.22);font-family:inherit;color:#1B2C4F;}',
      '#tamaiaZgoda h4{margin:0 0 8px;font-size:1rem;line-height:1.3;color:#1B2C4F;font-weight:700;}',
      '#tamaiaZgoda p{margin:0 0 16px;font-size:.875rem;line-height:1.55;color:#41506A;}',
      '#tamaiaZgoda a{color:#1B2C4F;text-decoration:underline;}',
      /* Oba przyciski: ta sama szerokosc, ten sam rozmiar pisma, ta sama grubosc.
         Rozne sa tylko kolory — odmowa NIE MOZE byc trudniejsza od zgody. */
      '#tamaiaZgoda .tz-btns{display:flex;gap:10px;}',
      /* min-height 44px: minimalny cel dotyku. Przy 41px zmierzonych na telefonie
         przycisk byl ponizej progu. */
      '#tamaiaZgoda button{flex:1 1 0;min-width:0;min-height:44px;padding:12px 14px;border-radius:8px;',
      'font-family:inherit;font-size:.9rem;font-weight:700;line-height:1.2;cursor:pointer;}',
      '#tamaiaZgoda .tz-tak{background:#C9A24A;color:#1B2C4F;border:1px solid #C9A24A;}',
      '#tamaiaZgoda .tz-nie{background:#FFFFFF;color:#1B2C4F;border:1px solid #1B2C4F;}',
      '#tamaiaZgoda button:hover{filter:brightness(.96);}',
      '#tamaiaZgoda button:focus-visible{outline:3px solid #1B2C4F;outline-offset:2px;}',
      '.tz-link{cursor:pointer;}',
      '@media(max-width:600px){#tamaiaZgoda{left:10px;right:10px;bottom:10px;max-width:none;padding:16px;}',
      '#tamaiaZgoda .tz-btns{flex-direction:column;}',
      /* Na telefonie trzy elementy zakotwiczone u dolu nachodza na siebie:
         zmierzone — okno zgody nachodzilo na dymek MAIA. Dopoki trwa decyzja,
         chowamy dymek i pasek CTA; wracaja natychmiast po kliknieciu, jednym
         albo drugim. Jedna decyzja naraz. */
      'html.tz-otwarte #maiaFloat,html.tz-otwarte #stickyCta{display:none!important;}}'
    ].join('');
    document.head.appendChild(s);
  }

  var okno = null;

  function pokaz() {
    if (okno) { okno.style.display = 'block'; document.documentElement.classList.add('tz-otwarte'); return; }
    style();
    okno = document.createElement('div');
    okno.id = 'tamaiaZgoda';
    okno.setAttribute('role', 'dialog');
    okno.setAttribute('aria-label', T.etykieta);
    okno.innerHTML =
      '<h4></h4><p></p><div class="tz-btns">' +
      '<button type="button" class="tz-tak"></button>' +
      '<button type="button" class="tz-nie"></button></div>';
    okno.querySelector('h4').textContent = T.tytul;
    var p = okno.querySelector('p');
    p.textContent = T.tresc;
    var a = document.createElement('a');
    a.href = 'https://app.tamaia.pl/polityka';
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = T.polityka;
    p.appendChild(a);
    p.appendChild(document.createTextNode('.'));
    var tak = okno.querySelector('.tz-tak'); tak.textContent = T.tak;
    var nie = okno.querySelector('.tz-nie'); nie.textContent = T.nie;
    tak.addEventListener('click', function () { zdecyduj('accepted'); });
    nie.addEventListener('click', function () { zdecyduj('declined'); });
    document.body.appendChild(okno);
    document.documentElement.classList.add('tz-otwarte');
    tak.focus();
  }

  function zdecyduj(v) {
    zapisz(v);
    zglos(v === 'accepted');
    if (okno) okno.style.display = 'none';
    document.documentElement.classList.remove('tz-otwarte');
  }

  /* --- odnosnik do zmiany decyzji, dokladany do stopki kazdej strony --- */
  function odnosnikWStopce() {
    var st = document.querySelector('footer');
    if (!st || document.querySelector('.tz-link')) return;
    var a = document.createElement('a');
    a.className = 'tz-link';
    a.setAttribute('role', 'button');
    a.setAttribute('tabindex', '0');
    a.textContent = T.stopka;
    a.addEventListener('click', function (e) { e.preventDefault(); pokaz(); });
    a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pokaz(); } });
    var nav = st.querySelector('nav') || st;
    nav.appendChild(document.createTextNode(' · '));
    nav.appendChild(a);
  }

  window.tamaiaZgoda = {
    otworz: pokaz,
    stan: function () { return odczytaj() || 'brak'; }
  };

  function start() {
    odnosnikWStopce();
    /* Brak decyzji = brak zgody. Okno pokazujemy, ale zadne narzedzie
       nie ruszy, dopoki ktos nie kliknie — Consent Mode stoi na 'denied'. */
    if (!odczytaj()) pokaz();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
