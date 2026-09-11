# Bosnian web tools — jezička i urednička provjera

Datum lokalne provjere: 11. septembar 2026.

Status: **LANGUAGE QA PASS** za bosansku lokalizaciju svih osam web-alata. Ostale lokalizacije u ovom zadatku nisu mijenjane niti ponovo ocjenjivane.

## Izvor problema i rješenje

Prethodna verzija koristila je neujednačen mašinski preveden katalog. U njemu su se miješali izrazi „stopa”, „tečaj”, „kurs”, „bafer”, „međuspremnik”, hrvatski i srpski oblici te pojedini engleski ostaci. Bosanski alati sada koriste zaseban, kontekstno pregledan rječnik. Rečenice s linkovima sastavljaju se kao cjelovite poruke s imenovanim mjestima za linkove.

## Usvojena terminologija i ponašanje

- Exchange/reference rate: „kurs” / „referentni kurs”.
- Markup: razlika ponuđenog iznosa u odnosu na referentni rezultat; pozitivan procenat znači da je ponuđeni iznos manji, a negativan da je veći.
- Offline: jedna zajednička, ažurirana predmemorija; uspješan zahtjev zamjenjuje starije podatke, a greška ne briše prethodnu ispravnu kopiju.
- Widget: prikazuje sačuvani kurs, stanje podataka i datum kursa; otvara odabrani par; širi prikaz omogućava zamjenu valuta.
- Fiksna naknada kartice/bankomata: unosi se u valuti kartice i dodaje samo procjeni plaćanja u lokalnoj valuti.
- DCC: uneseni konačni iznos ponude poredi se kao zasebna cjelina; fiksna naknada ne dodaje mu se automatski.
- Travel Budget: „rezerva” označava neobavezni procenat za nepredviđene troškove.

## Konverter valuta

URL: `/bs/currency-converter/`

Title: Konverter valuta | Konverzija prema aktuelnim kursevima

Meta description: Konvertujte iznos između dvije valute prema najnovijim dostupnim referentnim kursevima. Pogledajte kurs, datum kursa i izvor podataka.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Besplatan valutni alat
Konverter valuta
Konvertujte iznos između dvije valute i pogledajte najnoviji dostupni referentni kurs, njegov datum i izvor.
Iznos
OdEUR
URSD
Zamijenite valute
Konvertujte valutu
Unesite iznos i odaberite dvije valute.
Vaša konverzija
Preračunati iznos
Rezultat
Referentni kurs
Izvor podataka
Frankfurter API za referentne kurseve
Brza konverzija po referentnom kursu
Ovaj konverter izračunava unakrsni kurs iz najnovijeg dostupnog skupa referentnih kurseva. Koristan je za procjene i poređenja, ali banka, kartična kuća ili mjenjačnica mogu ponuditi drugačiji kurs za transakciju.
Prikazani datum vam govori koji tržišni dan predstavljaju referentni podaci.
Trebate drugačiji pogled?
Pogledajte kako se valutni par mijenjao u odjeljku Historija kursa; uporedite jedan iznos u više valuta pomoću Viševalutnog konvertera; provjerite ponudu mjenjačnice u Kalkulatoru razlike kursa; ili uporedite troškove plaćanja karticom, podizanja gotovine i DCC-a u Kalkulatoru naknada i DCC-a.
Više alata na Androidu
Konvertujte uz Balkan Converter
Android aplikacija nudi kalkulator, kurseve bez interneta, Travel Board, Actual Cost, sačuvane skupove, historiju, grafikone i widget za početni ekran.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Datum
- Datum kursa nije dostupan.
- Glavna navigacija
- Izbor analitike
- Iznos i kursevi moraju biti pozitivni brojevi.
- Kalkulator razlike kursa
- Konverter valuta | Konverzija prema aktuelnim kursevima
- Konvertujte između dvije valute koristeći najnovije dostupne referentne kurseve.
- Konvertujte iznos između dvije valute koristeći najnovije dostupne referentne kurseve.
- Konvertujte iznos između dvije valute prema najnovijim dostupnim referentnim kursevima. Pogledajte kurs, datum kursa i izvor podataka.
- Konverzija je ažurirana prema najnovijim dostupnim referentnim kursevima.
- Konverzija valuta za Android
- Kurs
- Kurseve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovo.
- Nabavite Balkan Currency Converter na Google Play
- Nabavite ga na Google Play
- Navigacija u podnožju
- Neobavezna analitika
- Neobavezno
- Odaberite dvije različite valute.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Convertera
- Politika privatnosti
- Pomozite nam da razumijemo upotrebu stranice. Firebase Analytics ostaje isključen osim ako ne prihvatite.
- Prebacite se na svijetlu temu
- Prebacite se na tamnu temu
- Preskoči na pretvarač
- Prihvatite analitiku
- Privatnost
- Promijenite temu boja
- Referentni kursevi za {date}.
- Saznajte više
- Učitavanje najnovijih kurseva…
- Učitavanje najnovijih referentnih kurseva…
- Unesite iznos veći od nule.
- Više valuta

