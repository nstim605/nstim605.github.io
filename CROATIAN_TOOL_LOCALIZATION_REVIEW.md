# Croatian web tools — jezična i urednička provjera

Datum lokalne provjere: 11. rujna 2026.

Status: **LANGUAGE QA PASS** za hrvatsku lokalizaciju svih osam web-alata. Ostale lokalizacije u ovom zadatku nisu mijenjane ni ponovno ocjenjivane.

## Izvor problema i rješenje

Prethodna verzija kombinirala je strojno prevedeni katalog s globalnim zamjenama pojedinačnih izraza. To je stvaralo kontekstno pogrešne izraze poput „stopa” umjesto „tečaj”, doslovne prijevode i gramatički nepravilne rečenice oko poveznica. Hrvatski alati sada koriste zaseban, kontekstno pregledan rječnik. Rečenice s poveznicama sastavljaju se kao cjelovite poruke s imenovanim mjestima za poveznice.

## Usvojena terminologija i ponašanje

- Exchange/reference rate: „tečaj” / „referentni tečaj”.
- Markup: razlika ponuđenog iznosa u odnosu na referentni rezultat; pozitivan postotak znači da je ponuđeni iznos manji, a negativan da je veći.
- Offline: jedna zajednička, ažurirana predmemorija; uspješan zahtjev zamjenjuje starije podatke, a pogreška ne briše prethodnu ispravnu kopiju.
- Widget: prikazuje spremljeni tečaj, stanje podataka i datum tečaja; otvara odabrani par; prošireni prikaz omogućuje zamjenu valuta.
- Fiksna naknada kartice/bankomata: unosi se u valuti kartice i dodaje samo procjeni plaćanja u lokalnoj valuti.
- DCC: uneseni konačni iznos ponude uspoređuje se kao zasebna cjelina; fiksna naknada ne dodaje mu se automatski.

## Pretvarač valuta

URL: `/hr/currency-converter/`

Title: Pretvarač valuta | Preračunavanje po aktualnom tečaju

Meta description: Pretvorite iznos između dvije valute s najnovijim dostupnim referentnim tečajevima. Pogledajte tečaj, datum tečaja i izvor podataka.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Besplatan alat za valute
Pretvarač valuta
Pretvorite iznos između dvije valute i pogledajte najnoviji dostupni referentni tečaj, njegov datum i izvor.
Iznos
IzEUR
URSD
Zamijeni valute
Pretvori valutu
Unesite iznos i odaberite dvije valute.
Vaša konverzija
Preračunati iznos
Rezultat
Referentni tečaj
Izvor podataka
Frankfurter API za referentne tečajeve
Brzi preračun po referentnom tečaju
Pretvarač izračunava unakrsni tečaj iz najnovijeg dostupnog skupa referentnih podataka. Rezultat je koristan za procjene i usporedbe, ali banka, kartična kuća ili mjenjačnica mogu ponuditi drukčiji tečaj transakcije.
Prikazani datum pokazuje na koji se tržišni dan odnose referentni podaci.
Trebate drukčiji prikaz?
Pogledajte kako se valutni par mijenjao u odjeljku Povijest tečaja; usporedite jedan iznos u više valuta pomoću Viševalutnog pretvarača; provjerite ponudu mjenjačnice u Kalkulatoru razlike tečaja; ili usporedite troškove plaćanja karticom, podizanja gotovine i DCC-a u Kalkulatoru naknada i DCC-a.
Više alata na Androidu
Preračunavajte valute uz Balkan Converter
Android aplikacija nudi kalkulator, spremljene tečajeve za rad bez interneta, Viševalutnu ploču, Stvarni trošak razmjene, spremljene skupove, povijest tečaja, grafikone i widget za početni zaslon.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Datum
- Datum tečaja nije dostupan.
- Dohvaćanje najnovijih referentnih tečajeva…
- Glavna navigacija
- Izbori analitike
- Iznos i tečajevi moraju biti pozitivni brojevi.
- Kalkulator razlike tečaja
- Konverzija je ažurirana prema najnovijim dostupnim referentnim tečajevima.
- Konverzija valuta za Android
- Navigacija podnožja
- Neobavezna analitika
- Neobavezno
- Odaberite dvije različite valute.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Converter
- Politika privatnosti
- Pomozite nam razumjeti kako se stranica koristi. Firebase Analytics ostaje isključen dok ne prihvatite.
- Preskoči na pretvarač
- Pretvarač valuta | Preračunavanje po aktualnom tečaju
- Pretvorite između dvije valute koristeći najnovije dostupne referentne tečajeve.
- Pretvorite iznos između dvije valute koristeći najnovije dostupne referentne tečajeve.
- Pretvorite iznos između dvije valute s najnovijim dostupnim referentnim tečajevima. Pogledajte tečaj, datum tečaja i izvor podataka.
- Preuzmite Balkan Currency Converter na Google Playu
- Preuzmite na Google Playu
- Prihvati analitiku
- Prijeđi na svijetlu temu
- Prijeđi na tamnu temu
- Privatnost
- Promijeni temu boja
- Referentni tečajevi za {date}.
- Saznajte više
- Tečaj
- Tečajeve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovno.
- Učitavanje najnovijih tečajeva…
- Unesite iznos veći od nule.
- Više valuta

