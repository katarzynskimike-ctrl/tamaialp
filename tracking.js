/* ============================================================================
   TAMAIA — warstwa pomiarowa dla GTM (dataLayer)
   ----------------------------------------------------------------------------
   Zdarzenia i parametry wg briefu agencji:
   05-Marketing/PROMPT-sledzenie-konwersji-tamaia-pl.md

   TRZY ZASADY, KTORE TEN PLIK EGZEKWUJE KONSTRUKCYJNIE, NIE KOMENTARZEM:

   1. ZERO DANYCH OSOBOWYCH. Do dataLayer trafiaja wylacznie klucze z listy
      DOZWOLONE, a seats/step sa rzutowane na liczbe. Imie, e-mail, telefon,
      nazwa gabinetu, miasto i NIP nie maja jak opuscic strony ta droga —
      nawet gdy ktos poda je przez pomylke w wywolaniu.

   2. KONWERSJA TYLKO Z GALEZI SUKCESU. tamaiaDL.lead() wywoluja WYLACZNIE
      dwa haki wpiete w odpowiedz serwera (kreator i brama na dokumentach).
      Ten plik nie odpala generate_lead z zadnego klikniecia ani ekranu.
      Powod jest konkretny: kreator pokazuje ekran „dziekujemy" ZANIM wysle
      zgloszenie, wiec ten ekran nie jest dowodem niczego.

   3. KROK FORMULARZA LICZY SIE PO PRZEJSCIU, NIE PO KLIKNIECIU. form_step
      pchamy dopiero, gdy kreator faktycznie zmienil krok — proba, ktora
      odbila sie od walidacji, nie jest postepem.

   Istniejacy pomiar (Vercel Web Analytics, bezciasteczkowy) zostaje nietkniety
   i dziala rownolegle. Jego zdarzenie lead_submit liczy PROBY wysylki, wiec
   bedzie wyzsze niz generate_lead. To nie usterka, tylko inna definicja.
   ============================================================================ */