## Kalkulator razlike kursa

URL: `/bs/exchange-rate-markup-calculator/`

Title: Kalkulator razlike kursa | Balkan Currency Converter

Meta description: Uporedite ponudu mjenjačnice s najnovijim referentnim kursom. Izračunajte koliko ćete dobiti, kolika je razlika i procentualno odstupanje od referentnog rezultata.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Besplatan valutni alat
Kalkulator razlike kursa
Uporedite iznos koji nudi mjenjačnica s najnovijim dostupnim referentnim kursom. Prije zamjene pogledajte razliku i procentualno odstupanje.
Izvorna valuta
EUR — Euro
Ciljna valuta
RSD — Srpski dinar
Iznos koji dajete
U izvornoj valuti
Iznos koji vam se nudi
Šta biste dobili u ciljnoj valuti
Izračunaj razliku
Unesite ponudu koju želite da uporedite.
Vaše poređenje
Rezultat ponude mjenjačnice
Referentni kurs
Referentni rezultat
Ponuđeni rezultat
Manje primate
Razlika kursa
Šta znači procenat
Kalkulator prvo procjenjuje iznos prema najnovijem referentnom kursu, a zatim ga poredi s ponuđenim iznosom.
Pružalac usluge može oglašavati ponudu „bez provizije“, a ipak koristiti nepovoljniji kurs. Ta razlika je zapravo trošak ugrađen u kurs.
Razlika, % = (referentni rezultat − ponuđeni rezultat) ÷ referentni rezultat × 100.
Važno je znati
Ovo je informativno poređenje, a ne finansijski savjet. Ponuda može uključivati naknadu za uslugu, kartičnu naknadu, trošak obrade gotovine ili razliku koju zadržava pružalac usluge. Referentni kursevi nisu zagarantovani kursevi transakcije.
Poredite plaćanje karticom ili podizanje gotovine s ponuđenom konverzijom u valutu kartice? Koristite Kalkulator naknada i DCC-a. Za brzu konverziju valutnog para otvorite Konverter valuta. Za poređenje jednog iznosa u više valuta koristite Viševalutni konverter, a o sačuvanim podacima pročitajte u vodiču za konverziju bez interneta.
Trebate ovo u pokretu?
Uporedite troškove u aplikaciji Balkan Converter
Android aplikacija nudi Actual Cost, kurseve bez interneta, Travel Board, sačuvane skupove, grafikone i widget za početni ekran.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Datum
- Glavna navigacija
- Izbor analitike
- Iznad referentnog rezultata za
- Iznosi i kursevi moraju biti pozitivni brojevi.
- Izračun je ažuriran prema najnovijim dostupnim referentnim kursevima.
- Kalkulator razlike kursa | Balkan Currency Converter
- Konverzija valuta za Android
- Kurs
- Kurseve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovo.
- Na primjer, 11 500
- Nabavite Balkan Currency Converter na Google Play
- Nabavite ga na Google Play
- Navigacija u podnožju
- Neobavezna analitika
- Neobavezno
- Nisu vraćeni referentni kursevi.
- Odaberite dvije različite valute.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Convertera
- Podaci o referentnom kursu nisu potpuni.
- Pogledajte koliko ponuđeni iznos odstupa od najnovijeg referentnog kursa.
- Politika privatnosti
- Pomozite nam da razumijemo upotrebu stranice. Firebase Analytics ostaje isključen osim ako ne prihvatite.
- Ponuda je {percentage} ispod referentnog rezultata.
- Ponuda je {percentage} iznad referentnog rezultata.
- Prebacite se na svijetlu temu
- Prebacite se na tamnu temu
- Preskočite na kalkulator
- Prihvatite analitiku
- Privatnost
- Promijenite temu boja
- Referentni kurs nije dostupan za ovaj valutni par.
- Referentni kursevi za {date}.
- Saznajte više
- Učitavanje najnovijih kurseva…
- Učitavanje najnovijih referentnih kurseva…
- Unesite dva iznosa veća od nule.
- Uporedite ponudu mjenjačnice s najnovijim referentnim kursom i izračunajte procentualno odstupanje.
- Uporedite ponudu mjenjačnice s najnovijim referentnim kursom.
- Uporedite ponudu mjenjačnice s najnovijim referentnim kursom. Izračunajte koliko ćete dobiti, kolika je razlika i procentualno odstupanje od referentnog rezultata.
- Više primate

