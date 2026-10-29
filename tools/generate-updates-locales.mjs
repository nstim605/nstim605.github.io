import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, loadAppNews, renderNewsCards, renderNewsHeader } from "./app-news.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const currentNewsOnly = process.argv.includes('--current-news-only');
const currentNewsLastmod = '2026-10-29';
const base = "https://balkanconverter.com";
const play = "https://play.google.com/store/apps/details?id=io.github.nstim605.balkanconverter";

// dir, hreflang, lang, rtl, home, updates, releases, notes, latest, improved,
// summary, read, all, released, published
const rows = [
  ["","en","en",0,"Home","Updates","APP RELEASES","Release notes for BALCO Converter.","Latest release","improved scanner","Improved price-scanner recognition and reliability.","Read release notes","All updates","Released","Published on Google Play as version 1.604 (version code 20)."],
  ["sr","sr","sr",0,"Почетна","Ажурирања","ИЗДАЊА АПЛИКАЦИЈЕ","Белешке о издањима за BALCO Converter.","Најновије издање","побољшан скенер","Побољшано препознавање и поузданост скенера цена.","Прочитајте белешке","Сва ажурирања","Објављено","Објављено на Google Play-у као верзија 1.604 (код верзије 20)."],
  ["bs","bs","bs",0,"Početna","Ažuriranja","IZDANJA APLIKACIJE","Bilješke o izdanjima za BALCO Converter.","Najnovije izdanje","poboljšan skener","Poboljšano prepoznavanje i pouzdanost skenera cijena.","Pročitajte bilješke","Sva ažuriranja","Objavljeno","Objavljeno na Google Playu kao verzija 1.604 (kôd verzije 20)."],
  ["hr","hr","hr",0,"Početna","Ažuriranja","IZDANJA APLIKACIJE","Bilješke o izdanjima za BALCO Converter.","Najnovije izdanje","poboljšani skener","Poboljšano prepoznavanje i pouzdanost skenera cijena.","Pročitaj bilješke","Sva ažuriranja","Objavljeno","Objavljeno na Google Playu kao verzija 1.604 (kôd verzije 20)."],
  ["sq","sq","sq",0,"Kreu","Përditësime","PUBLIKIMET E APLIKACIONIT","Shënime publikimi për BALCO Converter.","Publikimi më i fundit","skaner i përmirësuar","Njohje dhe besueshmëri e përmirësuar e skanerit të çmimeve.","Lexo shënimet","Të gjitha përditësimet","Publikuar","Publikuar në Google Play si versioni 1.604 (kodi i versionit 20)."],
  ["mk","mk","mk",0,"Почетна","Ажурирања","ИЗДАНИЈА НА АПЛИКАЦИЈАТА","Белешки за изданијата на BALCO Converter.","Најново издание","подобрен скенер","Подобрено препознавање и сигурност на скенерот за цени.","Прочитај белешки","Сите ажурирања","Објавено","Објавено на Google Play како верзија 1.604 (код на верзија 20)."],
  ["bg","bg","bg",0,"Начало","Актуализации","ВЕРСИИ НА ПРИЛОЖЕНИЕТО","Бележки за версиите на BALCO Converter.","Последна версия","подобрен скенер","Подобрени разпознаване и надеждност на скенера за цени.","Прочетете бележките","Всички актуализации","Публикувано","Публикувано в Google Play като версия 1.604 (код на версията 20)."],
  ["ro","ro","ro",0,"Acasă","Actualizări","VERSIUNI ALE APLICAȚIEI","Note de versiune pentru BALCO Converter.","Cea mai recentă versiune","scanner îmbunătățit","Recunoaștere și fiabilitate îmbunătățite pentru scannerul de prețuri.","Citește notele","Toate actualizările","Lansat","Publicat pe Google Play ca versiunea 1.604 (cod versiune 20)."],
  ["hu","hu","hu",0,"Kezdőlap","Frissítések","ALKALMAZÁSKIADÁSOK","Kiadási megjegyzések a BALCO Converterhez.","Legújabb kiadás","továbbfejlesztett szkenner","Javult az árleolvasó felismerése és megbízhatósága.","Kiadási megjegyzések","Minden frissítés","Megjelent","A Google Playen 1.604-es verzióként jelent meg (verziókód: 20)."],
  ["pl","pl","pl",0,"Strona główna","Aktualizacje","WYDANIA APLIKACJI","Informacje o wydaniach BALCO Converter.","Najnowsze wydanie","ulepszony skaner","Ulepszono rozpoznawanie i niezawodność skanera cen.","Przeczytaj informacje","Wszystkie aktualizacje","Wydano","Opublikowano w Google Play jako wersję 1.604 (kod wersji 20)."],
  ["cs","cs","cs",0,"Domů","Aktualizace","VYDÁNÍ APLIKACE","Poznámky k vydáním BALCO Converter.","Nejnovější vydání","vylepšený skener","Vylepšené rozpoznávání a spolehlivost skeneru cen.","Přečíst poznámky","Všechny aktualizace","Vydáno","Publikováno na Google Play jako verze 1.604 (kód verze 20)."],
  ["sk","sk","sk",0,"Domov","Aktualizácie","VYDANIA APLIKÁCIE","Poznámky k vydaniam BALCO Converter.","Najnovšie vydanie","vylepšený skener","Vylepšené rozpoznávanie a spoľahlivosť skenera cien.","Prečítať poznámky","Všetky aktualizácie","Vydané","Publikované na Google Play ako verzia 1.604 (kód verzie 20)."],
  ["sl","sl","sl",0,"Domov","Posodobitve","IZDAJE APLIKACIJE","Opombe ob izdajah BALCO Converter.","Najnovejša izdaja","izboljšan optični bralnik","Izboljšana prepoznava in zanesljivost bralnika cen.","Preberi opombe","Vse posodobitve","Izdano","Objavljeno v trgovini Google Play kot različica 1.604 (koda različice 20)."],
  ["de","de","de",0,"Startseite","Updates","APP-VERSIONEN","Versionshinweise für BALCO Converter.","Neueste Version","verbesserter Scanner","Verbesserte Erkennung und Zuverlässigkeit des Preisscanners.","Versionshinweise lesen","Alle Updates","Veröffentlicht","Bei Google Play als Version 1.604 (Versionscode 20) veröffentlicht."],
  ["fr","fr","fr",0,"Accueil","Mises à jour","VERSIONS DE L’APPLICATION","Notes de version de BALCO Converter.","Dernière version","scanner amélioré","Reconnaissance et fiabilité améliorées du scanner de prix.","Lire les notes","Toutes les mises à jour","Publié","Publié sur Google Play en version 1.604 (code de version 20)."],
  ["it","it","it",0,"Home","Aggiornamenti","VERSIONI DELL’APP","Note di rilascio di BALCO Converter.","Ultima versione","scanner migliorato","Riconoscimento e affidabilità dello scanner dei prezzi migliorati.","Leggi le note","Tutti gli aggiornamenti","Pubblicato","Pubblicato su Google Play come versione 1.604 (codice versione 20)."],
  ["es-es","es-ES","es-ES",0,"Inicio","Actualizaciones","VERSIONES DE LA APLICACIÓN","Notas de las versiones de BALCO Converter.","Última versión","escáner mejorado","Reconocimiento y fiabilidad mejorados del escáner de precios.","Leer las notas","Todas las actualizaciones","Publicado","Publicado en Google Play como versión 1.604 (código de versión 20)."],
  ["es-419","es-419","es-419",0,"Inicio","Actualizaciones","VERSIONES DE LA APLICACIÓN","Notas de las versiones de BALCO Converter.","Versión más reciente","escáner mejorado","Mejor reconocimiento y confiabilidad del escáner de precios.","Leer las notas","Todas las actualizaciones","Publicado","Publicado en Google Play como versión 1.604 (código de versión 20)."],
  ["pt-br","pt-BR","pt-BR",0,"Início","Atualizações","VERSÕES DO APP","Notas de versão do BALCO Converter.","Versão mais recente","scanner aprimorado","Reconhecimento e confiabilidade aprimorados do scanner de preços.","Ler notas da versão","Todas as atualizações","Lançado","Publicado no Google Play como versão 1.604 (código da versão 20)."],
  ["pt-pt","pt-PT","pt-PT",0,"Início","Atualizações","VERSÕES DA APLICAÇÃO","Notas de versão do BALCO Converter.","Versão mais recente","scanner melhorado","Reconhecimento e fiabilidade melhorados do scanner de preços.","Ler notas da versão","Todas as atualizações","Lançado","Publicado no Google Play como versão 1.604 (código da versão 20)."],
  ["nl","nl","nl",0,"Start","Updates","APP-VERSIES","Releaseopmerkingen voor BALCO Converter.","Nieuwste versie","verbeterde scanner","Verbeterde herkenning en betrouwbaarheid van de prijsscanner.","Lees de releaseopmerkingen","Alle updates","Uitgebracht","Gepubliceerd op Google Play als versie 1.604 (versiecode 20)."],
  ["da","da","da",0,"Forside","Opdateringer","APPUDGIVELSER","Udgivelsesnoter til BALCO Converter.","Seneste udgivelse","forbedret scanner","Forbedret genkendelse og pålidelighed i prisscanneren.","Læs udgivelsesnoter","Alle opdateringer","Udgivet","Udgivet på Google Play som version 1.604 (versionskode 20)."],
  ["sv","sv","sv",0,"Hem","Uppdateringar","APPVERSIONER","Versionsinformation för BALCO Converter.","Senaste versionen","förbättrad skanner","Förbättrad igenkänning och tillförlitlighet i prisskannern.","Läs versionsinformationen","Alla uppdateringar","Släppt","Publicerad på Google Play som version 1.604 (versionskod 20)."],
  ["nb","nb","nb",0,"Hjem","Oppdateringer","APPVERSJONER","Versjonsmerknader for BALCO Converter.","Nyeste versjon","forbedret skanner","Forbedret gjenkjenning og pålitelighet i prisskanneren.","Les versjonsmerknadene","Alle oppdateringer","Utgitt","Publisert på Google Play som versjon 1.604 (versjonskode 20)."],
  ["fi","fi","fi",0,"Etusivu","Päivitykset","SOVELLUSVERSIOT","BALCO Converterin julkaisutiedot.","Uusin versio","parannettu skanneri","Hintaskannerin tunnistusta ja luotettavuutta on parannettu.","Lue julkaisutiedot","Kaikki päivitykset","Julkaistu","Julkaistu Google Playssa versiona 1.604 (versiokoodi 20)."],
  ["is","is","is",0,"Heim","Uppfærslur","ÚTGÁFUR FORRITSINS","Útgáfuskýringar fyrir BALCO Converter.","Nýjasta útgáfa","bættur skanni","Bætt greining og áreiðanleiki verðskannans.","Lesa útgáfuskýringar","Allar uppfærslur","Gefið út","Gefið út á Google Play sem útgáfa 1.604 (útgáfukóði 20)."],
  ["el","el","el",0,"Αρχική","Ενημερώσεις","ΕΚΔΟΣΕΙΣ ΕΦΑΡΜΟΓΗΣ","Σημειώσεις εκδόσεων για το BALCO Converter.","Τελευταία έκδοση","βελτιωμένος σαρωτής","Βελτιωμένη αναγνώριση και αξιοπιστία του σαρωτή τιμών.","Διαβάστε τις σημειώσεις","Όλες οι ενημερώσεις","Κυκλοφόρησε","Δημοσιεύτηκε στο Google Play ως έκδοση 1.604 (κωδικός έκδοσης 20)."],
  ["tr","tr","tr",0,"Ana sayfa","Güncellemeler","UYGULAMA SÜRÜMLERİ","BALCO Converter sürüm notları.","En son sürüm","geliştirilmiş tarayıcı","Fiyat tarayıcısının tanıma ve güvenilirliği geliştirildi.","Sürüm notlarını oku","Tüm güncellemeler","Yayınlandı","Google Play’de 1.604 sürümü (sürüm kodu 20) olarak yayınlandı."],
  ["ru","ru","ru",0,"Главная","Обновления","ВЕРСИИ ПРИЛОЖЕНИЯ","Примечания к выпускам BALCO Converter.","Последняя версия","улучшенный сканер","Улучшены распознавание и надёжность сканера цен.","Читать заметку","Все обновления","Выпущено","Опубликовано в Google Play как версия 1.604 (код версии 20)."],
  ["uk","uk","uk",0,"Головна","Оновлення","ВЕРСІЇ ЗАСТОСУНКУ","Примітки до випусків BALCO Converter.","Остання версія","покращений сканер","Покращено розпізнавання та надійність сканера цін.","Читати примітки","Усі оновлення","Випущено","Опубліковано в Google Play як версію 1.604 (код версії 20)."],
  ["ar","ar","ar",1,"الرئيسية","التحديثات","إصدارات التطبيق","ملاحظات إصدارات BALCO Converter.","أحدث إصدار","ماسح ضوئي محسّن","تحسين التعرّف وموثوقية ماسح الأسعار.","قراءة ملاحظات الإصدار","كل التحديثات","صدر في","نُشر على Google Play بالإصدار 1.604 (رمز الإصدار 20)."],
  ["he","he","he",1,"דף הבית","עדכונים","גרסאות האפליקציה","הערות גרסה עבור BALCO Converter.","הגרסה האחרונה","סורק משופר","שופרו הזיהוי והאמינות של סורק המחירים.","קריאת הערות הגרסה","כל העדכונים","פורסם","פורסם ב-Google Play כגרסה 1.604 (קוד גרסה 20)."],
  ["fa","fa","fa",1,"خانه","به‌روزرسانی‌ها","نسخه‌های برنامه","یادداشت‌های انتشار BALCO Converter.","جدیدترین نسخه","اسکنر بهبودیافته","تشخیص و قابلیت اطمینان اسکنر قیمت بهبود یافته است.","خواندن یادداشت انتشار","همه به‌روزرسانی‌ها","منتشر شد","در Google Play با نسخه 1.604 (کد نسخه 20) منتشر شد."],
  ["ur","ur","ur",1,"ہوم","اپ ڈیٹس","ایپ ریلیزز","BALCO Converter کے ریلیز نوٹس۔","تازہ ترین ریلیز","بہتر اسکینر","قیمت اسکینر کی شناخت اور قابل اعتمادیت بہتر بنائی گئی۔","ریلیز نوٹس پڑھیں","تمام اپ ڈیٹس","جاری ہوا","Google Play پر ورژن 1.604 (ورژن کوڈ 20) کے طور پر شائع ہوا۔"],
  ["hi","hi","hi",0,"होम","अपडेट","ऐप रिलीज़","BALCO Converter के रिलीज़ नोट्स।","नवीनतम रिलीज़","बेहतर स्कैनर","मूल्य स्कैनर की पहचान और विश्वसनीयता में सुधार किया गया।","रिलीज़ नोट्स पढ़ें","सभी अपडेट","जारी हुआ","Google Play पर संस्करण 1.604 (संस्करण कोड 20) के रूप में प्रकाशित।"],
  ["bn","bn","bn",0,"হোম","আপডেট","অ্যাপ রিলিজ","BALCO Converter-এর রিলিজ নোট।","সর্বশেষ রিলিজ","উন্নত স্ক্যানার","মূল্য স্ক্যানারের শনাক্তকরণ ও নির্ভরযোগ্যতা উন্নত করা হয়েছে।","রিলিজ নোট পড়ুন","সব আপডেট","প্রকাশিত","Google Play-এ সংস্করণ 1.604 (সংস্করণ কোড 20) হিসেবে প্রকাশিত।"],
  ["id","id","id",0,"Beranda","Pembaruan","RILIS APLIKASI","Catatan rilis BALCO Converter.","Rilis terbaru","pemindai yang ditingkatkan","Pengenalan dan keandalan pemindai harga telah ditingkatkan.","Baca catatan rilis","Semua pembaruan","Dirilis","Dipublikasikan di Google Play sebagai versi 1.604 (kode versi 20)."],
  ["ms","ms","ms",0,"Laman utama","Kemas kini","KELUARAN APLIKASI","Nota keluaran BALCO Converter.","Keluaran terkini","pengimbas dipertingkat","Pengecaman dan kebolehpercayaan pengimbas harga dipertingkat.","Baca nota keluaran","Semua kemas kini","Dikeluarkan","Diterbitkan di Google Play sebagai versi 1.604 (kod versi 20)."],
  ["th","th","th",0,"หน้าแรก","อัปเดต","รุ่นของแอป","บันทึกประจำรุ่นของ BALCO Converter","รุ่นล่าสุด","เครื่องสแกนที่ปรับปรุงแล้ว","ปรับปรุงการจดจำและความน่าเชื่อถือของเครื่องสแกนราคา","อ่านบันทึกประจำรุ่น","อัปเดตทั้งหมด","เผยแพร่","เผยแพร่บน Google Play เป็นเวอร์ชัน 1.604 (รหัสเวอร์ชัน 20)"],
  ["vi","vi","vi",0,"Trang chủ","Cập nhật","BẢN PHÁT HÀNH ỨNG DỤNG","Ghi chú phát hành BALCO Converter.","Bản phát hành mới nhất","máy quét được cải thiện","Cải thiện khả năng nhận dạng và độ tin cậy của máy quét giá.","Đọc ghi chú phát hành","Tất cả bản cập nhật","Phát hành","Đã phát hành trên Google Play dưới dạng phiên bản 1.604 (mã phiên bản 20)."],
  ["zh-hans","zh-Hans","zh-Hans",0,"首页","更新","应用版本","BALCO Converter 版本说明。","最新版本","改进的扫描器","改进了价格扫描器的识别能力和可靠性。","阅读版本说明","所有更新","发布于","已在 Google Play 上发布为 1.604 版（版本代码 20）。"],
  ["zh-hant","zh-Hant","zh-Hant",0,"首頁","更新","應用程式版本","BALCO Converter 版本說明。","最新版本","改進的掃描器","改進了價格掃描器的辨識能力和可靠性。","閱讀版本說明","所有更新","發佈於","已在 Google Play 上發佈為 1.604 版（版本代碼 20）。"],
  ["ja","ja","ja",0,"ホーム","更新情報","アプリのリリース","BALCO Converter のリリースノート。","最新リリース","改良されたスキャナー","価格スキャナーの認識精度と信頼性を改善しました。","リリースノートを読む","すべての更新","リリース日","Google Play でバージョン 1.604（バージョンコード 20）として公開されました。"],
  ["ko","ko","ko",0,"홈","업데이트","앱 릴리스","BALCO Converter 릴리스 노트입니다.","최신 릴리스","개선된 스캐너","가격 스캐너의 인식 성능과 안정성을 개선했습니다.","릴리스 노트 읽기","모든 업데이트","출시일","Google Play에 버전 1.604(버전 코드 20)로 게시되었습니다."]
];

