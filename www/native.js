/*  Monoblock — Android köprüsü
 *
 *  Görevleri:
 *    1. UMP (GDPR) onay formunu AdMob başlatılmadan ÖNCE göstermek
 *    2. Geçiş reklamını önceden hazırlayıp oyunun istediği anda göstermek
 *    3. Uygulama arka plana alınınca oyunu duraklatmak
 *    4. Açılış ekranını oyun gerçekten hazır olunca kaldırmak
 *
 *  Tasarım kuralı: burada ne olursa olsun OYUN ASLA KİLİTLENMEZ.
 *  Her çağrı zaman aşımlı, her yol geri dönüşlü. Reklam gelmezse oyun devam eder.
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     AYARLAR — yayına çıkmadan önce buradaki üç satır güncellenecek
     ══════════════════════════════════════════════════════════════════════ */

  /* true  : Google'ın test reklamları gösterilir, ekranda "Test Ad" yazar
     false : CANLI reklam. Kendi reklamına tıklamak AdMob hesabını kapattırır. */
  var TEST_MODU = true;

  /* AdMob → Uygulamalar → Monoblock → Reklam birimleri
     Geçiş reklamı birimi (eğik çizgi "/" içerir):                          */
  var GECIS_REKLAM_ID = 'ca-app-pub-3940256099942544/1033173712'; // Google test birimi

  /* Kendi cihazını buraya ekle: uygulamayı bir kez çalıştır, logcat'te
     "Use RequestConfiguration.Builder().setTestDeviceIds(...)" satırını bul,
     içindeki kimliği aşağıya yaz. Böylece TEST_MODU false olsa bile SENİN
     telefonunda test reklamı görünür ve yanlışlıkla tıklama riski kalmaz.  */
  var TEST_CIHAZLARI = [/* 'ABCDEF0123456789ABCDEF0123456789' */];

  /* ══════════════════════════════════════════════════════════════════════ */

  var log = function () {
    try { console.log.apply(console, ['[monoblock]'].concat([].slice.call(arguments))); } catch (e) {}
  };

  function eklenti(ad) {
    try {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[ad]) || null;
    } catch (e) { return null; }
  }
  function nativeMi() {
    try { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
    catch (e) { return false; }
  }

  /** Sözü zaman aşımına bağlar; süre dolarsa reddetmez, yedek değerle döner. */
  function sureli(soz, ms, yedek) {
    return new Promise(function (coz) {
      var bitti = false;
      var zaman = setTimeout(function () {
        if (bitti) return;
        bitti = true;
        log('zaman aşımı (' + ms + 'ms)');
        coz(yedek);
      }, ms);
      Promise.resolve(soz).then(function (d) {
        if (bitti) return;
        bitti = true; clearTimeout(zaman); coz(d);
      }, function (e) {
        if (bitti) return;
        bitti = true; clearTimeout(zaman); log('hata:', e && e.message); coz(yedek);
      });
    });
  }

  if (!nativeMi()) {
    log('tarayıcıda çalışıyor — native köprü devre dışı');
    return;                       /* Tarayıcıda oyunun kendi ekranları çalışır */
  }

  var AdMob = eklenti('AdMob');
  var App = eklenti('App');
  var SplashScreen = eklenti('SplashScreen');
  var StatusBar = eklenti('StatusBar');

  /* ── Açılış ekranı ─────────────────────────────────────────────────────
     launchAutoHide false; kaldırmayı biz yapıyoruz. Oyun kendini kurduktan
     sonra bir kare bekleyip kapatıyoruz, arada beyaz kare görünmesin.      */
  function acilisiKaldir() {
    if (!SplashScreen) return;
    requestAnimationFrame(function () {
      setTimeout(function () {
        try { SplashScreen.hide({ fadeOutDuration: 220 }); } catch (e) {}
      }, 120);
    });
  }
  if (document.readyState === 'complete') acilisiKaldir();
  else window.addEventListener('load', acilisiKaldir);

  /* ── Durum çubuğu ──────────────────────────────────────────────────────
     Oyunun teması değişebiliyor; durum çubuğunu ona uyduruyoruz.          */
  /* TAM EKRAN: durum cubugu tamamen gizleniyor (Emre, 27 Eylul).
     Gizlenince env(safe-area-inset-top) sifira dusuyor, yerlesim kendini
     topluyor. Uygulama arka plandan donunce Android cubugu geri
     getirebiliyor; o yuzden her one gelisde tekrar gizliyoruz. */
  function tamEkran() {
    if (!StatusBar || !StatusBar.hide) return;
    try { StatusBar.hide(); } catch (e) {}
  }
  window.addEventListener('load', function () { setTimeout(tamEkran, 250); });
  if (App && App.addListener) {
    try {
      App.addListener('appStateChange', function (durum) {
        if (durum && durum.isActive) setTimeout(tamEkran, 120);
      });
    } catch (e) {}
  }

  function durumCubugu() {
    if (!StatusBar) return;
    try {
      var koyu = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg').trim();
      StatusBar.setBackgroundColor({ color: koyu || '#1f2225' });
      var acikTema = document.documentElement.getAttribute('data-theme') === 'light' ||
        (!document.documentElement.getAttribute('data-theme') &&
          !window.matchMedia('(prefers-color-scheme: dark)').matches);
      StatusBar.setStyle({ style: acikTema ? 'LIGHT' : 'DARK' });
    } catch (e) {}
  }
  window.addEventListener('load', function () { setTimeout(durumCubugu, 300); });
  try {
    new MutationObserver(durumCubugu).observe(document.documentElement,
      { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) {}

  /* ── Arka plana alınınca duraklat ──────────────────────────────────────
     Oyunun kendi duraklatma yolunu kullanıyoruz ki müzik de sussun.       */
  if (App && App.addListener) {
    try {
      App.addListener('appStateChange', function (durum) {
        if (durum && durum.isActive) return;
        try {
          var S = window.__t && window.__t.S;
          if (S && S.phase === 'play') {
            var d = document.getElementById('pause');
            if (d) d.click();
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════════════════
     REKLAM
     ══════════════════════════════════════════════════════════════════════ */

  if (!AdMob) {
    log('AdMob eklentisi yok — reklamsız devam');
    return;
  }

  var hazir = false;         /* initialize tamamlandı mı */
  var yuklu = false;         /* gösterilmeye hazır bir geçiş reklamı var mı */
  var yukleniyor = false;

  /* 1) ÖNCE onay, SONRA initialize. Sırası önemli: onay alınmadan reklam
        isteği göndermek AB/İngiltere/İsviçre'de politika ihlali.          */
  function onayAl() {
    if (!AdMob.requestConsentInfo) return Promise.resolve();
    var istek = { tagForUnderAgeOfConsent: false };
    if (TEST_MODU && TEST_CIHAZLARI.length) {
      istek.testDeviceIdentifiers = TEST_CIHAZLARI;
      /* Formu Türkiye'den de görebilmek için:
         istek.debugGeography = 'EEA';  */
    }
    return sureli(AdMob.requestConsentInfo(istek), 8000, null).then(function (bilgi) {
      if (!bilgi) { log('onay bilgisi alınamadı'); return; }
      log('onay durumu:', bilgi.status, 'form var mı:', bilgi.isConsentFormAvailable);
      if (bilgi.status === 'REQUIRED' && bilgi.isConsentFormAvailable && AdMob.showConsentForm) {
        return sureli(AdMob.showConsentForm(), 60000, null).then(function (sonuc) {
          log('onay formu sonucu:', sonuc && sonuc.status);
        });
      }
    });
  }

  function baslat() {
    return onayAl().then(function () {
      return sureli(AdMob.initialize({
        initializeForTesting: TEST_MODU,
        testingDevices: TEST_CIHAZLARI
      }), 10000, null);
    }).then(function () {
      hazir = true;
      log('AdMob hazır · test modu:', TEST_MODU);
      onYukle();
    });
  }

  /* 2) Reklamı önceden yükle ki oyun sonunda bekleme olmasın */
  function onYukle() {
    if (!hazir || yuklu || yukleniyor || !AdMob.prepareInterstitial) return;
    yukleniyor = true;
    sureli(AdMob.prepareInterstitial({ adId: GECIS_REKLAM_ID, isTesting: TEST_MODU }), 15000, null)
      .then(function (sonuc) {
        yukleniyor = false;
        yuklu = !!sonuc || true;   /* eklenti bazı sürümlerde boş döner */
        log('geçiş reklamı hazır');
      });
  }

  /* Kapanma ve hata olaylarını dinle: reklam kapanınca oyuna dönülmeli */
  var kapanisDinleyicileri = [];
  function olayaBagla(ad, fn) {
    if (!AdMob.addListener) return;
    try { kapanisDinleyicileri.push(AdMob.addListener(ad, fn)); } catch (e) {}
  }

  /* 3) Oyunun çağırdığı kanca. Oyun tarafındaki sözleşme:
        window.MB_AD(bitti) — reklam kapanınca ya da gösterilemezse bitti() */
  window.MB_AD = function (bitti) {
    var cagrildi = false;
    function bir() {
      if (cagrildi) return;
      cagrildi = true;
      yuklu = false;
      setTimeout(onYukle, 800);       /* bir sonraki tur için yeniden yükle */
      try { bitti(); } catch (e) {}
    }

    /* Ne olursa olsun 10 saniyede oyuna dön */
    var emniyet = setTimeout(bir, 10000);
    var birVeTemizle = function () { clearTimeout(emniyet); bir(); };

    if (!hazir || !yuklu || !AdMob.showInterstitial) {
      log('reklam hazır değil — atlanıyor');
      birVeTemizle();
      onYukle();
      return;
    }

    olayaBagla('interstitialAdDismissed', birVeTemizle);
    olayaBagla('interstitialAdFailedToShow', birVeTemizle);

    sureli(AdMob.showInterstitial(), 9000, null).then(function () {
      /* Bazı sürümlerde showInterstitial reklam KAPANINCA çözülüyor,
         bazılarında GÖSTERİLİNCE. İkisini de karşılamak için hem burada
         hem olay dinleyicisinde bir() çağırıyoruz; bir() tek sefer çalışır. */
      setTimeout(birVeTemizle, 400);
    });
  };

  /* Oyunun kendi yer tutucu reklam ekranı native tarafta kullanılmasın diye
     MB_AD tanımlanmış olması yeterli — oyun onu tercih ediyor. */

  baslat().catch(function (e) { log('başlatma hatası:', e && e.message); });

  log('köprü kuruldu · oyun sürümü', document.body && document.body.dataset && document.body.dataset.surum);
})();