## Kalkulator razlike tečaja

URL: `/hr/exchange-rate-markup-calculator/`

Title: Usporedba ponude s referentnim tečajem | Balkan Currency Converter

Meta description: Usporedite ponudu mjenjačnice s najnovijim referentnim tečajem. Izračunajte referentni rezultat, ponuđeni iznos i razliku između njih.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Besplatan alat za valute
Kalkulator razlike tečaja
Usporedite iznos koji nudi mjenjačnica s najnovijim dostupnim referentnim tečajem. Prije zamjene pogledajte razliku u novcu i postotku.
Polazna valuta
EUR — euro
Ciljna valuta
RSD — srpski dinar
Iznos za zamjenu
U izvornoj valuti
Ponuđeni iznos
Što biste dobili u ciljanoj valuti
Usporedi ponudu
Unesite ponudu koju želite usporediti.
Vaša usporedba
Rezultat ponude
Referentni tečaj
Referentni rezultat
Ponuđeni iznos
Dobivate manje za
Razlika u odnosu na referentni tečaj
Što znači postotak
Kalkulator najprije određuje iznos koji biste dobili po najnovijem dostupnom referentnom tečaju, a zatim ga uspoređuje s ponuđenim iznosom.
Pružatelj usluge može oglašavati razmjenu „bez provizije“, a ipak primjenjivati nepovoljniji tečaj. Ta razlika predstavlja trošak skriven u tečaju.
Razlika, % = (referentni rezultat − ponuđeni iznos) ÷ referentni rezultat × 100.
Važno je znati
Ovo je informativna usporedba, a ne financijski savjet. Ponuda može uključivati naknadu za uslugu, kartične troškove, rukovanje gotovinom ili tečajnu razliku pružatelja usluge. Referentni tečaj nije zajamčeni tečaj transakcije.
Uspoređujete plaćanje karticom ili podizanje gotovine s ponuđenom konverzijom u valutu kartice? Koristite Kalkulator naknada i DCC-a. Za brz preračun valutnog para otvorite Pretvarač valuta. Za usporedbu jednog iznosa u više valuta koristite Viševalutni pretvarač, a o spremljenim podacima pročitajte u vodiču za preračun bez interneta.
Trebate ovo u pokretu?
Usporedite troškove u aplikaciji Balkan Converter
Android aplikacija nudi Stvarni trošak razmjene, spremljene tečajeve za rad bez interneta, Viševalutnu ploču, spremljene skupove, grafikone i widget za početni zaslon.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Datum
- Dobivate više za
- Dohvaćanje najnovijih referentnih tečajeva…
- Glavna navigacija
- Izbori analitike
- Iznad referentnog rezultata za
- Iznosi i tečajevi moraju biti pozitivni brojevi.
- Izračun je ažuriran prema najnovijim dostupnim referentnim tečajevima.
- Konverzija valuta za Android
- Na primjer, 11 500
- Navigacija podnožja
- Neobavezna analitika
- Neobavezno
- Odaberite dvije različite valute.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Converter
- Podaci o referentnom tečaju nisu potpuni.
- Pogledajte koliko ponuda mjenjačnice odstupa od najnovijeg referentnog tečaja.
- Politika privatnosti
- Pomozite nam razumjeti kako se stranica koristi. Firebase Analytics ostaje isključen dok ne prihvatite.
- Ponuda je {percentage} ispod referentnog rezultata.
- Ponuda je {percentage} iznad referentnog rezultata.
- Preuzmite Balkan Currency Converter na Google Playu
- Preuzmite na Google Playu
- Prihvati analitiku
- Prijeđi na kalkulator
- Prijeđi na svijetlu temu
- Prijeđi na tamnu temu
- Privatnost
- Promijeni temu boja
- Referentni tečaj nije dostupan za ovaj valutni par.
- Referentni tečajevi za {date}.
- Saznajte više
- Servis nije vratio referentne tečajeve.
- Tečaj
- Tečajeve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovno.
- Učitavanje najnovijih tečajeva…
- Unesite dva iznosa veća od nule.
- Usporedba ponude s referentnim tečajem | Balkan Currency Converter
- Usporedite ponudu mjenjačnice s najnovijim referentnim tečajem i izračunajte razliku.
- Usporedite ponudu mjenjačnice s najnovijim referentnim tečajem.
- Usporedite ponudu mjenjačnice s najnovijim referentnim tečajem. Izračunajte referentni rezultat, ponuđeni iznos i razliku između njih.