const locales = rows.map(([dir, hreflang, lang, rtl, home, updates, releases, notes, latest, improved, summary, read, all, released, published]) => ({dir, hreflang, lang, rtl: Boolean(rtl), home, updates, releases, notes, latest, improved, summary, read, all, released, published}));
if (locales.length !== 44) throw new Error(`Expected 44 locales, got ${locales.length}`);

const localeManifestPath = path.join(root, "site-locales.json");
const localeManifest = JSON.parse(fs.readFileSync(localeManifestPath, "utf8"));
for (const locale of locales) {
  const entry = localeManifest.locales.find(item => item.hreflang === locale.hreflang);
  if (!entry) throw new Error(`Missing ${locale.hreflang} in site-locales.json`);
  entry.updatesUrl = `${locale.dir ? `/${locale.dir}` : ""}/updates/`;
  entry.updateArticleUrls = {"version-1-604": `${entry.updatesUrl}version-1-604/`};
}
if (!currentNewsOnly) fs.writeFileSync(localeManifestPath, `${JSON.stringify(localeManifest, null, 2)}\n`);
const appNews = loadAppNews(root, localeManifest);
fs.mkdirSync(path.join(root, "updates", "data"), {recursive: true});
fs.writeFileSync(path.join(root, "updates", "data", "app-news.json"), `${JSON.stringify(appNews, null, 2)}\n`);