(function () {
  'use strict';

  /* --- kolejka GTM ------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];

  /* --- wariant strony ----------------------------------------------------
     Trzy blizniacze strony niosa te sama maszyne. Bez tego parametru sa
     w GA4 nie do odroznienia i dwie trzecie ruchu wyglada jak jedna. */
  var VARIANT = (function () {
    var p = location.pathname;
    if (p === '/en' || p.indexOf('/en/') === 0) return 'en';
    if (p === '/recepcja' || p.indexOf('/recepcja/') === 0) return 'recepcja';
    return 'pl';
  })();

  /* --- bramka na parametry ----------------------------------------------- */
  var DOZWOLONE = ['placement', 'lead_type', 'plan_id', 'plan_name', 'seats', 'method', 'step'];
  var PLACEMENTS = ['header_nav', 'hero', 'sticky_bar', 'exit_popup', 'pricing_card',
                    'cta_section', 'footer', 'chat', 'legal_gate', 'calculator', 'content_page'];
  var LEAD_TYPES = ['test_14dni', 'demo', 'zamowienie', 'pytanie', 'dokument', 'inne'];
  var PLAN_IDS   = ['plus', 'pro', 'premium', 'brak'];

  function liczba(v) {
    var n = parseInt(v, 10);
    return (isFinite(n) && n >= 0 && n < 100000) ? n : undefined;
  }

  function push(event, params) {
    var o = { event: event, page_variant: VARIANT };
    var k, v;
    for (k in (params || {})) {
      if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
      if (DOZWOLONE.indexOf(k) === -1) continue;           // klucz spoza listy wypada
      v = params[k];
      if (v === null || v === undefined || v === '') continue;
      if (k === 'seats' || k === 'step') { v = liczba(v); if (v === undefined) continue; }
      else if (k === 'placement' && PLACEMENTS.indexOf(v) === -1) v = 'content_page';
      else if (k === 'lead_type' && LEAD_TYPES.indexOf(v) === -1) v = 'inne';
      else if (k === 'plan_id' && PLAN_IDS.indexOf(v) === -1) v = 'brak';
      else if (typeof v !== 'number') v = String(v).slice(0, 60);
      o[k] = v;
    }
    window.dataLayer.push(o);
    return o;
  }

  /* --- gdzie na stronie -------------------------------------------------- */
  function placementOf(el) {
    if (!el || !el.closest) return domyslnePlacement();
    if (el.closest('#stickyCta')) return 'sticky_bar';
    if (el.closest('#exitPopup')) return 'exit_popup';
    if (el.closest('#legalGate')) return 'legal_gate';
    if (el.closest('#maiaPop') || el.closest('#maia-chat') || el.id === 'maiaFloat') return 'chat';
    if (el.closest('#cta')) return 'cta_section';
    if (el.closest('#pricing') || el.closest('.pricing')) return 'pricing_card';
    if (el.closest('footer')) return 'footer';
    /* Strony tresciowe maja goly <nav>, strona glowna <nav class="nav">,
       a /oferta i /kalkulator pasek <header class="top">. Wszystkie trzy to
       ta sama rzecz dla pomiaru: nawigacja u gory. */
    if (el.closest('nav') || el.closest('.nav') || el.closest('header.top')) return 'header_nav';
    if (el.closest('header.hero') || el.closest('.hero')) return 'hero';
    return domyslnePlacement();
  }

  function domyslnePlacement() {
    var p = location.pathname;
    if (p.indexOf('kalkulator') > -1 || p.indexOf('calculator') > -1) return 'calculator';
    return 'content_page';
  }

  /* --- zamiar odwiedzajacego ---------------------------------------------
     Kreator sam nie pyta, po co ktos przyszedl. Zapamietujemy ostatni
     sygnal: kliknieta karta pakietu, wyjscie z okna „14 dni", brama na
     dokumentach. Domyslnie „zamowienie" — bo naglowek sekcji formularza
     brzmi „Zamow swoj pakiet". */
  var intent = 'zamowienie';
  var planId = 'brak';

  function ustawIntent(t)  { if (LEAD_TYPES.indexOf(t) > -1) intent = t; }
  function ustawPlan(p)    { p = String(p || '').toLowerCase(); if (PLAN_IDS.indexOf(p) > -1) planId = p; }

  function planZeStanu() {
    /* orderState zyje globalnie na stronach z cennikiem i wie, ktora karte
       odwiedzajacy wybral suwakiem/klikiem — czytamy je, gdy nikt nie kliknal
       karty wprost. */
    try {
      if (typeof orderState === 'object' && orderState && orderState.plan) {
        var p = String(orderState.plan).toLowerCase();
        if (PLAN_IDS.indexOf(p) > -1) return p;
      }
    } catch (e) {}
    return planId;
  }

  function seatsZeStanu() {
    var pole = document.querySelector('#wizardForm [name="receptionCount"]');
    if (pole && pole.value) return liczba(pole.value);
    try { if (typeof orderState === 'object' && orderState) return liczba(orderState.count); } catch (e) {}
    return undefined;
  }

  /* ========================================================================
     KONWERSJA — wywolywana WYLACZNIE z galezi sukcesu w index.html
     ======================================================================== */
  window.tamaiaDL = {
    lead: function (o) {
      o = o || {};
      push('generate_lead', {
        lead_type: o.lead_type || intent,
        plan_id: o.plan_id || planZeStanu(),
        seats: (o.seats !== undefined ? o.seats : seatsZeStanu()),
        placement: o.placement || 'cta_section'
      });
    },
    /* Kreator, gdy serwer odmowil, otwiera klienta pocztowego. To NIE jest
       konwersja — zgloszenie moze nigdy nie zostac wyslane. Osobne zdarzenie,
       zeby ta luka byla widoczna w danych, a nie zamieciona pod generate_lead. */
    leadFallback: function (o) {
      o = o || {};
      push('lead_fallback_mailto', { lead_type: o.lead_type || intent, placement: o.placement || 'cta_section' });
    },
    /* Wolane przez setIntent() ze strony (okno przy wyjsciu). Tlumaczy etykiety
       ze strony na slownik lead_type. Sam NIC nie pcha do kolejki — od tego sa
       nasluchy; to wylacznie zapamietanie, po co odwiedzajacy przyszedl. */
    setIntent: function (etykieta) {
      var e = String(etykieta || '').toLowerCase();
      if (e.indexOf('test') > -1 || e.indexOf('trial') > -1) ustawIntent('test_14dni');
      else if (e === 'buy' || e.indexOf('zam') > -1) ustawIntent('zamowienie');
      else if (e === 'info' || e.indexOf('pyta') > -1) ustawIntent('pytanie');
    },
    push: push,
    _stan: function () { return { variant: VARIANT, intent: intent, plan: planZeStanu(), seats: seatsZeStanu() }; }
  };

  /* ========================================================================
     NASLUCHY
     ======================================================================== */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    /* --- kontakt bezposredni: telefon i e-mail --- */
    var a = t.closest('a[href]');
    if (a) {
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0)    { push('contact', { method: 'phone', placement: placementOf(a) }); return; }
      if (href.indexOf('mailto:') === 0) { push('contact', { method: 'email', placement: placementOf(a) }); return; }
    }

    /* --- karta pakietu: PLUS / PRO / PREMIUM --- */
    var karta = t.closest('[data-plan]');
    if (karta) {
      var id = String(karta.getAttribute('data-plan') || '').toLowerCase();
      ustawPlan(id);
      ustawIntent('zamowienie');
      push('view_plan', { plan_id: id, plan_name: karta.getAttribute('data-plan'), placement: 'pricing_card' });
      return;
    }

    /* --- okno przy wyjsciu: „Aktywuj test 14 dni" --- */
    if (t.closest('#exitPopup') && a) {
      ustawIntent('test_14dni');
      push('begin_reservation', { lead_type: 'test_14dni', plan_id: planZeStanu(), placement: 'exit_popup' });
      return;
    }

    /* --- czat MAIA: pierwsze wyslanie wiadomosci --- */
    if (t.closest('#mcSend') || t.closest('#mpSend') || t.closest('.mc-chip')) { czatWyslany(); return; }

    /* --- CTA prowadzace do formularza lub cennika ---
       Trzy rzeczy udaja CTA i musza wypasc, bo inaczej zawyzaja miare:
       - „Zaloguj sie" prowadzi do app.tamaia.pl, ale to WRACAJACY klient, nie nowy;
       - odnosniki do Regulaminu/Polityki/DPA prowadza pod ten sam adres, a sa
         obowiazkiem informacyjnym, nie zachęta;
       - te same odnosniki wewnatrz formularza zgody nie sa nawigacja po ofercie. */
    if (a) {
      var h = a.getAttribute('href') || '';
      var napis = (a.textContent || '').trim();
      var logowanie = (a.className && String(a.className).indexOf('nav-login') > -1) || /zaloguj|log\s?in|sign\s?in/i.test(napis);
      var dokumentPrawny = /\/(regulamin|polityka|dpa)(\b|$)/.test(h);
      var wFormularzu = !!a.closest('form') || !!a.closest('#legalGate');
      var prowadziDoOferty = h.indexOf('#cta') > -1 || h.indexOf('/cennik') > -1 || h.indexOf('app.tamaia.pl') > -1;
      if (prowadziDoOferty && !logowanie && !dokumentPrawny && !wFormularzu) {
        push('select_cta', { placement: placementOf(a) });
      }
    }
  }, true);

  /* --- czat: Enter w polu tez wysyla --- */
  var czatFlaga = false;
  function czatWyslany() {
    if (czatFlaga) return;
    czatFlaga = true;
    push('contact', { method: 'chat', placement: 'chat' });
  }
  ['mcInput', 'mpInput'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey && (el.value || '').trim()) czatWyslany();
    });
  });

  /* --- brama na dokumentach prawnych: otwarcie formularza --- */
  (function () {
    var brama = document.getElementById('legalGate');
    if (!brama || !window.MutationObserver) return;
    var bylo = brama.classList.contains('show');
    new MutationObserver(function () {
      var jest = brama.classList.contains('show');
      if (jest && !bylo) {
        ustawIntent('dokument');
        push('begin_reservation', { lead_type: 'dokument', plan_id: planZeStanu(), placement: 'legal_gate' });
      }
      bylo = jest;
    }).observe(brama, { attributes: true, attributeFilter: ['class'] });
  })();

  /* --- kreator: rozpoczecie i przejscia miedzy krokami --- */
  (function () {
    var form = document.getElementById('wizardForm');
    if (!form) return;

    var zaczete = false;
    form.addEventListener('focusin', function () {
      if (zaczete) return;
      zaczete = true;
      push('begin_reservation', { lead_type: intent, plan_id: planZeStanu(), placement: 'cta_section' });
    });

    function biezacyKrok() {
      var a = document.querySelector('.wizard-step.active');
      return a ? liczba(a.getAttribute('data-step')) : undefined;
    }

    var oryginal = window.wizardNext;
    if (typeof oryginal === 'function') {
      window.wizardNext = function () {
        var przed = biezacyKrok();
        var wynik = oryginal.apply(this, arguments);
        var po = biezacyKrok();
        /* Tylko faktyczne przejscie. Proba odbita przez walidacje nie jest postepem. */
        if (przed !== undefined && po !== undefined && po > przed) {
          push('form_step', { step: przed, placement: 'cta_section' });
        }
        return wynik;
      };
    }
  })();

  /* --- kalkulator zwrotu: pierwszy wynik wywolany przez odwiedzajacego --- */
  (function () {
    var p = location.pathname;
    if (p.indexOf('kalkulator') === -1 && p.indexOf('calculator') === -1) return;
    var odpalone = false;
    function raz() {
      if (odpalone) return;
      odpalone = true;
      push('use_calculator', { placement: 'calculator' });
    }
    document.addEventListener('input', function (e) {
      if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) raz();
    }, true);
    document.addEventListener('change', function (e) {
      if (e.target && /^(INPUT|SELECT)$/.test(e.target.tagName)) raz();
    }, true);
  })();

  /* --- wejscie na strone oferty/cennika liczy sie jak otwarcie oferty --- */
  (function () {
    var p = location.pathname;
    if (/\/cennik|\/oferta|\/en\/offer/.test(p)) {
      push('view_plan', { plan_id: planZeStanu(), placement: 'pricing_card' });
    }
  })();

})();
