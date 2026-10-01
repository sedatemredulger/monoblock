# Monoblock — kapalı teste çıkış

*21 Eylül 2026. Amaç: 12 testçi × 14 gün saatini bir an önce başlatmak.
Geliştirmeler sonraya.*

Sürüm: **1.2.0** · versionCode **1** · paket **com.dukagames.monoblock**

---

## Android projesi TAM

Devir paketinde native proje yoktu, `npx cap add android` + iki elle yama
gerekiyordu. **Hepsini burada yaptım.** `android/` klasörü eksiksiz geliyor;
sen yalnızca derleyeceksin.

Yapılanlar:
- `cap add android` çalıştırıldı, hazır simge ve açılış görselleri geri kondu
- `variables.gradle` Capacitor 8.5'in güncel varsayılanları (devir paketindeki
  eski androidx sürümleri yerine — bu set senin makinende derlenmiş, kanıtlanmış)
- Manifest: dikey kilit, AdMob uygulama kimliği, AD_ID izni
- `build.gradle`: imzalama bloğu (keystore.properties yoksa imzasız derler), versionCode 1, versionName 1.2.0
- Yatay açılış görselleri Capacitor'un beyaz varsayılanı yerine bizimkiyle değişti
- Oyun içi sürüm 1.2 → **1.2.0** (üç katmanlı kural)

Burada derleyip deneyemedim: Android SDK'yı indirmeme ağ izni yok. Yapılandırmayı
halihazırda senin makinende derlenen bir Capacitor 8.5 projesiyle satır satır
karşılaştırdım; fark yalnızca paket adı ve sürüm.

### Reklam: şimdilik Google'ın test kimlikleri

| Yer | Değer |
|---|---|
| Manifest — uygulama kimliği | `ca-app-pub-3940256099942544~3347511713` (Google örneği) |
| native.js — geçiş birimi | `ca-app-pub-3940256099942544/1033173712` (Google örneği) |
| `TEST_MODU` | `true` |

Kapalı test için yeterli. Canlıya çıkmadan önce AdMob'da Monoblock uygulamasını
açıp iki kimliği bana ver, ben değiştiririm (yeni versionCode ile).

---

## 0. Klasör düzeni

```
C:\dukagames\Monoblock\
├── monoblock.keystore      ← anahtar BURADA, sürüm klasörlerinin DIŞINDA
└── v1.2.0\                 ← bu paket (her sürüm kendi klasörüne)
```

Paketi `C:\dukagames\Monoblock` içine aç; doğrudan `v1.2.0` klasörü çıkar.
Anahtar sürüm klasörünün dışında duruyor, böylece yeni sürüm açtığında
yerinden oynamıyor. Yeni sürümde yalnızca `keystore.properties` dosyasını
eski sürümün `android\` klasöründen yenisine kopyalarsın.

## 1. Yeni keystore — bu uygulamaya ÖZEL

```
keytool -genkey -v -keystore C:/dukagames/Monoblock/monoblock.keystore -alias monoblock -keyalg RSA -keysize 2048 -validity 10000
```

- `android/keystore.properties.ornek` → `android/keystore.properties` olarak kopyala, doldur
- Keystore'u **iki yere** yedekle (biri çevrimdışı). Kaybedersen uygulamayı bir daha güncelleyemezsin
- Parolaları ve dosyayı bana gönderme

## 2. Derleme

```
cd C:\dukagames\Monoblock\v1.2.0
npm install
npx cap sync android
cd android
gradlew.bat bundleRelease
```

Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`

`npx cap add android` **çalıştırma** — klasör hazır, üzerine yazar.

---

## 3. Play Console — uygulamayı oluştur

**All apps → Create app**

| Alan | Değer |
|---|---|
| App name | `Monoblock: Block Puzzle` |
| Default language | English (United States) |
| App or game | **Game** |
| Free or paid | **Free** — geri dönüşsüz |
| Beyanlar | ikisini de işaretle |

## 4. App content

Sol menü → **Monitor and improve → Policy and programs → App content**
(liste en dipte).

| Bölüm | Cevap |
|---|---|
| Privacy policy | `https://sedatemredulger.github.io/monoblock-site/privacy.html` |
| App access | All functionality is available without special access |
| Ads | **Yes** |
| Content rating | Bütün sorulara **No** — dijital satın alma dahil. Beklenen: PEGI 3 / Everyone |
| Target audience | **13-15, 16-17, 18+** · Designed for children: **No** |
| Government / Financial / Health / News / COVID | No / hiçbiri |

> **Hedef kitlede 13 altını İŞARETLEME.** Oyun Families programına girer; orada
> reklam kimliği toplanamaz, AdMob kurulumu geçersiz olur.

### Data safety

| Soru | Cevap |
|---|---|
| Collects or shares user data? | **Yes** (AdMob reklam kimliği) |
| Encrypted in transit? | **Yes** |
| Account creation | My app does not allow users to create an account |
| Data deletion request? | **No** — sunucumuz yok, tuttuğumuz veri yok |
| Veri türleri | **Yalnızca** Device or other IDs → Device or other IDs |
| O tür için | Collected **Yes** · Shared **Yes** · Ephemeral **No** · Required · Amaç: yalnızca **Advertising or marketing** |