## Viševalutni pretvarač

URL: `/hr/multi-currency-converter/`

Title: Viševalutni pretvarač | Jedan iznos u više valuta

Meta description: Preračunajte jedan iznos odjednom u više valuta po najnovijim dostupnim referentnim tečajevima. Besplatan alat Balkan Convertera.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Besplatan alat za valute
Viševalutni pretvarač
Unesite jedan iznos i odmah pogledajte njegovu vrijednost u više valuta po najnovijim dostupnim referentnim tečajevima.
Osnovna valutaEUR
Iznos
Ciljane valute+ Dodajte drugu valutu
Preračunaj valute
Odaberite valute koje želite usporediti.
Svi rezultati odjednom
Preračunati iznosi
Više valuta na putu
Prikaz više valuta koristan je kada uspoređujete cijene u različitim zemljama, planirate proračun u više valuta ili namjeravate posjetiti više zemalja.
Tečajevi su referentne vrijednosti i mogu se razlikovati od tečaja banke, kartice ili mjenjačnice.
Odaberite odgovarajući alat
Za jedan valutni par koristite Pretvarač valuta. Kretanje tečaja kroz vrijeme možete vidjeti u Povijesti tečaja, ponudu mjenjačnice provjeriti u Kalkulatoru razlike tečaja, a način rada bez interneta saznati u vodiču za preračun bez interneta.
Više valuta u pokretu
Koristite Viševalutnu ploču u aplikaciji Balkan Converter
Android aplikacija drži više valuta za putovanje na jednom mjestu, omogućuje promjenu redoslijeda i pripremu tečajeva za rad bez interneta.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Ciljane valute moraju se razlikovati od osnovne valute.
- Ciljna valuta
- Datum
- Dohvaćanje najnovijih referentnih tečajeva…
- Glavna navigacija
- Izbori analitike
- Iznos i osnovni tečaj moraju biti pozitivni brojevi.
- Kalkulator razlike tečaja
- Konverzija valuta za Android
- Konverzije su ažurirane prema najnovijim dostupnim referentnim tečajevima.
- Navigacija podnožja
- Neobavezna analitika
- Neobavezno
- Odaberite barem jednu ciljanu valutu.
- Odaberite svaku ciljanu valutu samo jednom.
- Odbij analitiku
- Ostavite barem jednu ciljnu valutu.
- Početna
- Početna stranica Balkan Currency Converter
- Politika privatnosti
- Pomozite nam razumjeti kako se stranica koristi. Firebase Analytics ostaje isključen dok ne prihvatite.
- Preračunajte jedan iznos istodobno u više valuta.
- Preračunajte jedan iznos odjednom u više valuta po najnovijim dostupnim referentnim tečajevima. Besplatan alat Balkan Convertera.
- Preračunajte jedan iznos u više valuta po najnovijim dostupnim referentnim tečajevima.
- Preskoči na pretvarač
- Preuzmite Balkan Currency Converter na Google Playu
- Preuzmite na Google Playu
- Prihvati analitiku
- Prijeđi na svijetlu temu
- Prijeđi na tamnu temu
- Privatnost
- Promijeni temu boja
- Referentni tečaj
- Referentni tečajevi za {date}.
- Saznajte više
- Tečajeve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovno.
- Učitavanje najnovijih tečajeva…
- Ukloni ciljanu valutu
- Unesite iznos veći od nule.
- Viševalutni pretvarač | Jedan iznos u više valuta
- Za svaku ciljnu valutu mora biti dostupan valjan tečaj.

## Pretvarač valuta bez interneta

URL: `/hr/offline-currency-converter/`

Title: Pretvarač valuta bez interneta | Kako rade spremljeni tečajevi

