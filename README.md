# Kalp Ritmi

A calm, offline habit tracker for Obsidian.

Sade, çevrimdışı bir alışkanlık takipçisi. Obsidian içinde çalışır; hiçbir ağ isteği göndermez, hesap istemez, telemetri toplamaz.

Uygulama adı **Kalp Ritmi** oldu. Eklenti kimliği, görünüm kimliği ve `Ritim/` veri klasörü eski kayıtları korumak için değişmedi; mevcut veriler yerinde kalır.

**1.6.2**, hızlı değer düğmesini sadeleştirir: her günün altında renkli bir `+` düğmesi kalır, varsayılan değer alışkanlık altında `(111)` gibi küçük bir bilgi olarak gösterilir. Günlük not, Markdown raporu ve haftalık değerlendirme kaldırılmıştır. 121 çekirdek testi geçer.

> Durum: **1.6.2.** Kayıtlar kasada kalıcıdır; 3–14 günlük pano, alt alta haftalık ve aylık panolar, ayarlanabilir 2–8 hafta ve 3–12 ay, geçmişe gezinme, tarih seçici ve günlük/haftalık/aylık alışkanlık takvimleri, günlük/haftalık/aylık toplamlar, skor, haftalık hedefler, esnek gün seçimi, her N günde tekrar, gün atlama, mola aralığı, minimum sürüm, hızlı değer, alışkanlık zincirleme, gün bölümleri, perfect day, alışkanlık sıralama ve arşivleme, ayrıntılı istatistikler, 12 haftalık ısı haritası, alışkanlık başına Markdown notu, alışkanlık başına hızlı notlar, hızlı yapılacaklar dosyası, alışkanlık ekleme/düzenleme/silme, pano ayarları, Hicri tarih, isteğe bağlı namaz vakitleri ve vakitlere dokunarak namaz işaretleme vardır.

## Kurulum (GitHub sürümü)