Özet ekranında **tek satır** görmelisin: Device or other IDs. Konum, App
activity, Analytics — hiçbiri işaretlenmeyecek.

**Önce gizlilik sayfalarını yükle — GitHub Pages'e, artduka.com'a DEĞİL.**
Gizlilik politikası alan adında değil GitHub'da duruyor: alan adının süresi
dolarsa Play'de kırık link olur, bu da politika ihlali sayılır. GitHub Pages
ücretsiz ve süresi dolmuyor.

1. GitHub'da **public** yeni bir depo aç: `monoblock-site`
2. **Add file → Upload files** → `site/` klasöründeki üç dosyayı sürükle:
   `index.html`, `privacy.html`, `gizlilik.html` → **Commit changes**
3. **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main`,
   klasör: `/ (root)` → **Save**
4. 1-2 dakika bekle, şu adresi aç:
   `https://sedatemredulger.github.io/monoblock-site/privacy.html`

Adres açılmıyorsa Play formu kabul etmez.

## 5. Store listing

| Alan | Değer |
|---|---|
| App name | `Monoblock: Block Puzzle` (23/30) |
| Short description | `Block puzzle with no clock — fit, clear, repeat.` (48/80) |
| Category | **Puzzle** |
| App icon | `varliklar/magaza/ikon-512.png` |
| Feature graphic | `varliklar/magaza/one-cikan-1024x500.png` |
| Phone screenshots | `varliklar/magaza/ekran-1…5.png` (1080×1920, gerçek oyundan) |
| Email | `dukagames.support@gmail.com` |
| Website | `https://artduka.com` |

### Full description — English

```
Monoblock is falling-block puzzling at its simplest: seven pieces, a ten-wide well, and one goal — fill a row to clear it.

No timers. No lives. No energy bars. Play as long as you like, one piece at a time.

• Classic rules: no wall kicks, speed rises as you level up
• Choose your start level and start speed (0–9)
• Play with gestures or on-screen keys
• Light and dark themes, nine block colours plus a multicolour mode
• Works offline — no account, no sign-up
• Available in English, Türkçe, Español, Deutsch and Русский

Ads appear only after a game ends, and only once you have played for five minutes and levelled up twice. Never during play.
```

### Full description — Türkçe

```
Monoblock düşen bloklu bulmacanın en yalın hâli: yedi parça, on kare genişliğinde bir kuyu ve tek bir hedef — bir satırı doldur, sil.

Süre yok. Can yok. Enerji çubuğu yok. İstediğin kadar oyna, parça parça.

• Klasik kurallar: duvar tekmesi yok, seviye atladıkça hız artar
• Başlangıç seviyesini ve hızını sen seç (0–9)
• Kaydırma hareketleriyle ya da ekran tuşlarıyla oyna
• Açık ve koyu tema, dokuz blok rengi ve çok renkli mod
• Çevrimdışı çalışır — hesap yok, kayıt yok
• Türkçe, English, Español, Deutsch ve Русский

Reklam yalnızca oyun bittikten sonra çıkar; o da beş dakika oynayıp iki kez seviye atladıysan. Oyun sırasında asla.
```

## 6. Kapalı test

**Test and release → Testing → Closed testing → Create track** (ya da hazır gelen "Closed testing")

1. **Testers** → mevcut test **e-posta listeni seç** — yeniden yazmana gerek yok
2. **Countries/regions** → Select all
3. **Create new release** → AAB'yi yükle
4. Sürüm notu:

```
First test build. Thanks for helping — play a few games and tell us what feels off.
```

5. **Save → Review → Start rollout to Closed testing**

### 14 günün asıl şartı: testçiler YENİ linkten katılmalı

Başka bir uygulamanın testine katılmış olmaları Monoblock'u kapsamıyor.
Her uygulamanın kendi katılım linki var. Closed testing → **Testers** sekmesinde **"Join on the web"**
linkini kopyala, 12 kişiye gönder. Her biri:

1. Linke tıklayıp **Become a tester** demeli
2. Play'den Monoblock'u **indirmeli**
3. 14 gün boyunca **testte kalmalı** (çıkarsa saat onun için sıfırlanır)

Şart: **en az 12 testçi, en az 14 gün kesintisiz** katılımda kalmış olmalı.
Saat ancak testçiler katılınca işlemeye başlıyor; o yüzden sürüm onaylanır
onaylanmaz linki aynı gün herkese at. Birkaç yedek testçi eklemek iyi olur —
biri çıkarsa 12'nin altına düşmeyelim.

---

## Sonraya kalanlar (bilerek)

- Oyun içi alt yazı hâlâ **"CLASSIC FALLING BLOCKS"** (menü + açılış görseli). Kilitli
  isim "Monoblock: Block Puzzle"; geliştirme turunda hizalanacak
- Gerçek AdMob kimlikleri + `TEST_MODU = false`
- UMP onay mesajı AdMob panelinde oluşturulmadı — AB'de
  kişiselleştirilmiş reklam için gerekli
- Oyun içinde "gizlilik seçenekleri" girişi yok
- Tanıtım videosu