const localePath = (locale, suffix = "") => `${locale.dir ? `/${locale.dir}` : ""}/updates/${suffix}`;
const alternates = (suffix = "") => locales.map(locale => `  <link rel="alternate" hreflang="${locale.hreflang}" href="${base}${localePath(locale, suffix)}">`).concat(`  <link rel="alternate" hreflang="x-default" href="${base}/updates/${suffix}">`).join("\n");
const escJson = value => JSON.stringify(value).slice(1, -1);

for (const locale of locales) {
  const news = appNews[locale.hreflang];
  const home = locale.dir ? `/${locale.dir}/` : "/";
  const updates = `${base}${localePath(locale)}`;
  const article = `${base}${localePath(locale, "version-1-604/")}`;
  const htmlAttrs = `lang="${locale.lang}"${locale.rtl ? ' dir="rtl"' : ""}`;
  const updatesDir = path.join(root, locale.dir, "updates");
  const articleDir = path.join(updatesDir, "version-1-604");
  const homepageHtml = fs.readFileSync(path.join(root, locale.dir, "index.html"), "utf8");
  fs.mkdirSync(currentNewsOnly ? updatesDir : articleDir, {recursive: true});
  const indexHtml = `<!doctype html>
<html ${htmlAttrs}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f8fa">
  <title>${escapeHtml(news.title)} — BALCO Converter</title>
  <meta name="description" content="${locale.notes}">
  <link rel="canonical" href="${updates}">
${alternates()}
  <link rel="icon" href="/assets/icons/v1-603/app-icon-v1-603.png">
  <link rel="stylesheet" href="/styles.css?v=20261024">
</head>
<body>
  <a class="skip-link" href="#main">${escapeHtml(news.title)}</a>
  ${renderNewsHeader(homepageHtml, locale, news, localeManifest)}
  <main id="main" class="updates-main shell">
    <section class="updates-hero"><p class="eyebrow">BALCO Converter</p><h1>${escapeHtml(news.title)}</h1></section>
    <div class="app-updates-grid">
${renderNewsCards(news)}
    </div>
    <p class="updates-archive"><a class="text-link" href="${article}">1.604 · ${locale.read} <span aria-hidden="true">→</span></a></p>
  </main>
  <footer class="site-footer"><div class="shell"><a href="${home}">BALCO Converter</a> · <a href="${play}">Google Play</a></div></footer>
  <script src="/script.js" defer></script>
</body>
</html>
`;
  const jsonLd = `{"@context":"https://schema.org","@type":"Article","headline":"BALCO Converter 1.604: ${escJson(locale.improved)}","datePublished":"2026-10-10","dateModified":"2026-10-10","inLanguage":"${locale.lang}","mainEntityOfPage":"${article}","author":{"@type":"Organization","name":"BALCO Converter"},"publisher":{"@type":"Organization","name":"BALCO Converter"},"description":"${escJson(locale.summary)}"}`;
  const articleHtml = `<!doctype html>
<html ${htmlAttrs}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f8fa">
  <title>BALCO Converter 1.604: ${locale.improved} — ${locale.updates}</title>
  <meta name="description" content="${locale.summary}">
  <link rel="canonical" href="${article}">
${alternates("version-1-604/")}
  <link rel="icon" href="/assets/icons/v1-603/app-icon-v1-603.png">
  <link rel="stylesheet" href="/styles.css?v=20261024">
  <script type="application/ld+json">${jsonLd}</script>
</head>
<body>
  <header class="site-header"><div class="shell nav-wrap"><a class="brand" href="${home}"><img src="/assets/icons/v1-603/app-icon-v1-603.png" width="42" height="42" alt=""><span dir="ltr">BALCO Converter</span></a><nav class="nav-links"><a href="${updates}">${locale.updates}</a></nav></div></header>
  <main id="main" class="updates-main shell"><article class="release-article"><a class="text-link" href="${updates}">← ${locale.all}</a><p class="eyebrow">1.604</p><h1>BALCO Converter 1.604: ${locale.improved}</h1><time datetime="2026-10-10">${locale.released}: 2026-10-10</time><p class="hero-lede">${locale.summary}</p><div class="policy-card"><h2>${locale.summary}</h2><p>${locale.published}</p></div><a class="play-link" href="${play}"><img src="/assets/google-play-badge-en.png" width="202" height="60" alt="BALCO Converter — Google Play"></a></article></main>
  <footer class="site-footer"><div class="shell"><a href="${updates}">${locale.all}</a></div></footer>
  <script src="/script.js" defer></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(updatesDir, "index.html"), indexHtml);
  if (!currentNewsOnly) fs.writeFileSync(path.join(articleDir, "index.html"), articleHtml);
}

if (currentNewsOnly) {
  const sitemapPath = path.join(root, 'sitemap.xml');
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const currentUrls = new Set(locales.map(locale => `${base}${localePath(locale)}`));
  let changedUrls = 0;
  const updated = sitemap.replace(/<url>[\s\S]*?<\/url>/g, block => {
    const url = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!currentUrls.has(url)) return block;
    if (!/<lastmod>[^<]+<\/lastmod>/.test(block)) throw new Error(`Missing lastmod for ${url}`);
    changedUrls += 1;
    return block.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${currentNewsLastmod}</lastmod>`);
  });
  if (changedUrls !== locales.length) throw new Error(`Expected ${locales.length} current update URLs, found ${changedUrls}`);
  fs.writeFileSync(sitemapPath, updated);
  console.log(`Generated ${locales.length} current update pages, app-news.json and their sitemap dates only.`);
  process.exit(0);
}