1. [Son sürümün](https://github.com/emreercanx/kalp-ritmi/releases/latest) sayfasından `main.js`, `manifest.json` ve `styles.css` dosyalarını indir.
2. Kasanın `.obsidian/plugins/ritim/` klasörünü oluştur ve üç dosyayı içine kopyala.
3. Obsidian → Ayarlar → Topluluk eklentileri → "Kalp Ritmi"yi etkinleştir.
4. Şerit ikonuna veya komut paletindeki "Kalp Ritmi: Panoyu aç" komutuna tıkla; pano ana çalışma alanında tam ekran açılır.

## Kurulum (kaynaktan)

1. Bu depoyu indir veya klonla.
2. `npm install && npm run build` çalıştır.
3. `manifest.json`, `main.js` ve `styles.css` dosyalarını kasanın `.obsidian/plugins/ritim/` klasörüne kopyala.
4. Obsidian → Ayarlar → Topluluk eklentileri → "Kalp Ritmi"yi etkinleştir.

## Geliştirme

```bash
npm install
npm test
npm run build
```

## Kullanım

- Kalp Ritmi ana çalışma alanında tam genişlikte açılır. Açılırken sol ve sağ yan paneller kapanır; eski sürümden yan panelde kalmış bir Kalp Ritmi görünümü ilk açılışta kaldırılır. **Panoyu yeni sekmede aç** komutu ayrı bir ana sekme oluşturur.
- Başlıktaki `+` günlük alışkanlık ekler. **Haftalık alışkanlıklar** ve **Aylık alışkanlıklar** bölüm başlığındaki `+` ise o sıklıkta yeni alışkanlık ekler.
- Bir alışkanlığın adına veya satırındaki kalem simgesine dokunarak düzenle.
- Düzenleme ekranındaki **Sıklık** ile Günlük, Haftalık veya Aylık seç. Haftalık her hafta tek, aylık her ay tek kutuda işaretlenir; sayısal alışkanlıkta **hedef** dönem hedefi olur. Kayıtları olan bir alışkanlığın sıklığı değiştirilemez.
- Haftalık ve aylık panolar yalnızca o sıklıktaki alışkanlıkları gösterir; günlük alışkanlıklar üstteki günlük panoda kalır.
- Haftalık/aylık panolarda `‹` / `›` ve **Bugün** ile dönemler arasında gezin. Görünen hafta sayısı 2–8, ay sayısı 3–12 arasında ayarlanır; varsayılan ikisi de 4'tür.
- Haftalık/aylık satırdaki **çöp kutusu** alışkanlığı onay sorduktan sonra panodan ve tanım dosyasından kaldırır; geçmiş log satırları dosyada kalır. Günlük alışkanlıklar düzenleme ekranındaki **Sil** ile kaldırılır.
- Haftalık/aylık panolarda her sütun bir dönemdir. Tik alışkanlığında hücre o dönemin tek kaydıdır; sayısal alışkanlıkta dönem toplamı ve hedefi yazılır. Kayıt, dönemin başlangıç gününe yazılır.
- Her alışkanlık satırının adının altında **takvim**, **düzenle**, **ayrıntı/skor** ve **Markdown notu** düğmeleri vardır; günlük satırlarda ayrıca **hızlı not**, haftalık/aylık satırlarda ayrıca **sil** bulunur. Gün sütunları bozulmadan hızlı erişim sağlar.
- Günlük satırındaki **defter** simgesi o alışkanlığın hızlı notlarını açar. Aynı alışkanlık için istediğin kadar not ekleyebilirsin; her notu ayrı ayrı düzenleyip silebilirsin. Notlar `.md` dosyası oluşturmaz; eklentinin `data.json` dosyasındaki yerel veride saklanır. `Ctrl+Enter` / `Cmd+Enter` yeni notu ekler.
- Her alışkanlığa bir Markdown dosyası bağlanır. Düzenleme ekranındaki **Markdown dosyası > Dosya seç** ile mevcut bir `.md` dosyası seçebilirsin. Seçmezsen kaydederken `Ritim/alışkanlıklar/` içinde otomatik oluşturulur; aynı ad varsa sonuna `-2`, `-3` eklenir.
- Alışkanlık satırındaki **Markdown notu** düğmesi bağlı dosyayı yeni sekmede açar. Dosya silinmişse aynı yolda yeniden oluşturulur. Mevcut alışkanlıkların dosyaları pano ilk açıldığında, yeni alışkanlıklarınki ise kaydedilirken oluşturulur.
- Otomatik dosyaların klasörünü **Ayarlar > Alışkanlık notları > MD klasörü** ile değiştirebilirsin; varsayılan `Ritim/alışkanlıklar` klasörüdür.
- Düzenleme ekranında günlük alışkanlık için isteğe bağlı **haftalık hedef** ver: tiklerde haftada gün, sayılarda haftada toplam. İlerleme ayrıntı ekranında görünür.
- Düzenleme ekranındaki **Günler** seçicisiyle günlük alışkanlığın planlandığı günleri belirle. Kapalı günler skora ve seriye katılmaz; panoda ve takvimde soluk görünür, yine de o güne kayıt girebilirsin.
- **Her N günde** alanına 2–365 arasında bir sayı yazınca günlük alışkanlık seçilen günler yerine oluşturulma tarihinden itibaren her N günde bir beklenir. Tekrar aralığı, haftalık hedefin yerini alır.
- Sayısal alışkanlıkta **Minimum** değeri girersen hedefin altında kalan ama bu eşiği geçen kayıtlar seri ve skorda tamamlanmış sayılır; hücrede soluk görünür.
- Alışkanlık satırındaki **ayrıntı** ekranı; 30 gün dağılımını, aylık eğilimi, haftanın günlerine göre başarıyı, son kayıtları ve plan bilgilerini gösterir.
- Sayısal alışkanlıkta **Hızlı değer** belirle: örneğin 111. Panoda ve alışkanlık takviminde her gün hücresinin altında çıkan renkli **+** düğmesi o güne varsayılan hızlı değeri tek dokunuşla yazar; varsayılan değer alışkanlık adının altında `(111)` gibi küçük bir bilgi olarak görünür. Geçmiş günlere dönüp planlama yaparken de kullanılabilir. Alışkanlık takviminde gün kutusuna dokunarak tik alışkanlığını işaretleyip kaldırabilir, sayısal alışkanlıkta istediğin rakamı girebilirsin. Satır eylem düğmeleri büyütüldü. Tik ve bırak alışkanlıklarında bu düğme görünmez.
- Düzenleme ekranındaki **Mola** başlangıç ve bitiş tarihleriyle bir aralık seç. Moladaki günler beklenen gün sayılmaz ve seriyi bozmaz; panoda soluk, takvimde “molada” görünür.
- Günlük satırdaki **atla** düğmesi seçili günü atlar; atlanan gün beklenen gün sayılmaz, seriyi bozmaz ve panoda `–` ile gösterilir. Atlanan hücreye dokunarak kaydı geri alabilirsin.
- Düzenleme ekranındaki **Şundan sonra** ile bir alışkanlığı başka bir alışkanlığın ardına bağla. Zincir, panoda üst alışkanlıktan sonra gösterilir ve döngü oluşturacak bağlantılar engellenir.
- **Gün bölümü** ile alışkanlığı Sabah, Öğleden sonra, Akşam veya Gün içinde grubuna koy. Birden fazla grup varsa günlük pano bu başlıklarla ayrılır.
- Başlıkta **Perfect day** ilerlemesi görünür: o gün beklenen tüm günlük alışkanlıklar tamamlanınca vurgulanır. Atlanan ve moladaki günler beklenen sayıya katılmaz.
- Düzenleme ekranındaki **Sıra** düğmeleriyle alışkanlığın panodaki yerini değiştir; sıra hemen kaydedilir.
- **Arşivle** ile alışkanlığı panodan kaldır; geçmişi silinmez. Ayarlar > Arşiv bölümünden geri alabilirsin. Arşivdeki bir namaz alışkanlığına vakit şeridinden dokunursan otomatik geri alınır.
- Başlıktaki **şimşek** simgesi hızlı yapılacaklar penceresini açar. Yazdığın görev `- [ ] görev` olarak tek bir Markdown dosyasına eklenir; **Dosyayı aç** ile aynı dosyayı yeni sekmede açabilirsin. Varsayılan dosya `Ritim/Hızlı yapılacaklar.md`; **Ayarlar > Hızlı yapılacaklar > Todo dosyası** ile değiştirilebilir. Telefon widget'ından not açıp bu dosyayı seçerek listeye hızlıca ulaşabilirsin.
- Haftalık/aylık satırdaki **takvim** düğmesi dönem takvimini açar. Haftalıkta seçili ayın haftaları, aylıkta seçili yılın 12 ayı listelenir; dolu kutular hedefe ulaşılan dönemleri, çerçeveli kutular seçili dönemi gösterir. Üstteki dört kutuda bu dönemin değeri, tamamlanan dönem sayısı ve güncel/en uzun seri bulunur. Geçmiş bir döneme dokununca pano o döneme gider; gelecek dönemler kapalıdır.
- Haftalık/aylık alışkanlığın **ayrıntı** düğmesi dönem değerini, tamamlanan dönem sayısını, güncel/en uzun seriyi ve son 12 dönemi gösterir; altındaki **Takvim** düğmesi dönem takvimini açar.
- 8–14 günlük panoda sütunlar sıkışmaz; pano yatay kaydırılır ve alışkanlık adı sabit kalır. Arşivli alışkanlıklar sıralamada atlanır; haftalık gün hedefi seçili gün sayısından fazla olamaz.
- `‹` / `›` ile seçili gün sayısı kadar geçmişe git; eski günlere dokunup düzelt.
- Başlıktaki takvim simgesiyle aya bak, bir güne dokun ve o tarihe atla; seçilen gün çerçeveli görünür.
- Her günlük alışkanlığın altındaki takvim simgesi o alışkanlığın ayını açar. Dolu günler hedefe ulaşılan, çerçeveli günler kısmi kayıtları gösterir; sayısal alışkanlıklarda günlük değer de yazar.
- Başlıktaki dişli ile görünen gün sayısını (3–14), görünen hafta (2–8) ve ay (3–12) sayısını, hafta başlangıcını (Pazartesi/Pazar), gün dönümünü (00:00–05:00), alışkanlık MD klasörünü, hızlı yapılacaklar dosyasını, Hicri tarihi ve isteğe bağlı namaz vakitlerini ayarla.
- Başlıkta Ümmü'l-Kura takvimine göre Hicri tarih görünür. Diyanet takvimiyle bir günlük fark olursa ayarlardan −2…+2 gün kaydırma yapılabilir.
- Namaz vakitleri için şehir seç veya "Özel konum" ile enlem/boylam gir; yöntem (varsayılan Diyanet) ve ikindi mezhebi (varsayılan Hanefi) seçilebilir. Vakitler panonun üstünde gösterilir; sıradaki vakit ve kalan süre işaretlenir.
- Vakit şeridindeki bir namaza dokunarak o günü işaretle veya işareti geri al. İlgili namaz alışkanlığı yoksa ilk dokunuşta oluşturulur; mevcut "Sabah namazı" alışkanlığı yeniden kullanılır.
- Günlük alışkanlığın **ayrıntı** düğmesi güncel ve en uzun seriyi, 30 gün skorunu, hafta/ay/tüm zamanlar ilerlemesini, son 30 günün şeridini ve son 12 haftanın ısı haritasını gösterir.

## Veri dosyaları

İlk açılışta kasa kökünde `Ritim/habits.json` ve `Ritim/log/` oluşur:

- `Ritim/habits.json` — alışkanlık tanımları
- `Ritim/log/YYYY-MM.ndjson` — her düzenleme için bir satır; en yeni zaman damgası kazanır. Haftalık/aylık kayıtlar dönem başlangıcı anahtarıyla aynı dosyalarda tutulur. Atlanan günler `s` alanlı satırla, molalar ise `habits.json` içindeki tarih aralığıyla saklanır.
- `Ritim/alışkanlıklar/<ad>.md` — alışkanlık başına Markdown notu; klasör ayarlardan değiştirilebilir
- `Ritim/Hızlı yapılacaklar.md` — şimşek düğmesinin eklediği görevler; dosya yolu ayarlardan değiştirilebilir

Eklenti ayarları ve alışkanlık hızlı notları `.obsidian/plugins/ritim/data.json` içinde tutulur; hızlı notlar Markdown dosyası olarak oluşturulmaz.

Kayıtlar düz metindir, kasanın normal yedeğiyle birlikte taşınır. İlk açılışta dört günlük başlangıç alışkanlığı oluşturulur; bunların geçmişi boştur. Haftalık/aylık alışkanlıkların dönem kayıtları aynı log dosyalarına dönem başlangıç tarihiyle yazılır. Bir alışkanlık silinirse tanımı kaldırılır; eski log satırları ve bağlı Markdown dosyası silinmez.

## Gizlilik

- Ağ isteği yok. Namaz vakitleri cihazda, seçilen konuma göre hesaplanır; konum yalnızca eklenti ayarlarında saklanır.
- Telemetri yok.
- Hesap yok.
- Veriler kasanın içinde düz dosyalar olarak kalır.

## Lisans

MIT. Namaz vakti hesaplamasında kullanılan [adhan-js](https://github.com/batoulapps/adhan-js) MIT lisanslıdır; ayrıntılar: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