Meta description: Saznajte kako pretvarač valuta koristi spremljene tečajeve bez interneta i što se događa kada se internetska veza vrati.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Vodič za tečajeve bez interneta
Pretvarač valuta bez interneta: kako rade spremljeni tečajevi
Pretvarač može raditi bez interneta koristeći posljednje tečajeve koji su uspješno spremljeni na uređaju. Ti su tečajevi korisni kao referentni podaci, ali ostaju vezani uz svoj izvorni datum dok ih aplikacija ne osvježi putem interneta.
Jednostavna verzija
Od mrežnog osvježavanja do rada bez interneta
Spremanje tečaja ne čini ga vječnim. Stvara datiranu lokalnu kopiju koja se može ponovno upotrijebiti kada je mreža nedostupna.
Povežite se i osvježite
Aplikacija dohvaća najnoviji dostupni skup referentnih tečajeva te bilježi datum tečaja i vrijeme spremanja.
Zadržite posljednji uspješno spremljeni skup
Nakon uspješnog zahtjeva skup tečajeva sprema se na uređaj. Ako sljedeći zahtjev ne uspije, prethodna ispravna kopija ostaje dostupna.
Pretvorite bez interneta
Bez interneta preračuni koriste spremljeni skup te jasno prikazuju da se upotrebljavaju predmemorirani podaci i datum tečaja.
Što znači spremljeni tečaj za rad bez interneta
Spremljeni podaci preslika su posljednjeg uspješnog odgovora servisa za referentne tečajeve. Omogućuju preračunavanje bez mrežne veze, ali se vrijednosti ne ažuriraju dok je uređaj izvan mreže.
Uvijek provjerite prikazani datum tečaja. Rezultat zasnovan na jučerašnjim tečajevima može biti koristan za planiranje, ali ne jamči tečaj koji će banka, kartična kuća ili mjenjačnica ponuditi danas.
Što se događa kada se internet vrati?
Balkan Converter koristi jednu zajedničku lokalnu predmemoriju tečajeva za običnu konverziju i pripremu spremljenih skupova. Uspješno osvježavanje putem interneta zamjenjuje stariji skup te ažurira datum tečaja i vrijeme spremanja.
Ako osvježavanje ne uspije, aplikacija zadržava prethodne predmemorirane tečajeve umjesto da ih izbriše.
Pripremite spremljeni skup za rad bez interneta
U Android aplikaciji izradite ili otvorite spremljeni skup potrebnih valuta. Dok ste povezani s internetom, odaberite Spremi tečajeve za rad bez interneta. Aplikacija osvježava zajednički skup podataka tečaja i potvrđuje spremnost kada spremljena predmemorija sadrži sve valute u tom skupu.
Za svako putovanje ne postoji zaseban nepromjenjiv skup tečajeva. Priprema drugog skupa osvježava istu predmemoriju koja se koristi i u ostatku aplikacije.
Korisno i izvan putovanja
Preračunavanje bez interneta može pomoći pri slaboj vezi, prekidu roaminga, privremenoj nedostupnosti servisa ili u drugim situacijama kada je približna procjena korisnija od izostanka rezultata.
Za brz pristup posljednjem spremljenom valutnom paru otvorite vodič za Android widget. Za mrežni preračun koristite Pretvarač valuta, usporedite jedan iznos u više valuta u Viševalutnom pretvaraču ili provjerite ponudu mjenjačnice u Kalkulatoru razlike tečaja.
Neka vam spremljeni tečajevi budu pri ruci
Koristite spremljene tečajeve u aplikaciji Balkan Converter
Android aplikacija može bez veze koristiti posljednju uspješno spremljenu predmemoriju tečajeva te jasno označava predmemorirane podatke i datum tečaja.
```

### Dodatne dinamičke poruke

- Na ovoj stranici nema dodatnih dinamičkih poruka.

## Povijest i grafikon tečaja

URL: `/hr/exchange-rate-history/`

Title: Povijest i grafikon tečaja | Balkan Converter

Meta description: Pogledajte povijest tečaja valutnog para za 30 dana, 90 dana ili jednu godinu te pronađite referentni tečaj za određeni datum.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Alat za povijest tečaja
Povijest i grafikon tečaja
Istražite kako se valutni par kretao tijekom 30 dana, 90 dana ili jedne godine i potražite referentni tečaj za određeni datum.
Osnovna valutaEUR
Ciljna valutaRSD
Zamijeni valute
Razdoblje grafikona
30 dana
90 dana
1 godina
Prikaži povijest tečaja
Odaberite valutni par i razdoblje.
Povijesni trend
Povijest tečaja
Dnevni referentni tečajevi; ovo nije grafikon trgovanja unutar dana.
Najnoviji dostupni tečaj
Minimum
Maksimum
Prosjek
Izvor: javni Frankfurter API za referentne tečajeve.
Određeni dan
Pronađite povijesni tečaj
Datum
Pronađi povijesni tečaj
Koristit će se iste gore odabrane osnovne i ciljane valute.
Pretraživanje povijesnog tečaja
Referentni tečaj za taj datum
Tečaj
Stvarni datum podataka
Izvor podataka
Frankfurter API za referentne tečajeve
Što pokazuju povijesni referentni tečajevi
Svaka točka prikazuje objavljeni referentni tečaj za jedan datum. Minimum, maksimum i prosjek opisuju odabrano razdoblje i nisu prognoza.
Referentni tečaj može se razlikovati od tečaja banke, kartične kuće, servisa za prijenos novca ili mjenjačnice jer pružatelji mogu dodati naknadu ili tečajnu razliku.
Datumi i trendovi
Koristite grafikon da vidite smjer i varijaciju, a ne da predvidite sljedeći potez. Neki pružatelji usluga ne objavljuju svaki kalendarski dan. Ako API vrati podatke s drugog dostupnog datuma, pretraživanje će prijaviti taj stvarni datum umjesto da ga predstavi kao dan koji ste odabrali.
Za preračun po posljednjem dostupnom tečaju koristite Pretvarač valuta. Za usporedbu ponude mjenjačnice s referentnim rezultatom otvorite Kalkulator razlike tečaja.
Neka vam važni valutni parovi budu pri ruci
Pogledajte grafikone u aplikaciji Balkan Converter
Android aplikacija nudi grafikone tečaja za 30 dana, prikvačene parove, spremljene referentne tečajeve i druge valutne alate.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- API je vratio referentne podatke s datumom {date}.
- Dohvaćanje povijesnih referentnih tečajeva…
- Dohvaćanje referentnog tečaja za odabrani datum…
- Glavna navigacija
- Grafikon povijesti tečaja
- Izbori analitike
- Konverzija valuta za Android
- Navigacija podnožja
- Neobavezna analitika
- Neobavezno
- Nije moguće učitati povijesni tečaj za taj datum i par.
- Odaberite dvije različite valute.
- Odaberite važeći datum koji nije u budućnosti.
- Odaberite važeći povijesni datum.
- Odabrali ste {selectedDate}; najbliži dostupni objavljeni podaci koje vraća API imaju datum {date}.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Converter
- Pogledajte povijesne referentne tečajeve, prilagodljiv grafikon, statistiku razdoblja i tečaj za određeni datum.
- Pogledajte povijest tečaja valutnog para za 30 dana, 90 dana ili jednu godinu te pronađite referentni tečaj za određeni datum.
- Politika privatnosti
- Pomozite nam razumjeti kako se stranica koristi. Firebase Analytics ostaje isključen dok ne prihvatite.
- Postavke i grafikon povijesti tečaja
- Potreban je barem jedan valjani povijesni tečaj.
- Povijesne tečajeve nije moguće učitati. Provjerite vezu i pokušajte ponovno.
- Povijesni tečaj prema datumu
- Povijest i grafikon tečaja | Balkan Converter
- Povijest referentnog tečaja {base}/{quote} od {from} do {to}. Minimum: {minimum}, maksimum: {maximum}.
- Povijest tečaja {base}/{quote}
- Pretraživanje tečaja…
- Preuzmite Balkan Currency Converter na Google Playu
- Preuzmite na Google Playu
- Prihvati analitiku
- Prijeđi na povijest tečaja
- Prijeđi na svijetlu temu
- Prijeđi na tamnu temu
- Prikažite grafikon povijesnih referentnih tečajeva i potražite tečaj valute po datumu.
- Privatnost
- Promijeni temu boja
- Referentni tečaj za odabrani datum je učitan.
- Rezultat
- Saznajte više
- Servis je vratio neispravne podatke o povijesnom tečaju.
- Učitano je {count} referentnih tečajeva s datumom.
- Učitavanje povijesti…
- Više valuta
- Za ovaj odabir nisu dostupni povijesni tečajevi.
- Zadnji dostupni podaci u ovom razdoblju: {date}.

## Widget pretvarača valuta za Android

URL: `/hr/currency-converter-widget/`

Title: Widget pretvarača valuta za Android | Balkan Converter

Meta description: Dodajte widget pretvarača valuta na početni zaslon Android uređaja za brz pristup spremljenom tečaju, datumu tečaja, zamjeni valuta i otvaranju aplikacije.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Vodič za početni zaslon Android uređaja
Widget pretvarača valuta za Android
Držite važan valutni par na početnom zaslonu. Widget Balkan Convertera prikazuje spremljeni referentni tečaj i njegov datum, otvara taj par u aplikaciji, a u širem prikazu omogućuje brzu zamjenu valuta.
Kako dodati widget
Widget Balkan Convertera iz produkcijske verzije na uobičajenom početnom zaslonu Android uređaja.
Četiri brza koraka
Dodajte valutni widget
Nazivi opcija mogu se malo razlikovati među Android uređajima, ali je uobičajeni postupak na početnom zaslonu isti.
Pripremite par
Otvorite Balkan Converter, odaberite valute koje želite i dopustite da se najnoviji referentni tečajevi uspješno učitaju.
Otvorite odjeljak Widgeti
Dodirnite i držite prazno mjesto na početnom zaslonu Android uređaja, a zatim odaberite Widgeti.
Postavite ga
Pronađite Balkan Converter i povucite valutni widget na slobodno mjesto na početnom zaslonu.
Prilagodite veličinu i koristite ga
Prilagodite veličinu po potrebi. Dodirnite karticu kako biste otvorili taj par u aplikaciji; širi widget ima i gumb za zamjenu valuta.
Što widget prikazuje
Kartica prikazuje referentni tečaj za odabrani par plus oznaku svježine i datum tečaja. Svaki widget počinje s parom koji je zadnji korišten u aplikaciji, a zatim pamti vlastiti par.
Dodirom na widget otvara se Balkan Converter s već odabranim valutama. Na widgetu srednje širine gumb za zamjenu mijenja njihov redoslijed izravno na početnom zaslonu.
Zašto je datum bitan
Widget koristi posljednji uspješno spremljen skup tečajeva iz aplikacije; nije neovisan izvor tržišnih podataka uživo. Kada Balkan Converter uspješno osvježi tečajeve, instalirani widgeti dobivaju ažurirane predmemorirane podatke.
Bez interneta za približne izračune ostaje dostupan prethodni referentni tečaj, a datum pokazuje koliko su podaci svježi. Više o tome pročitajte u vodiču za preračun bez interneta.
Kompaktan ili širok prikaz?
Kompaktan prikaz zauzima manje mjesta, a tečaj i datum ostaju vidljivi. Proširite widget ako želite zaseban gumb za zamjenu valuta.
Pokretači sustava Android određuju točnu veličinu mreže, pa se dostupni koraci za promjenu veličine mogu razlikovati između telefona i tableta.
Kada trebate više valutnih parova
Otvorite aplikaciju kako biste unijeli iznos, izvršili preračun, pogledali grafikon tečaja, usporedili više valuta ili pripremili spremljene tečajeve za rad bez interneta.
Widget služi za brz pregled i otvaranje aplikacije, dok Balkan Converter omogućuje cijeli postupak preračunavanja.
Tečaj na prvi pogled
Dodajte Balkan Converter na svoj početni zaslon
Instalirajte Android aplikaciju, otvorite željeni valutni par i postavite widget na mjesto koje vam najviše odgovara.
```