## Viševalutni konverter

URL: `/bs/multi-currency-converter/`

Title: Viševalutni konverter | Jedan iznos u više valuta

Meta description: Konvertujte jedan iznos u više valuta odjednom prema najnovijim dostupnim referentnim kursevima. Besplatan viševalutni konverter Balkan Convertera.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Besplatan valutni alat
Viševalutni konverter
Unesite jedan iznos i uporedite njegovu vrijednost u više valuta istovremeno prema najnovijim dostupnim referentnim kursevima.
Osnovna valutaEUR
Iznos
Ciljane valute+ Dodajte drugu valutu
Konvertujte valute
Odaberite valute koje želite uporediti.
Na prvi pogled
Preračunati iznosi
Uporedite valute za putovanje na jednom mjestu
Viševalutni prikaz je koristan kada putovanje prelazi nekoliko zemalja, kada poredite cijene na različitim tržištima ili kada planirate budžet u više od jedne valute.
Kursevi su referentne vrijednosti i mogu se razlikovati od kursa koji nudi banka, kartična kuća ili mjenjačnica.
Odaberite odgovarajući prikaz
Za jedan valutni par koristite Konverter valuta. Kretanje kursa kroz vrijeme možete vidjeti u Historiji kursa, ponudu mjenjačnice provjeriti u Kalkulatoru razlike kursa, a način rada bez interneta saznati u vodiču za konverziju bez interneta.
Više valuta u pokretu
Koristite Travel Board u aplikaciji Balkan Converter
Android aplikacija drži više valuta za putovanje na jednom mjestu, omogućava promjenu njihovog redoslijeda i pripremu kurseva za rad bez interneta.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Ciljane valute moraju se razlikovati od osnovne valute.
- Ciljna valuta
- Datum
- Glavna navigacija
- Izbor analitike
- Iznos i osnovni kurs moraju biti pozitivni brojevi.
- Kalkulator razlike kursa
- Konvertujte jedan iznos u više valuta odjednom prema najnovijim dostupnim referentnim kursevima. Besplatan viševalutni konverter Balkan Convertera.
- Konvertujte jedan iznos u više valuta prema najnovijim dostupnim referentnim kursevima.
- Konverzija valuta za Android
- Konverzije su ažurirane prema najnovijim dostupnim referentnim kursevima.
- Kurseve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovo.
- Nabavite Balkan Currency Converter na Google Play
- Nabavite ga na Google Play
- Navigacija u podnožju
- Neobavezna analitika
- Neobavezno
- Odaberite barem jednu ciljnu valutu.
- Odaberite svaku ciljnu valutu samo jednom.
- Odbij analitiku
- Početna
- Početna stranica Balkan Currency Convertera
- Politika privatnosti
- Pomozite nam da razumijemo upotrebu stranice. Firebase Analytics ostaje isključen osim ako ne prihvatite.
- Prebacite se na svijetlu temu
- Prebacite se na tamnu temu
- Preskoči na pretvarač
- Pretvorite jedan iznos u nekoliko valuta u isto vrijeme.
- Prihvatite analitiku
- Privatnost
- Promijenite temu boja
- Referentni kurs
- Referentni kursevi za {date}.
- Saznajte više
- Učitavanje najnovijih kurseva…
- Učitavanje najnovijih referentnih kurseva…
- Uklonite ciljnu valutu
- Unesite iznos veći od nule.
- Viševalutni konverter | Jedan iznos u više valuta
- Za svaku ciljnu valutu potreban je važeći kurs.
- Zadržite barem jednu ciljnu valutu.

## Konverter valuta bez interneta

URL: `/bs/offline-currency-converter/`

Title: Konverter valuta bez interneta | Kako rade sačuvani kursevi

