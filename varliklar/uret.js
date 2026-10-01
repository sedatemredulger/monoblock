/*  Monoblock — simge ve açılış görselleri üreticisi
 *
 *  Tasarımı HTML olarak kurar, headless Chromium ile istenen ölçülerde
 *  ekran görüntüsü alır. Hazır simge üreticisi kullanmıyoruz.
 *
 *  Kural: 108dp uyarlanabilir tuvalin sadece ortadaki 72dp'si güvenli alan.
 *  Maske (daire/kare/squircle/damla) dışını kırpıyor. Bloklar bu yüzden
 *  tuvalin %66'sına sığdırıldı.
 */
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CIK = __dirname;
const RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const FUME = '#1f2225';       /* koyu tema zemini — oyunla aynı */
const BLOK = '#f2efe9';       /* kırık beyaz blok */
const HI = '#ffffff';
const LO = '#a9a59d';

/* Oyundaki blok çizimiyle birebir aynı kabartma */
function blok(x, y, s, birim) {
  const g = Math.max(1, Math.round(s * 0.02));
  const iç = s - g * 2;
  const e = Math.max(2, Math.round(s * 0.17));
  return `
    <div style="position:absolute;left:${x}${birim};top:${y}${birim};
                width:${s}${birim};height:${s}${birim}">
      <div style="position:absolute;inset:${g}${birim};background:${BLOK}"></div>
      <div style="position:absolute;left:${g}${birim};top:${g}${birim};
                  width:${iç}${birim};height:${e}${birim};background:${HI}"></div>
      <div style="position:absolute;left:${g}${birim};top:${g}${birim};
                  width:${e}${birim};height:${iç}${birim};background:${HI}"></div>
      <div style="position:absolute;left:${g}${birim};top:${g + iç - e}${birim};
                  width:${iç}${birim};height:${e}${birim};background:${LO}"></div>
      <div style="position:absolute;left:${g + iç - e}${birim};top:${g}${birim};
                  width:${e}${birim};height:${iç}${birim};background:${LO}"></div>
      <div style="position:absolute;left:${g + e}${birim};top:${g + e}${birim};
                  width:${iç - e * 2}${birim};height:${iç - e * 2}${birim};background:${BLOK}"></div>
    </div>`;
}

/* Simge motifi: S parçası. Tek renk oyunun kimliği, kabartma da onu anlatıyor.
   Hücreler 3x2 ızgarada:  . X X
                           X X .                                          */
const HUCRELER = [[1, 0], [2, 0], [0, 1], [1, 1]];

function simgeHTML(tuval, doluluk, zemin) {
  /* doluluk: blokların tuvale oranı (uyarlanabilir katmanda 0.52, düz simgede 0.72) */
  const alan = tuval * doluluk;
  const h = alan / 3;                     /* 3 sütun genişliğinde */
  const genislik = h * 3, yukseklik = h * 2;
  const ox = (tuval - genislik) / 2, oy = (tuval - yukseklik) / 2;
  const bloklar = HUCRELER.map(([cx, cy]) => blok(ox + cx * h, oy + cy * h, h, 'px')).join('');
  return `<!doctype html><html><body style="margin:0">
    <div style="position:relative;width:${tuval}px;height:${tuval}px;
                background:${zemin};overflow:hidden">${bloklar}</div>
  </body></html>`;
}

function katmanHTML(tuval, tur) {
  if (tur === 'arkaplan') {
    return `<!doctype html><html><body style="margin:0">
      <div style="width:${tuval}px;height:${tuval}px;background:${FUME}"></div>
    </body></html>`;
  }
  /* ön plan: saydam zemin, bloklar güvenli alanda */
  return simgeHTML(tuval, 0.52, 'transparent');
}

function acilisHTML(g, y, koyu) {
  const zemin = koyu ? FUME : '#e9e9e7';
  const yazi = koyu ? '#eceae6' : '#1a1c1f';
  const soluk = koyu ? '#8f9499' : '#6c7075';
  /* Logo kutusu yüksekliğin %18'i — HTML açılışının ilk karesiyle eşleşsin diye
     ölçüyü YÜKSEKLİKTEN türetiyoruz (CENTER_CROP uzun telefonlarda yükseklikten
     ölçekliyor). */
  const logo = Math.round(y * 0.18);
  const bh = logo / 3;
  const bloklar = HUCRELER.map(([cx, cy]) =>
    blok(cx * bh, cy * bh, bh, 'px')).join('');
  return `<!doctype html><html><body style="margin:0">
    <div style="width:${g}px;height:${y}px;background:${zemin};position:relative;
                display:flex;flex-direction:column;align-items:center;
                justify-content:center;gap:${Math.round(y * 0.035)}px;
                font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
      <div style="position:relative;width:${bh * 3}px;height:${bh * 2}px">${bloklar}</div>
      <div style="font-size:${Math.round(y * 0.030)}px;font-weight:800;
                  letter-spacing:-0.03em;color:${yazi}">MONOBLOCK</div>
      <div style="font-size:${Math.round(y * 0.011)}px;font-weight:700;
                  letter-spacing:0.42em;color:${soluk};text-transform:uppercase">
        CLASSIC FALLING BLOCKS</div>
    </div>
  </body></html>`;
}