### Dodatne dinamičke poruke

- Na ovoj stranici nema dodatnih dinamičkih poruka.

## Kalkulator naknada i DCC-a

URL: `/hr/foreign-transaction-fee-calculator/`

Title: Kalkulator naknada i DCC-a | Balkan Converter

Meta description: Usporedite plaćanje u lokalnoj valuti s DCC ponudom trgovca ili bankomata. Uključite postotnu i fiksnu naknadu prema aktualnim referentnim tečajevima.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Usporedba kartice i bankomata
Kalkulator naknada i DCC-a
Plaćati u lokalnoj valuti ili koristiti ponuđenu konverziju? Procijenite obje opcije prema najnovijem dostupnom referentnom tečaju i naknadama koje unesete.
Iznos kupnje ili podizanja gotovine
Iznos prikazan u lokalnoj valuti
Lokalna valuta
RSD
Valuta kartice
EUR
Naknada za transakciju u inozemstvu
Postotak preračunatog iznosa
Fiksna naknada za karticu ili bankomat
Unesite u valuti kartice. Ova se naknada dodaje samo procjeni plaćanja u lokalnoj valuti.
Ponuđeni konačni iznos DCC-a Neobavezno
Konačni iznos u valuti kartice koji prikazuje trgovac ili bankomat, uključujući naknade koje su već uračunate u ponudu
Usporedite mogućnosti plaćanja
Unesite transakciju i sve naknade koje znate.
Vaša procjena
Plaćanje u lokalnoj valuti
Referentni tečaj
Referentni preračunati iznos
Naknada za transakciju u inozemstvu
Fiksna naknada za karticu/bankomat
Procijenjeni ukupni iznos
Ponuđena konverzija (DCC)
Ponuđeni konačni iznos DCC-a
DCC je iznad referentnog rezultata za
Razlika DCC-a u odnosu na referentni tečaj
Razlika između opcija
Što je dinamička konverzija valuta (DCC)
Dinamička konverzija valuta (DCC) ponuda je trgovca ili bankomata da odmah preračuna transakciju u valutu kartice. Ako platite u lokalnoj valuti, konverziju obavlja banka ili platna mreža vaše kartice.
Kalkulator uspoređuje uneseni konačni iznos DCC ponude s procjenom zasnovanom na referentnom tečaju, postotnoj naknadi za transakciju u inozemstvu i fiksnoj naknadi.
Što ova procjena ne može znati
Vaša banka, platna mreža, trgovac ili bankomat mogu primijeniti drukčiji tečaj ili naplatiti dodatnu naknadu koju niste unijeli. Fiksna naknada bankomata odvojena je od postotne naknade za transakciju u inozemstvu.
Ovo je informativna usporedba unesenih vrijednosti, a ne financijski savjet ni jamstvo konačnog iznosa naplate.
Drugačija usporedba?
Koristite Kalkulator razlike tečaja ako želite samo usporediti ponudu mjenjačnice s referentnim rezultatom. Za običan preračun između dvije valute otvorite Pretvarač valuta.
Referentni tečaj i datum
Referentni tečaj služi kao neutralna osnova za usporedbu i ne jamči tečaj transakcije. Uz rezultat je prikazan tržišni datum koji je vratio Frankfurter API za referentne tečajeve.
Usporedite na svom telefonu
Provjerite ponude za razmjenu u aplikaciji Balkan Converter
Balkan Converter za Android ima zaslon Stvarni trošak razmjene za usporedbu ponude mjenjačnice i njezinih naknada s referentnim rezultatom.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Datum
- Datum referentnog tečaja nije dostupan.
- DCC je ispod referentnog rezultata
- DCC je ispod referentnog rezultata za
- Dohvaćanje najnovijih referentnih tečajeva…
- Glavna navigacija
- Izbori analitike
- Iznos i tečajevi moraju biti pozitivni brojevi.
- Kalkulator naknada i DCC-a | Balkan Converter
- Kalkulator naknada za transakcije u inozemstvu
- Konverzija valuta za Android
- Na primjer, 90
- Na temelju ovih vrijednosti, obje opcije imaju isti procijenjeni trošak.
- Na temelju ovih vrijednosti, plaćanje u lokalnoj valuti koštalo bi oko {difference} manje.
- Na temelju ovih vrijednosti, ponuđena konverzija koštala bi oko {difference} manje.
- Naknada za transakciju u inozemstvu ({percentage}%)
- Naknada za transakciju u inozemstvu, %
- Naknade ne mogu biti negativne.
- Navigacija podnožja
- Neobavezna analitika
- Odaberite dvije različite valute.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Converter
- Politika privatnosti
- Pomozite nam razumjeti kako se stranica koristi. Firebase Analytics ostaje isključen dok ne prihvatite.
- Ponuđeni iznos DCC-a mora biti veći od nule.
- Preuzmite Balkan Currency Converter na Google Playu
- Preuzmite na Google Playu
- Prihvati analitiku
- Prijeđi na kalkulator
- Prijeđi na svijetlu temu
- Prijeđi na tamnu temu
- Privatnost
- Procijenite troškove kartice u lokalnoj valuti i usporedite neobaveznu DCC ponudu.
- Promijeni temu boja
- Referentni tečaj nije dostupan za ovaj valutni par.
- Referentni tečajevi za {date}.
- Referentni tečajevi za {date}. Izvor: Frankfurter API za referentne tečajeve.
- Rezultat
- Saznajte više
- Tečaj
- Tečajeve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovno.
- Učitavanje najnovijih tečajeva…
- Unesite iznos kupnje ili podizanja gotovine veći od nule.
- Unesite konačni iznos DCC ponude veći od nule ili ostavite polje prazno.
- Unesite naknade od nula ili više.
- Usporedba je ažurirana prema najnovijim dostupnim referentnim tečajevima.
- Usporedite plaćanje karticom ili podizanje gotovine u lokalnoj valuti s ponuđenom konverzijom.
- Usporedite plaćanje u lokalnoj valuti s DCC ponudom trgovca ili bankomata. Uključite postotnu i fiksnu naknadu prema aktualnim referentnim tečajevima.
- Usporedite procijenjeni trošak plaćanja u lokalnoj valuti s neobaveznom ponudom dinamičke konverzije valuta (DCC).
- Za usporedbu obje opcije plaćanja unesite i neobavezni konačni iznos DCC ponude.