Meta description: Saznajte kako konverter valuta koristi sačuvane kurseve bez interneta i šta se mijenja kada se veza ponovo uspostavi.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Vodič za kurseve bez interneta
Konverter valuta bez interneta: kako rade sačuvani kursevi
Konverter može raditi bez interneta koristeći najnovije kurseve koji su uspješno sačuvani na uređaju. Ti referentni podaci zadržavaju svoj izvorni datum sve dok ih aplikacija ponovo ne osvježi putem interneta.
Jednostavna verzija
Od osvježavanja putem interneta do konverzije bez interneta
Sačuvani kurs nije trajno ažuriran uživo. Aplikacija čuva lokalnu kopiju s datumom koja se može ponovo koristiti kada internet nije dostupan.
Povežite se na internet i osvježite podatke
Aplikacija učitava najnoviji dostupni skup referentnih kurseva te bilježi datum kursa i vrijeme čuvanja podataka.
Zadržite posljednje uspješno osvježavanje
Nakon uspješnog zahtjeva podaci se čuvaju na uređaju. Ako naredni zahtjev ne uspije, prethodna ispravna kopija ostaje dostupna.
Konvertujte bez interneta
Bez interneta konverzije koriste taj sačuvani skup. Aplikacija jasno prikazuje da koristi podatke iz predmemorije i navodi datum kursa.
Šta znači kurs sačuvan za rad bez interneta
Sačuvani podaci predstavljaju snimak posljednjeg uspješno učitanog skupa referentnih kurseva. Omogućavaju izračun bez mrežne veze, ali se vrijednosti ne ažuriraju dok je uređaj bez interneta.
Uvijek provjerite prikazani datum kursa. Rezultat prema jučerašnjim kursevima može biti koristan za planiranje, ali ne garantuje kurs koji će banka, kartična kuća ili mjenjačnica ponuditi danas.
Šta se dešava kada se internet vrati?
Balkan Converter koristi jednu zajedničku lokalnu predmemoriju kurseva za redovnu konverziju i pripremu sačuvanih skupova. Uspješno osvježavanje putem interneta zamjenjuje starije podatke te ažurira datum kursa i vrijeme čuvanja.
Ako osvježavanje ne uspije, aplikacija nastavlja koristiti prethodno sačuvane kurseve umjesto da ih izbriše.
Pripremite sačuvani skup za rad bez interneta
U Android aplikaciji napravite ili otvorite sačuvani skup željenih valuta. Dok imate internetsku vezu, odaberite Sačuvaj kurseve za rad bez interneta. Aplikacija osvježava zajednički skup kurseva i potvrđuje spremnost kada sačuvana predmemorija sadrži svaku valutu iz tog skupa.
Za svako putovanje ne postoji zasebna, zamrznuta kopija kursa. Priprema drugog skupa osvježava istu predmemoriju koja se koristi i u ostatku aplikacije.
Korisno izvan putovanja
Konverzija bez interneta može pomoći kada je veza slaba, roaming privremeno ne radi ili usluga nije dostupna — kad god je približan referentni izračun korisniji od toga da rezultata nema.
Za brz pristup posljednjem sačuvanom valutnom paru otvorite vodič za Android widget. Za konverziju putem interneta koristite Konverter valuta, uporedite jedan iznos u više valuta u Viševalutnom konverteru ili provjerite ponudu mjenjačnice u Kalkulatoru razlike kursa.
Sačuvajte kurs s njegovim datumom
Koristite sačuvane kurseve u aplikaciji Balkan Converter
Android aplikacija može bez internetske veze koristiti posljednju uspješno sačuvanu predmemoriju kurseva te jasno označava sačuvane podatke i datum kursa.
```

### Dodatne dinamičke poruke

- Na ovoj stranici nema dodatnih dinamičkih poruka.

## Historija kursa i valutni grafikon

URL: `/bs/exchange-rate-history/`

Title: Historija kursa i valutni grafikon | Balkan Converter

Meta description: Pregledajte historiju kursa za 30, 90 ili 365 dana, prikažite valutni par na grafikonu i pronađite referentni kurs za određeni datum.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Alat za historijske referentne kurseve
Historija kursa i valutni grafikon
Istražite kako se valutni par kretao tokom 30 dana, 90 dana ili jedne godine i potražite referentni kurs za određeni datum.
Osnovna valutaEUR
Ciljna valutaRSD
Zamijenite valute
Period grafikona
30 dana
90 dana
1 godina
Prikaži historiju kursa
Odaberite valutni par i period.
Historijsko kretanje
Historija kursa
Grafikon prikazuje dnevne referentne kurseve, a ne promjene tokom jednog trgovačkog dana.
Najnoviji dostupni kurs
Minimum
Maksimum
Prosjek
Izvor: javni Frankfurter API za referentne kurseve.
Određen dan
Pronađite historijski kurs
Datum
Pronađi historijski kurs
Koristit će se ista osnovna i ciljna valuta odabrana iznad.
Pretraga historijskog kursa
Referentni kurs na taj datum
Kurs
Stvarni datum podataka
Izvor podataka
Frankfurter API za referentne kurseve
Šta pokazuju historijski referentni kursevi
Svaka tačka predstavlja objavljeni referentni kurs za jedan datum. Minimum, maksimum i prosjek sažimaju odabrani period; nisu prognoza budućeg kretanja.
Referentni kursevi mogu se razlikovati od kursa banke, kartične kuće, servisa za prijenos novca ili mjenjačnice jer pružaoci usluga mogu dodati naknadu ili razliku u kursu.
Datumi i trendovi
Koristite grafikon da vidite smjer i promjene, a ne da predviđate buduće kretanje. Podaci se ne objavljuju svakog kalendarskog dana. Ako API vrati podatke za drugi dostupni datum, prikazuje se stvarni datum tih podataka, a ne odabrani datum.
Za konverziju prema posljednjem dostupnom kursu koristite Konverter valuta. Za poređenje ponude mjenjačnice s referentnim rezultatom otvorite Kalkulator razlike kursa.
Držite korisne parove blizu
Pogledajte grafikone u aplikaciji Balkan Converter
Android aplikacija nudi grafikone kursa za 30 dana, prikvačene parove, referentne kurseve bez interneta i druge valutne alate.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- API je vratio referentne podatke sa datumom {date}.
- Glavna navigacija
- Grafikon historije kursa
- Historija kursa {base}/{quote}
- Historija kursa i valutni grafikon | Balkan Converter
- Historija referentnog kursa {base}/{quote} od {from} do {to}. Minimum {minimum}, maksimum {maximum}.
- Historijske kurseve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovo.
- Historijski kurs prema datumu
- Historijski referentni kurs je učitan.
- Izbor analitike
- Konverzija valuta za Android
- Nabavite Balkan Currency Converter na Google Play
- Nabavite ga na Google Play
- Najnoviji dostupni podaci u ovom periodu: {date}.
- Navigacija u podnožju
- Neobavezna analitika
- Neobavezno
- Odaberite dvije različite valute.
- Odaberite važeći datum koji nije u budućnosti.
- Odaberite važeći historijski datum.
- Odabrali ste {selectedDate}; najbliži dostupni podaci koje je API vratio imaju datum {date}.
- Odbij analitiku
- Odgovor za historijski kurs nije ispravan.
- Početna
- Početna stranica Balkan Currency Convertera
- Pogledajte historijske referentne kurseve, prilagodljiv valutni grafikon, statistiku perioda i kurs za određeni datum.
- Politika privatnosti
- Pomozite nam da razumijemo upotrebu stranice. Firebase Analytics ostaje isključen osim ako ne prihvatite.
- Postavke perioda i grafikon historije kursa
- Potreban je najmanje jedan važeći historijski kurs.
- Prebacite se na svijetlu temu
- Prebacite se na tamnu temu
- Pređi na historiju kursa
- Pregledajte historiju kursa za 30, 90 ili 365 dana, prikažite valutni par na grafikonu i pronađite referentni kurs za određeni datum.
- Prihvatite analitiku
- Prikažite historijske referentne kurseve na grafikonu i pronađite kurs za određeni datum.
- Privatnost
- Promijenite temu boja
- Rezultat
- Saznajte više
- Traženje kursa…
- Učitano je {count} referentnih kurseva s datumom.
- Učitavanje historije…
- Učitavanje historijskih referentnih kurseva…
- Učitavanje historijskog referentnog kursa…
- Više valuta
- Za ovaj izbor nema dostupnih historijskih kurseva.
- Za taj datum i valutni par nije moguće učitati historijski kurs.

## Widget konvertera valuta za Android

URL: `/bs/currency-converter-widget/`

Title: Widget konvertera valuta za Android | Balkan Converter

Meta description: Dodajte widget konvertera valuta na početni ekran Androida za brz pristup sačuvanom kursu, datumu kursa, zamjeni valuta i prečici do aplikacije.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Vodič za početni ekran Androida
Widget konvertera valuta za Android
Držite koristan valutni par na početnom ekranu. Widget Balkan Convertera prikazuje sačuvani referentni kurs i njegov datum, otvara taj par u aplikaciji te u širem prikazu omogućava brzu zamjenu valuta.
Kako dodati widget
Widget Balkan Convertera na uobičajenom početnom ekranu Androida.
Četiri brza koraka
Dodajte widget za valute
Nazivi opcija u pokretaču mogu se malo razlikovati među Android uređajima, ali je uobičajeni postupak na početnom ekranu isti.
Pripremite par
Otvorite Balkan Converter, odaberite željene valute i sačekajte da se najnoviji referentni kursevi uspješno učitaju.
Otvorite odjeljak Widgeti
Dodirnite i zadržite prst na praznom dijelu početnog ekrana Androida, a zatim odaberite Widgeti.
Postavite widget
Pronađite Balkan Converter i prevucite widget za valute na slobodan dio početnog ekrana.
Promijenite veličinu i koristite
Prilagodite veličinu widgeta. Dodirnite karticu da otvorite taj par u aplikaciji; širi widget prikazuje i dugme za zamjenu valuta.
Šta widget prikazuje
Kartica prikazuje referentni kurs odabranog para, oznaku svježine podataka i datum kursa. Svaki novi widget počinje s parom koji je posljednji korišten u aplikaciji, a zatim pamti vlastiti par.
Dodirom na widget otvara se Balkan Converter s već odabranim valutama. U srednje širokom prikazu dugme za zamjenu obrće par direktno na početnom ekranu.
Zašto je datum bitan
Widget koristi posljednji uspješno sačuvani skup kurseva iz aplikacije; nije zaseban izvor tržišnih podataka uživo. Kada Balkan Converter uspješno osvježi kurseve, instalirani widgeti dobijaju ažurirane podatke iz predmemorije.
Bez interneta za približne izračune ostaje dostupan prethodni referentni kurs, a datum pokazuje starost podataka. Više o tome pročitajte u vodiču za konverziju bez interneta.
Mali ili široki raspored?
Kompaktni prikaz zadržava kurs i datum na manjem prostoru. Proširite widget kada uz kurs želite i posebno dugme za zamjenu valuta.
Android pokretači određuju veličinu mreže, pa se dostupne mogućnosti promjene veličine mogu razlikovati između telefona i tableta.
Za više od jednog brzog para
Otvorite aplikaciju da unesete iznos, izvršite konverziju, pogledate grafikon kursa, uporedite više valuta ili pripremite sačuvane kurseve za rad bez interneta.
Widget služi za brz pregled i kao prečica, dok Balkan Converter nudi cijeli postupak konverzije.
Konverzija na prvi pogled
Dodajte Balkan Converter na svoj početni ekran
Instalirajte Android aplikaciju, učitajte željeni valutni par i postavite widget na lako dostupno mjesto na početnom ekranu.
```