const releaseCatalog = {
  schemaVersion: 2,
  releases: [{
    slug: "version-1-604",
    version: "1.604",
    versionCode: 20,
    publishedOn: "2026-10-10",
    kind: "minor",
    published: true,
    locales: locales.map(locale => locale.hreflang),
    localizedUrls: Object.fromEntries(locales.map(locale => [locale.hreflang, `${base}${localePath(locale, "version-1-604/")}`])),
    source: "artifacts/release/1.604/google-play-edit/REPORT.md"
  }]
};
fs.writeFileSync(path.join(root, "updates", "data", "releases.json"), `${JSON.stringify(releaseCatalog, null, 2)}\n`);

for (const locale of locales) {
  const homepage = path.join(root, locale.dir, "index.html");
  let html = fs.readFileSync(homepage, "utf8");
  html = html.replace(/(href="(?:\.\.\/)?styles\.css)(?:\?[^"\s]*)?"/, '$1?v=20261024"');
  const href = localePath(locale);
  const updatesLabel = escapeHtml(appNews[locale.hreflang].title);
  html = html.replace(/(<nav class="(?:nav-links|mobile-nav-menu-panel)"[^>]*>[\s\S]*?<\/nav>)/g, block => {
    if (block.includes("/updates/")) return block.replace(new RegExp(`(<a href="${href}"[^>]*>)[^<]*(</a>)`, 'g'), `$1${updatesLabel}$2`);
    const link = `        <a href="${href}">${updatesLabel}</a>\n`;
    if (block.includes('<a href="privacy-policy.html"')) return block.replace(/(\s*<a href="privacy-policy\.html")/, `\n${link}$1`);
    return block.replace("</nav>", `${link}</nav>`);
  });
  fs.writeFileSync(homepage, html);
}

const sitemapPath = path.join(root, "sitemap.xml");
let sitemap = fs.readFileSync(sitemapPath, "utf8");
sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/balkanconverter\.com\/[^<]*updates\/[^<]*<\/loc>[\s\S]*?<\/url>/g, "");
const sitemapAlternates = suffix => locales.map(locale => `    <xhtml:link rel="alternate" hreflang="${locale.hreflang}" href="${base}${localePath(locale, suffix)}" />`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${base}/updates/${suffix}" />`).join("\n");
const updateEntries = [];
for (const suffix of ["", "version-1-604/"]) {
  for (const locale of locales) {
    updateEntries.push(`  <url>\n    <loc>${base}${localePath(locale, suffix)}</loc>\n    <lastmod>${suffix ? '2026-10-15' : currentNewsLastmod}</lastmod>\n${sitemapAlternates(suffix)}\n  </url>`);
  }
}
sitemap = sitemap.replace(/\s*<\/urlset>\s*$/, `\n${updateEntries.join("\n")}\n</urlset>\n`);
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Generated ${locales.length * 2} localized update pages, updated ${locales.length} homepages, JSON catalog and sitemap.`);