## Kalkulator proračuna putovanja

URL: `/hr/travel-budget-calculator/`

Title: Kalkulator proračuna putovanja u dvije valute | Balkan Converter

Meta description: Procijenite proračun putovanja po danima i kategorijama, dodajte fiksne troškove i rezervu te preračunajte ukupan iznos po aktualnom referentnom tečaju.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Natrag na Balkan Currency Converter
Besplatan alat za procjenu proračuna putovanja
Kalkulator proračuna putovanja
Procijenite trošak svog putovanja u dvije valute. Dodajte dnevne troškove, fiksne troškove i neobaveznu rezervu — registracija nije potrebna.
Odredišna valutaRSD
Matična valutaEUR
Broj dana putovanja
Smještaj po danu
Hrana po danu
Lokalni prijevoz po danu
Aktivnosti po danu
Fiksni troškovi putovanja NeobaveznoU odredišnoj valuti
Rezerva NeobaveznoPostotak dnevnih i fiksnih troškova
Izračunaj proračun putovanja
Unesite približne troškove u odredišnoj valuti.
Vaša procjena
Procijenjeni proračun putovanja
Dnevni proračun
Ukupan iznos prije rezerve
Pregled po kategorijama
Smještaj
Hrana
Lokalni prijevoz
Aktivnosti
Fiksni troškovi
Iznos rezerve
Konačni proračun u valuti odredišta
Konačni proračun u matičnoj valuti
Referentni tečaj:
Brza procjena, ne planer putovanja
Kalkulator množi približne dnevne troškove brojem dana, dodaje fiksne troškove, a zatim primjenjuje neobaveznu postotnu rezervu.
Koristite ga za utvrđivanje praktičnog početnog proračuna. Stvarne cijene, naknade za kartice i tečajevi mogu se promijeniti.
Kako funkcionira pretvorba valuta
Konačni proračun u valuti odredišta preračunava se po najnovijem dostupnom referentnom tečaju servisa Frankfurter. Uz svaki rezultat prikazani su datum tečaja i izvor.
Korisni valutni alati za putovanje
Usporedite jedan iznos u više valuta pomoću Viševalutnog pretvarača, obavite brz preračun u Pretvaraču valuta ili saznajte kako Android aplikacija koristi spremljene tečajeve bez interneta.
Što uključiti
Smještaj, prehrana, lokalni prijevoz i aktivnosti dnevni su iznosi. Dodajte letove, željezničke karte ili druge jednokratne troškove pod fiksne troškove putovanja.
Valute za vaše putovanje
Držite potrebne valute na jednom mjestu
Balkan Converter za Android nudi Viševalutnu ploču i spremljene skupove kako bi vam potrebne valute za putovanje bile pri ruci.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Dani putovanja moraju biti cijeli broj veći od nule.
- Datum
- Datum referentnog tečaja nije dostupan.
- Dohvaćanje najnovijih referentnih tečajeva…
- Frankfurter API za referentne tečajeve
- Glavna navigacija
- Izbori analitike
- Iznosi troškova i rezerva ne mogu biti negativni.
- Kalkulator proračuna putovanja u dvije valute | Balkan Converter
- Konverzija valuta za Android
- Navigacija podnožja
- Neobavezna analitika
- Odaberite dvije različite valute.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Converter
- Politika privatnosti
- Pomozite nam razumjeti kako se stranica koristi. Firebase Analytics ostaje isključen dok ne prihvatite.
- Pretvarač valuta
- Preuzmite Balkan Currency Converter na Google Playu
- Preuzmite na Google Playu
- Prihvati analitiku
- Prijeđi na kalkulator
- Prijeđi na svijetlu temu
- Prijeđi na tamnu temu
- Privatnost
- Procijenite dnevne troškove putovanja, fiksne troškove i rezervu u dvije valute.
- Procijenite proračun putovanja po danima i kategorijama, dodajte fiksne troškove i rezervu te preračunajte ukupan iznos po aktualnom referentnom tečaju.
- Procijenite proračun putovanja u valuti odredišta i matičnoj valuti.
- Procijenite proračun višednevnog putovanja po kategorijama u valuti odredišta i matičnoj valuti.
- Procjena proračuna ažurirana je prema najnovijim dostupnim referentnim tečajevima.
- Promijeni temu boja
- Referentni tečaj nije dostupan za ovaj valutni par.
- Referentni tečajevi moraju biti pozitivni.
- Referentni tečajevi za {date}.
- Referentni tečajevi za {date}. Izvor: Frankfurter API za referentne tečajeve.
- Rezerva, %
- Rezultat
- Saznajte više
- Tečaj
- Tečajeve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovno.
- Učitavanje najnovijih tečajeva…
- Unesite barem jedan iznos proračuna veći od nule.
- Unesite cijeli broj dana putovanja veći od nule.
- Unesite nenegativne iznose troškova i rezerve.
- Unesite važeće brojeve u svako polje.
- Više valuta
- Viševalutni pretvarač

## Proračun i tehnički QA

- Formula razlike nije mijenjana: uz referentni rezultat 100 i ponudu 95 rezultat je +5%; uz ponudu 105 rezultat je −5%.
- Hrvatski unos s razmakom za grupiranje tisuća i decimalnim zarezom provjeren je u browser QA-u.
- Browser QA obuhvaća svih 8 stranica na širinama 320, 390 i 1440 px, interaktivna stanja alata, mrežnu pogrešku i učitavanje značke Google Playa. Detaljan rezultat: `artifacts/croatian-localization-review/browser-qa.json`.

## Neriješena pitanja

Nema. Promjene su ograničene na lokalni commit; push i deployment nisu izvršeni.