### Dodatne dinamičke poruke

- Na ovoj stranici nema dodatnih dinamičkih poruka.

## Kalkulator naknada i DCC-a

URL: `/bs/foreign-transaction-fee-calculator/`

Title: Kalkulator naknada i DCC-a | Balkan Converter

Meta description: Uporedite plaćanje karticom ili podizanje gotovine u lokalnoj valuti s DCC ponudom. Uključite procentualnu i fiksnu naknadu uz aktuelne referentne kurseve.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Poređenje kartica i bankomata
Kalkulator naknada i DCC-a
Plaćati u lokalnoj valuti ili koristiti ponuđenu konverziju? Procijenite obje mogućnosti prema najnovijem dostupnom referentnom kursu i naknadama koje unesete.
Iznos kupovine ili podizanja
Iznos prikazan u lokalnoj valuti
Lokalna valuta
RSD
Valuta kartice
EUR
Naknada za transakciju u inostranstvu
Procenat koji se obračunava na konvertovani iznos
Fiksna naknada za karticu ili bankomat
Dodaje se procjeni plaćanja u lokalnoj valuti, a unosi se u valuti kartice
Ponuđeni konačni iznos DCC-a Neobavezno
Konačni iznos u valuti kartice koji prikazuje trgovac ili bankomat, uključujući tamo navedene naknade
Uporedite opcije plaćanja
Unesite transakciju i sve naknade koje znate.
Vaša procjena
Plaćanje u lokalnoj valuti
Referentni kurs
Referentni preračunati iznos
Naknada za transakciju u inostranstvu
Fiksna naknada za karticu/bankomat
Procijenjeni ukupni iznos
Ponuđena konverzija (DCC)
Ponuđeni konačni iznos DCC-a
DCC je iznad referentnog rezultata za
Odstupanje DCC-a od referentnog kursa
Razlika između opcija
Šta znači dinamička konverzija valuta (DCC)
Dinamička konverzija valuta (DCC) ponuda je trgovca ili bankomata da transakciju odmah preračuna u valutu kartice. Ako platite u lokalnoj valuti, konverziju obavlja banka ili kartična mreža.
Kalkulator poredi uneseni konačni iznos DCC-a s procjenom zasnovanom na referentnom kursu, procentualnoj naknadi za transakciju u inostranstvu i fiksnoj naknadi.
Šta ova procjena ne može znati
Vaša banka, kartična mreža, trgovac ili bankomat mogu koristiti drugačiji kurs ili naplatiti naknadu koju niste unijeli. Fiksna naknada bankomata odvojena je od procentualne naknade za transakciju u inostranstvu.
Ovo je informativno poređenje unesenih vrijednosti, a ne finansijski savjet ili obećanje konačnog naplaćenog iznosa.
Drugačije poređenje?
Koristite Kalkulator razlike kursa ako želite samo uporediti ponudu mjenjačnice s referentnim rezultatom. Za običnu konverziju između dvije valute otvorite Konverter valuta.
Referentni kurs i datum
Referentni kursevi služe kao neutralna osnova za poređenje, a nisu zagarantovani kursevi transakcije. Rezultat prikazuje tržišni datum koji vraća Frankfurter API.
Uporedite na svom telefonu
Provjerite ponude mjenjačnice u aplikaciji Balkan Converter
Balkan Converter za Android nudi Actual Cost za poređenje ponude mjenjačnice i naknada s referentnim rezultatom.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Datum
- Datum referentnog kursa nije dostupan.
- DCC je ispod referentnog rezultata
- DCC je ispod referentnog rezultata za
- Frankfurter API za referentne kurseve
- Glavna navigacija
- Izbor analitike
- Iznos i kursevi moraju biti pozitivni brojevi.
- Kalkulator naknada i DCC-a | Balkan Converter
- Kalkulator naknade za transakciju u inostranstvu
- Konverzija valuta za Android
- Kurs
- Kurseve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovo.
- Na osnovu ovih vrijednosti, obje opcije imaju istu procijenjenu cijenu.
- Na osnovu ovih vrijednosti, plaćanje u lokalnoj valuti koštalo bi oko {difference} manje.
- Na osnovu ovih vrijednosti, ponuđena konverzija bi koštala oko {difference} manje.
- Na primjer, 90
- Nabavite Balkan Currency Converter na Google Play
- Nabavite ga na Google Play
- Naknada za transakciju u inostranstvu ({percentage}%)
- Naknade ne mogu biti negativne.
- Navigacija u podnožju
- Neobavezna analitika
- Odaberite dvije različite valute.
- Odbij analitiku
- Po želji unesite ponuđeni konačni iznos DCC-a kako biste uporedili obje mogućnosti plaćanja.
- Početna
- Početna stranica Balkan Currency Convertera
- Politika privatnosti
- Pomozite nam da razumijemo upotrebu stranice. Firebase Analytics ostaje isključen osim ako ne prihvatite.
- Ponuđeni iznos DCC-a mora biti veći od nule.
- Poređenje je ažurirano prema najnovijim dostupnim referentnim kursevima.
- Prebacite se na svijetlu temu
- Prebacite se na tamnu temu
- Preskočite na kalkulator
- Prihvatite analitiku
- Privatnost
- Procentualna naknada za transakciju u inostranstvu
- Procijenite kartično plaćanje ili podizanje gotovine u lokalnoj valuti i uporedite neobaveznu DCC ponudu.
- Promijenite temu boja
- Referentni kurs nije dostupan za ovaj valutni par.
- Referentni kursevi za {date}.
- Referentni kursevi za {date}. Izvor: Frankfurter API za referentne kurseve.
- Saznajte više
- Učitavanje najnovijih kurseva…
- Učitavanje najnovijih referentnih kurseva…
- Unesite iznos kupovine ili podizanja veći od nule.
- Unesite naknade koje su jednake nuli ili veće.
- Unesite ponuđeni konačni iznos DCC-a veći od nule ili ostavite polje prazno.
- Uporedite kartično plaćanje ili podizanje gotovine u lokalnoj valuti s ponuđenom konverzijom.
- Uporedite plaćanje karticom ili podizanje gotovine u lokalnoj valuti s DCC ponudom. Uključite procentualnu i fiksnu naknadu uz aktuelne referentne kurseve.
- Uporedite procijenjeni trošak plaćanja u lokalnoj valuti, izražen u valuti kartice, s neobaveznom ponudom dinamičke konverzije valuta (DCC).