/* Android yoğunlukları */
const MIPMAP = [
  ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432]
];
const ACILIS = [
  ['mdpi', 320, 480], ['hdpi', 480, 800], ['xhdpi', 720, 1280],
  ['xxhdpi', 960, 1600], ['xxxhdpi', 1280, 1920]
];

(async () => {
  const tarayici = await chromium.launch();
  const uretilen = [];

  async function cek(html, g, y, hedef, saydam) {
    const sayfa = await tarayici.newPage({
      viewport: { width: g, height: y }, deviceScaleFactor: 1
    });
    await sayfa.setContent(html);
    fs.mkdirSync(path.dirname(hedef), { recursive: true });
    await sayfa.screenshot({ path: hedef, omitBackground: !!saydam });
    await sayfa.close();
    uretilen.push(path.relative(path.join(__dirname, '..'), hedef));
  }

  /* ── uyarlanabilir simge katmanları + eski cihazlar için düz simge ──── */
  for (const [yog, duz, katman] of MIPMAP) {
    const k = path.join(RES, 'mipmap-' + yog);
    await cek(simgeHTML(duz, 0.72, FUME), duz, duz, path.join(k, 'ic_launcher.png'));
    await cek(simgeHTML(duz, 0.72, FUME), duz, duz, path.join(k, 'ic_launcher_round.png'));
    await cek(katmanHTML(katman, 'onplan'), katman, katman,
      path.join(k, 'ic_launcher_foreground.png'), true);
    await cek(katmanHTML(katman, 'arkaplan'), katman, katman,
      path.join(k, 'ic_launcher_background.png'));
  }

  /* ── açılış görüntüleri: açık ve karanlık tema ─────────────────────── */
  /* SIRA ÖNEMLİ: Android niteleyicilerinde yön ÖNCE, gece modu SONRA gelir.
     drawable-port-night-hdpi  DOĞRU
     drawable-night-port-hdpi  GEÇERSİZ → "Invalid resource directory name",
     derleme mergeReleaseResources aşamasında patlar. */
  for (const [yog, g, y] of ACILIS) {
    await cek(acilisHTML(g, y, false), g, y,
      path.join(RES, 'drawable-port-' + yog, 'splash.png'));
    await cek(acilisHTML(g, y, true), g, y,
      path.join(RES, 'drawable-port-night-' + yog, 'splash.png'));
    await cek(acilisHTML(y, g, false), y, g,
      path.join(RES, 'drawable-land-' + yog, 'splash.png'));
    await cek(acilisHTML(y, g, true), y, g,
      path.join(RES, 'drawable-land-night-' + yog, 'splash.png'));
  }
  /* Capacitor varsayılan yolu da doldurulmalı */
  await cek(acilisHTML(480, 800, false), 480, 800, path.join(RES, 'drawable', 'splash.png'));
  await cek(acilisHTML(480, 800, true), 480, 800, path.join(RES, 'drawable-night', 'splash.png'));

  /* ── mağaza görselleri ─────────────────────────────────────────────── */
  await cek(simgeHTML(512, 0.72, FUME), 512, 512, path.join(CIK, 'magaza', 'ikon-512.png'));
  await cek(acilisHTML(1024, 500, true), 1024, 500, path.join(CIK, 'magaza', 'one-cikan-1024x500.png'));
  await cek(simgeHTML(432, 0.52, 'transparent'), 432, 432,
    path.join(CIK, 'kaynak', 'uyarlanabilir-onplan-432.png'), true);
  await cek(katmanHTML(432, 'arkaplan'), 432, 432,
    path.join(CIK, 'kaynak', 'uyarlanabilir-arkaplan-432.png'));

  await tarayici.close();
  console.log(uretilen.length + ' görsel üretildi:');
  uretilen.forEach(y => console.log('  ' + y));
})();
