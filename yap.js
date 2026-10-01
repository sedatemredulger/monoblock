/*  Monoblock — Android paket üreticisi
 *
 *  kaynak/oyun.html dosyasına HİÇ DOKUNMADAN www/index.html üretir.
 *  Oyunu değiştirmek istiyorsan kaynak dosyayı düzenle, sonra `npm run yap`.
 *
 *  KURAL: Buradaki her dönüşüm, aradığı metni bulamazsa HATA FIRLATIR.
 *  Sessizce hiçbir şey yapmayan replace() çağrıları yüzünden
 *  dört ayrı hatayı ancak telefonda fark ettik. Sessiz başarısızlık yok.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const KAYNAK = path.join(KOK, 'kaynak', 'oyun.html');
const CIKTI = path.join(KOK, 'www', 'index.html');

let adim = 0;
function bilgi(m) { console.log('  ' + String(++adim).padStart(2, '0') + '. ' + m); }

/** Metni değiştirir; aranan yoksa hata fırlatır. */
function degistir(metin, ara, yeni, etiket) {
  const once = metin;
  const sonra = metin.split(ara).join(yeni);
  if (sonra === once) {
    throw new Error(
      'DÖNÜŞÜM BOŞA GİTTİ: "' + etiket + '"\n' +
      '  Aranan bulunamadı: ' + JSON.stringify(String(ara).slice(0, 90)) + '\n' +
      '  Kaynak oyun değişmiş olabilir. yap.js bu dönüşümü güncellemeden derleme yapma.'
    );
  }
  bilgi(etiket);
  return sonra;
}

/** Koşul sağlanmazsa hata fırlatır. */
function dogrula(kosul, mesaj) {
  if (!kosul) throw new Error('DOĞRULAMA BAŞARISIZ: ' + mesaj);
  bilgi('doğrulandı — ' + mesaj);
}

console.log('\nMonoblock paket üreticisi\n');

if (!fs.existsSync(KAYNAK)) {
  throw new Error('Kaynak oyun bulunamadı: ' + KAYNAK);
}
let s = fs.readFileSync(KAYNAK, 'utf8');
const kaynakBoyut = s.length;

/* ── 1. Girdi kontrolleri ──────────────────────────────────────────────── */

const disKaynak = s.match(/(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
dogrula(!disKaynak,
  'oyunda dış bağlantı yok (çevrimdışı çalışmalı)' +
  (disKaynak ? ' — BULUNAN: ' + disKaynak.join(', ') : ''));

dogrula(/window\.MB_AD/.test(s),
  'reklam köprüsü kancası (window.MB_AD) kaynakta duruyor');

const surum = (s.match(/var VERSION\s*=\s*"([^"]+)"/) || [])[1];
dogrula(!!surum, 'sürüm numarası okundu: ' + surum);

dogrula(/<title>Monoblock<\/title>/.test(s), 'başlık Monoblock');

/* ── 2. Tam HTML belgesine sar ─────────────────────────────────────────── */
/* Kaynak dosya Artifact biçiminde: doctype/html/head/body yok. WebView için
   tam belge gerekiyor. İlk satır <title>, gerisi gövde. */

const satirlar = s.split('\n');
const baslik = satirlar[0];
dogrula(baslik.trim().startsWith('<title>'), 'ilk satır <title> etiketi');
const govde = satirlar.slice(1).join('\n');

let cikti =
`<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1,user-scalable=no">
<meta name="format-detection" content="telephone=no">
<meta name="color-scheme" content="light dark">
${baslik}
<style>
  /* WebView'da lastik bant kaydırmayı ve uzun basma menüsünü kapat */
  html,body{height:100%;overflow:hidden;overscroll-behavior:none;
            -webkit-touch-callout:none;-webkit-user-select:none;user-select:none}
</style>
</head>
<body>
${govde}
<script src="native.js"></script>
</body>
</html>
`;

bilgi('tam HTML belgesine sarıldı');

/* ── 3. Dönüşümler ─────────────────────────────────────────────────────── */

/* Güvenli alan: oyun zaten env(safe-area-inset-*) kullanıyor, ama Capacitor
   durum çubuğunu WebView'ın üstünde tutuyor. Alt gezinme çubuğu için taban
   payını biraz büyütüyoruz — tuşlar ekranın en dibine yapışmasın. */
cikti = degistir(cikti,
  'calc(env(safe-area-inset-bottom,0px) + 6px)',
  'calc(env(safe-area-inset-bottom,0px) + 14px)',
  'alt güvenli alan payı büyütüldü (gezinme çubuğu)');

/* Sürümü native tarafın da okuyabilmesi için gövdeye işaretle */
cikti = degistir(cikti,
  '<body>',
  '<body data-surum="' + surum + '">',
  'sürüm gövdeye işlendi');

/* ── 4. Çıktı kontrolleri ──────────────────────────────────────────────── */

dogrula(cikti.includes('<script src="native.js"></script>'), 'native.js bağlandı');
dogrula(cikti.includes('<!doctype html>'), 'doctype eklendi');
dogrula(!/(?:src|href)\s*=\s*["']https?:/i.test(cikti), 'çıktıda dış bağlantı yok');
dogrula(cikti.length > kaynakBoyut, 'çıktı kaynaktan büyük (içerik kaybı yok)');

const nativeYol = path.join(KOK, 'www', 'native.js');
dogrula(fs.existsSync(nativeYol), 'www/native.js dosyası mevcut');

const nativeMetin = fs.readFileSync(nativeYol, 'utf8');
const testModu = /var TEST_MODU\s*=\s*(true|false)/.exec(nativeMetin);
dogrula(!!testModu, 'native.js içinde TEST_MODU bayrağı bulundu');

/* ── 5. Yaz ────────────────────────────────────────────────────────────── */

fs.mkdirSync(path.dirname(CIKTI), { recursive: true });
fs.writeFileSync(CIKTI, cikti);

console.log('\n  www/index.html yazıldı — ' + (cikti.length / 1024).toFixed(1) + ' KB');
console.log('  oyun sürümü: ' + surum);
console.log('  TEST_MODU  : ' + testModu[1] +
  (testModu[1] === 'true'
    ? '   (test reklamları — yayına çıkarken false yap)'
    : '   *** CANLI REKLAM — kendi reklamına TIKLAMA ***'));
console.log('');