## Kalkulator budžeta putovanja

URL: `/bs/travel-budget-calculator/`

Title: Kalkulator budžeta putovanja u dvije valute | Balkan Converter

Meta description: Procijenite budžet putovanja po danu i kategoriji, dodajte fiksne troškove i rezervu, a zatim konvertujte ukupan iznos prema aktuelnim referentnim kursevima.

### Cjelovit vidljivi tekst glavnog sadržaja

```text
Povratak na Balkan Currency Converter
Besplatan alat za planiranje putovanja
Kalkulator budžeta putovanja
Procijenite troškove putovanja u dvije valute. Dodajte dnevne i fiksne troškove te neobaveznu rezervu — bez otvaranja računa.
Odredišna valutaRSD
Matična valutaEUR
Broj dana putovanja
Smještaj po danu
Hrana po danu
Lokalni prevoz po danu
Aktivnosti po danu
Fiksni troškovi putovanja NeobaveznoU odredišnoj valuti
Rezerva za nepredviđene troškove NeobaveznoProcenat dnevnih i fiksnih troškova
Izračunajte budžet putovanja
Unesite približne troškove u valuti odredišta.
Vaša procjena
Procijenjeni budžet putovanja
Dnevni budžet
Ukupan iznos prije rezerve
Pregled po kategorijama
Smještaj
Hrana
Lokalni prevoz
Aktivnosti
Fiksni troškovi
Iznos rezerve
Konačni budžet u valuti odredišta
Konačni budžet u matičnoj valuti
Referentni kurs:
Brza procjena, a ne planer putovanja
Kalkulator sabira približne dnevne troškove za uneseni broj dana, dodaje fiksne troškove i zatim primjenjuje neobaveznu procentualnu rezervu.
Iskoristite ga za uspostavljanje praktičnog početnog budžeta. Stvarne cijene, naknade za kartice i kursevi se mogu promijeniti.
Kako funkcioniše konverzija valuta
Konačni budžet u valuti odredišta konvertuje se prema najnovijem dostupnom referentnom kursu servisa Frankfurter. Datum i izvor kursa prikazuju se uz svaki rezultat.
Korisni valutni alati za putovanje
Uporedite jedan iznos u više valuta pomoću Viševalutnog konvertera, izvršite brzu konverziju u Konverteru valuta ili saznajte kako Android aplikacija koristi sačuvane kurseve bez interneta.
Šta uključiti
Smještaj, obroci, lokalni prijevoz i aktivnosti su dnevni iznosi. Dodajte letove, željezničke karte ili druge jednokratne troškove pod fiksne troškove putovanja.
Valute za vaše putovanje
Držite potrebne valute na jednom mjestu
Balkan Converter za Android nudi Travel Board i sačuvane skupove kako bi vam valute potrebne na putovanju bile pri ruci.
```

### Dodatne dinamičke poruke

- © 2026 Balkan Currency Converter
- Budžet je ažuriran prema najnovijim dostupnim referentnim kursevima.
- Dani putovanja moraju biti cijeli broj veći od nule.
- Datum referentnog kursa nije dostupan.
- Frankfurter API za referentne kurseve
- Glavna navigacija
- Izbor analitike
- Iznosi budžeta i rezerva ne mogu biti negativni.
- Kalkulator budžeta putovanja u dvije valute | Balkan Converter
- Konverter valuta
- Konverzija valuta za Android
- Kurs
- Kurseve nije moguće učitati. Provjerite internetsku vezu i pokušajte ponovo.
- Nabavite Balkan Currency Converter na Google Play
- Nabavite ga na Google Play
- Navigacija u podnožju
- Neobavezna analitika
- Odaberite dvije različite valute.
- Odbij analitiku
- Planirajte okvirni budžet putovanja u valuti odredišta i matičnoj valuti.
- Početna
- Početna stranica Balkan Currency Convertera
- Politika privatnosti
- Pomozite nam da razumijemo upotrebu stranice. Firebase Analytics ostaje isključen osim ako ne prihvatite.
- Prebacite se na svijetlu temu
- Prebacite se na tamnu temu
- Preskočite na kalkulator
- Prihvatite analitiku
- Privatnost
- Procenat rezerve za nepredviđene troškove
- Procijenite budžet putovanja po danu i kategoriji, dodajte fiksne troškove i rezervu, a zatim konvertujte ukupan iznos prema aktuelnim referentnim kursevima.
- Procijenite dnevne troškove putovanja, fiksne troškove i rezervu u dvije valute.
- Procijenite višednevni budžet putovanja po kategorijama u valuti odredišta i matičnoj valuti.
- Promijenite temu boja
- Referentni kurs nije dostupan za ovaj valutni par.
- Referentni kursevi moraju biti pozitivni.
- Referentni kursevi za {date}.
- Referentni kursevi za {date}. Izvor: Frankfurter API za referentne kurseve.
- Rezultat
- Saznajte više
- Učitavanje najnovijih kurseva…
- Učitavanje najnovijih referentnih kurseva…
- Unesite barem jedan iznos budžeta veći od nule.
- Unesite cijeli broj dana putovanja veći od nule.
- Unesite iznose budžeta i rezervu od nula posto ili više.
- Unesite važeće brojeve u svako polje.
- Više valuta
- Viševalutni konverter

## Izračun i tehnički QA

- Formula razlike nije mijenjana: uz referentni rezultat 100 i ponudu 95 rezultat je +5%; uz ponudu 105 rezultat je −5%.
- Bosanski unos s razmakom za grupisanje hiljada i decimalnim zarezom provjeren je u browser QA-u.
- Browser QA obuhvata svih 8 stranica na širinama 320, 390 i 1440 px, interaktivna stanja alata, mrežnu grešku i učitavanje značke Google Playa. Detaljan rezultat: `artifacts/bosnian-localization-review/browser-qa.json`.

## Neriješena pitanja

Nema. Promjene su ograničene na lokalni commit; push i deployment nisu izvršeni.
