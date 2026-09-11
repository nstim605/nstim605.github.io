# Deutsche Web-Tools – sprachliche und redaktionelle Prüfung

Datum der lokalen Prüfung: 11. September 2026.

Status: **LANGUAGE QA PASS** für die deutsche Fassung aller acht Web-Tools. Andere Sprachfassungen wurden im Rahmen dieser Aufgabe nicht inhaltlich geändert oder erneut bewertet.

## Ausgangslage und Lösung

Der bisherige Katalog enthielt maschinell übersetzte Begriffe und Sätze, darunter „Bewerten“ für einen Wechselkurs, „Tarife“ und „Raten“ statt „Kurse“, „Heimatwährung“, „Puffer“, wörtliche DCC-Formulierungen und unpassende Texte für positive und negative Abweichungen. Die deutschen Tools verwenden nun einen eigenen redaktionell geprüften Katalog. Sätze mit eingebetteten Links werden als vollständige deutsche Aussagen mit benannten Link-Platzhaltern erzeugt.

## Einheitliche Begriffe und tatsächliches Verhalten

- Exchange/reference rate: „Wechselkurs“ / „Referenzkurs“.
- Markup: prozentuale Abweichung des angebotenen Betrags vom Ergebnis zum Referenzkurs; ein positiver Wert bedeutet einen niedrigeren angebotenen Betrag, ein negativer Wert einen höheren.
- Offline: ein gemeinsamer, aktualisierbarer Kursspeicher; eine erfolgreiche Abfrage ersetzt den vorherigen Datensatz, bei einem Fehler bleibt die letzte funktionierende Kopie erhalten.
- Widget: zeigt gespeicherten Referenzkurs, Aktualitätsstatus und Kursdatum, öffnet das gewählte Paar und bietet im breiten Layout eine Tauschfunktion.
- Karten-/Geldautomatengebühr: wird in der Kartenwährung eingegeben und nur der Schätzung für die Zahlung in Landeswährung zugerechnet.
- DCC: der vollständig eingegebene Angebotsbetrag wird als eigene Alternative verglichen; die feste Gebühr wird nicht automatisch zum DCC-Betrag addiert.
- Reisebudget: „Reserve für unerwartete Ausgaben“ ist ein optionaler Prozentsatz der täglichen und festen Kosten.

## Währungsrechner

URL: `/de/currency-converter/`

Title: Währungsrechner | Wechselkurse online umrechnen

Meta description: Rechnen Sie einen Betrag mit den neuesten verfügbaren Referenzkursen von einer Währung in eine andere um. Angezeigt werden Wechselkurs, Kursdatum und Datenquelle.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Kostenloses Währungstool
Währungsrechner
Rechnen Sie einen Betrag von einer Währung in eine andere um und sehen Sie den neuesten verfügbaren Referenzkurs, das Kursdatum und die Datenquelle.
Betrag
VonEUR
InRSD
Währungen tauschen
Währung umrechnen
Geben Sie einen Betrag ein und wählen Sie zwei Währungen aus.
Ihre Umrechnung
Umgerechneter Betrag
Ergebnis
Referenzkurs
Datenquelle
Referenzkurs-API von Frankfurter
Schnelle Umrechnung zum Referenzkurs
Dieser Währungsrechner ermittelt einen Kreuzkurs aus dem neuesten verfügbaren Referenzkursdatensatz. Das ist für Schätzungen und Vergleiche hilfreich; eine Bank, ein Kartenanbieter oder ein Wechselanbieter kann jedoch einen anderen Transaktionskurs verwenden.
Das angezeigte Datum verrät Ihnen, welchen Markttag die Referenzdaten repräsentieren.
Suchen Sie eine andere Ansicht?
Verfolgen Sie die Entwicklung eines Währungspaars im Wechselkursverlauf; vergleichen Sie einen Betrag in mehreren Währungen mit dem Mehrwährungsrechner; prüfen Sie ein Umtauschangebot mit dem Rechner für Wechselkursabweichungen; oder vergleichen Sie Kartenzahlung, Bargeldabhebung und DCC im Fremdwährungsgebühren- und DCC-Rechner.
Weitere Tools auf Android
Mit Balkan Converter umrechnen
Die Android-App bietet zusätzlich einen Rechner, Offline-Kurse, die Reisetafel, die Funktion „Tatsächliche Kosten“, gespeicherte Sets, Verlauf, Diagramme und ein Startbildschirm-Widget.
```

### Weitere dynamische Meldungen

- © 2026 Balkan Currency Converter
- Abweichungsrechner
- Analyse ablehnen
- Analyse zulassen
- Analyse-Einstellungen
- Balkan Currency Converter bei Google Play herunterladen
- Balkan Currency Converter Startseite
- Bei Google Play herunterladen
- Betrag und Kurse müssen positive Zahlen sein.
- Datenschutz
- Datenschutzrichtlinie
- Die Umrechnung wurde anhand der neuesten verfügbaren Referenzkurse aktualisiert.
- Dunkles Design verwenden
- Erfahren Sie mehr
- Farbthema wechseln
- Freiwillig
- Fußzeilennavigation
- Geben Sie einen Betrag größer als null ein.
- Hauptnavigation
- Helfen Sie uns zu verstehen, wie die Website genutzt wird. Firebase Analytics bleibt deaktiviert, solange Sie nicht zustimmen.
- Helles Design verwenden
- Kursdatum nicht verfügbar.
- Kurse konnten nicht geladen werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
- Mehrere Währungen
- Neueste Kurse werden geladen…
- Neueste Referenzkurse werden geladen…
- Optionale Analyse
- Rechnen Sie einen Betrag mit den neuesten verfügbaren Referenzkursen von einer Währung in eine andere um.
- Rechnen Sie einen Betrag mit den neuesten verfügbaren Referenzkursen von einer Währung in eine andere um. Angezeigt werden Wechselkurs, Kursdatum und Datenquelle.
- Rechnen Sie mit den neuesten verfügbaren Referenzkursen zwischen zwei Währungen um.
- Referenzkurse vom {date}.
- Startseite
- Wählen Sie zwei verschiedene Währungen.
- Währungsrechner | Wechselkurse online umrechnen
- Währungsumrechnung für Android
- Zum Währungsrechner

## Kursabweichung berechnen

URL: `/de/exchange-rate-markup-calculator/`

Title: Wechselkursabweichung berechnen | Balkan Currency Converter

Meta description: Vergleichen Sie ein Umtauschangebot mit dem neuesten Referenzkurs. Sehen Sie den angebotenen Betrag, die absolute Differenz und die prozentuale Abweichung vom Referenzergebnis.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Kostenloses Währungstool
Kursabweichung berechnen
Vergleichen Sie den angebotenen Betrag eines Wechselanbieters mit dem neuesten verfügbaren Referenzkurs. Prüfen Sie vor dem Umtausch die Differenz und die prozentuale Abweichung.
Ausgangswährung
EUR — Euro
Zielwährung
RSD — Serbischer Dinar
Betrag, den Sie geben
In der Ausgangswährung
Angebotener Betrag
Was Sie in der Zielwährung erhalten würden
Abweichung berechnen
Geben Sie das Angebot ein, das Sie vergleichen möchten.
Ihr Vergleich
Ergebnis des Umtauschangebots
Referenzkurs
Ergebnis zum Referenzkurs
Angebotenes Ergebnis
Sie erhalten weniger
Prozentuale Wechselkursabweichung
Was die Prozentangabe bedeutet
Der Rechner ermittelt zunächst den Betrag, der sich aus dem neuesten Referenzkurs ergibt. Anschließend vergleicht er diesen mit dem angebotenen Betrag.
Ein Anbieter kann mit „ohne Provision“ werben und zugleich einen ungünstigeren Wechselkurs verwenden. Die Differenz ist dann ein im Kurs enthaltener Kostenfaktor.
Abweichung in % = (Referenzergebnis − angebotenes Ergebnis) ÷ Referenzergebnis × 100.
Wichtig zu wissen
Dies ist ein unverbindlicher Vergleich und keine Finanzberatung. Ein Angebot kann Service- oder Kartengebühren, Kosten für die Bargeldauszahlung oder eine Kursmarge enthalten. Referenzkurse sind keine garantierten Transaktionskurse.
Möchten Sie eine Kartenzahlung oder Bargeldabhebung mit einem Angebot zur Umrechnung in die Kartenwährung vergleichen? Nutzen Sie den Fremdwährungsgebühren- und DCC-Rechner. Für die schnelle Umrechnung eines Währungspaars öffnen Sie den Währungsrechner. Einen Betrag in mehreren Währungen vergleichen Sie mit dem Mehrwährungsrechner; wie gespeicherte Kurse funktionieren, erklärt der Leitfaden zur Offline-Umrechnung.
Brauchen Sie das für unterwegs?
Vergleichen Sie die Kosten in Balkan Converter
Die Android-App bietet zusätzlich die Funktion „Tatsächliche Kosten“, Offline-Kurse, die Reisetafel, gespeicherte Sets, Diagramme und ein Startbildschirm-Widget.
```

### Weitere dynamische Meldungen

- © 2026 Balkan Currency Converter
- Abweichungsrechner
- Analyse ablehnen
- Analyse zulassen
- Analyse-Einstellungen
- Balkan Currency Converter bei Google Play herunterladen
- Balkan Currency Converter Startseite
- Bei Google Play herunterladen
- Beträge und Kurse müssen positive Zahlen sein.
- Das Angebot liegt {percentage} über dem Referenzergebnis.
- Das Angebot liegt {percentage} unter dem Referenzergebnis.
- Datenschutz
- Datenschutzrichtlinie
- Datum
- Die Berechnung wurde anhand der neuesten verfügbaren Referenzwechselkurse aktualisiert.
- Die Referenzkursdaten sind unvollständig.
- Dunkles Design verwenden
- Erfahren Sie mehr
- Es wurden keine Referenzkurse zurückgegeben.
- Farbthema wechseln
- Freiwillig
- Für dieses Währungspaar ist kein Referenzkurs verfügbar.
- Fußzeilennavigation
- Geben Sie zwei Beträge größer als null ein.
- Hauptnavigation
- Helfen Sie uns zu verstehen, wie die Website genutzt wird. Firebase Analytics bleibt deaktiviert, solange Sie nicht zustimmen.
- Helles Design verwenden
- Kurse konnten nicht geladen werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
- Neueste Kurse werden geladen…
- Neueste Referenzkurse werden geladen…
- Optionale Analyse
- Referenzkurse vom {date}.
- Sehen Sie, wie weit ein Umtauschangebot vom aktuellen Referenzkurs entfernt ist.
- Sie erhalten mehr
- Startseite
- Über dem Referenzergebnis
- Vergleichen Sie ein Umtauschangebot mit dem aktuellsten Referenzkurs.
- Vergleichen Sie ein Umtauschangebot mit dem neuesten Referenzkurs und berechnen Sie die prozentuale Abweichung.
- Vergleichen Sie ein Umtauschangebot mit dem neuesten Referenzkurs. Sehen Sie den angebotenen Betrag, die absolute Differenz und die prozentuale Abweichung vom Referenzergebnis.
- Wählen Sie zwei verschiedene Währungen.
- Währungsumrechnung für Android
- Wechselkursabweichung berechnen | Balkan Currency Converter
- Zum Beispiel 11 500
- Zum Rechner

## Ein Betrag. Mehrere Währungen.

URL: `/de/multi-currency-converter/`

Title: Mehrwährungsrechner | Einen Betrag in mehrere Währungen umrechnen

Meta description: Rechnen Sie einen Betrag mit den neuesten verfügbaren Referenzkursen gleichzeitig in mehrere Währungen um. Kostenlos mit dem Mehrwährungsrechner von Balkan Converter.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Kostenloses Währungstool
Ein Betrag. Mehrere Währungen.
Geben Sie einen Betrag ein und vergleichen Sie dessen Wert in mehreren Währungen gleichzeitig mit den neuesten verfügbaren Referenzkursen.
AusgangswährungEUR
Betrag
Zielwährungen+ Weitere Währung hinzufügen
Währungen umrechnen
Wählen Sie die Währungen aus, die Sie vergleichen möchten.
Das Wichtigste auf einen Blick
Umgerechnete Beträge
Reisebudget auf einen Blick vergleichen
Eine Mehrwährungsansicht ist praktisch, wenn Sie mehrere Länder bereisen, Preise in verschiedenen Märkten vergleichen oder ein Budget in mehreren Währungen planen.
Die Kurse sind Referenzwerte und können vom Kurs einer Bank, eines Kartenanbieters oder eines Wechselanbieters abweichen.
Passendes Werkzeug wählen
Für ein einzelnes Währungspaar nutzen Sie den Währungsrechner. Die Kursentwicklung sehen Sie im Wechselkursverlauf; ein Umtauschangebot prüfen Sie mit dem Rechner für Wechselkursabweichungen; und wie Umrechnungen ohne Internet funktionieren, erklärt der Leitfaden zur Offline-Umrechnung.
Mehr Währungen unterwegs
Reisetafel in Balkan Converter verwenden
Die Android-App hält mehrere Reisewährungen an einem Ort bereit, unterstützt eine frei wählbare Reihenfolge und kann Kurse für die Offline-Nutzung vorbereiten.
```

### Weitere dynamische Meldungen

- © 2026 Balkan Currency Converter
- Abweichungsrechner
- Analyse ablehnen
- Analyse zulassen
- Analyse-Einstellungen
- Balkan Currency Converter bei Google Play herunterladen
- Balkan Currency Converter Startseite
- Behalten Sie mindestens eine Zielwährung bei.
- Bei Google Play herunterladen
- Betrag und Basiswechselkurs müssen positive Zahlen sein.
- Datenschutz
- Datenschutzrichtlinie
- Datum
- Dunkles Design verwenden
- Erfahren Sie mehr
- Farbthema wechseln
- Freiwillig
- Für jede Zielwährung muss ein gültiger Kurs verfügbar sein.
- Fußzeilennavigation
- Geben Sie einen Betrag größer als null ein.
- Hauptnavigation
- Helfen Sie uns zu verstehen, wie die Website genutzt wird. Firebase Analytics bleibt deaktiviert, solange Sie nicht zustimmen.
- Helles Design verwenden
- Kurse konnten nicht geladen werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
- Mehrwährungsrechner
- Mehrwährungsrechner | Einen Betrag in mehrere Währungen umrechnen
- Neueste Kurse werden geladen…
- Neueste Referenzkurse werden geladen…
- Optionale Analyse
- Rechnen Sie einen Betrag gleichzeitig in mehrere Währungen um.
- Rechnen Sie einen Betrag mit den neuesten verfügbaren Referenzkursen gleichzeitig in mehrere Währungen um. Kostenlos mit dem Mehrwährungsrechner von Balkan Converter.
- Rechnen Sie einen Betrag mit den neuesten verfügbaren Referenzkursen in mehrere Währungen um.
- Referenzkurse vom {date}.
- Startseite
- Umgerechneter Betrag
- Umrechnungen wurden anhand der neuesten verfügbaren Referenzkurse aktualisiert.
- Wählen Sie jede Zielwährung nur einmal aus.
- Wählen Sie mindestens eine Zielwährung.
- Währungsumrechnung für Android
- Zielwährung entfernen
- Zielwährungen müssen sich von der Ausgangswährung unterscheiden.
- Zum Währungsrechner

## Offline-Währungsumrechnung

URL: `/de/offline-currency-converter/`

Title: Offline-Währungsumrechner | So funktionieren gespeicherte Wechselkurse

Meta description: Erfahren Sie, wie ein Offline-Währungsrechner gespeicherte Wechselkurse mit Kursdatum verwendet und was sich ändert, sobald wieder eine Internetverbindung besteht.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Leitfaden zur Offline-Umrechnung
Offline-Währungsumrechner: So funktionieren gespeicherte Kurse
Ein Währungsrechner kann ohne Internet weiterarbeiten, indem er die zuletzt erfolgreich auf Ihrem Gerät gespeicherten Wechselkurse verwendet. Diese Kurse sind nützliche Referenzwerte, bleiben aber an ihr ursprüngliches Kursdatum gebunden, bis die App sie wieder online aktualisieren kann.
Die einfache Version
Von der Online-Aktualisierung bis zur Offline-Umrechnung
Ein gespeicherter Kurs bleibt nicht dauerhaft aktuell. Die App legt eine lokale Kopie mit Kursdatum an, die ohne Netzwerkverbindung wiederverwendet werden kann.
Verbinden und aktualisieren
Die App ruft den neuesten verfügbaren Referenzkursdatensatz ab und speichert Kursdatum sowie Speicherzeitpunkt.
Letzten erfolgreichen Stand behalten
Nach einer erfolgreichen Anfrage wird der Datensatz lokal gespeichert. Schlägt eine spätere Anfrage fehl, bleibt die letzte funktionierende Kopie verfügbar.
Ohne Internet umrechnen
Offline-Umrechnungen verwenden diesen gespeicherten Datensatz und weisen zusammen mit dem Kursdatum darauf hin, dass gespeicherte Daten genutzt werden.
Was ein gespeicherter Offline-Kurs bedeutet
Der gespeicherte Datensatz ist eine Momentaufnahme der letzten erfolgreichen Referenzkursabfrage. Damit kann die App ohne Netzwerkverbindung umrechnen; die Werte werden jedoch nicht aktualisiert, solange das Gerät offline ist.
Prüfen Sie immer das angezeigte Kursdatum. Ein Ergebnis mit den Kursen von gestern kann für die Planung weiterhin nützlich sein, garantiert aber nicht den Kurs, den eine Bank, ein Kartenanbieter oder eine Wechselstube heute anbietet.
Was passiert, sobald wieder Internet verfügbar ist?
Balkan Converter verwendet für normale Umrechnungen und die Vorbereitung gespeicherter Sets denselben lokalen Kursspeicher. Eine erfolgreiche Online-Aktualisierung ersetzt den älteren Datensatz und aktualisiert Kursdatum und Speicherzeitpunkt.
Wenn die Aktualisierung fehlschlägt, verwendet die App weiterhin die zuvor gespeicherten Kurse, statt sie zu löschen.
Gespeichertes Set für die Offline-Nutzung vorbereiten
Erstellen oder öffnen Sie in der Android-App ein gespeichertes Set mit den benötigten Währungen. Wählen Sie bei bestehender Internetverbindung „Kurse offline speichern“. Die App aktualisiert den gemeinsamen Kursdatensatz und bestätigt die Offline-Bereitschaft, sobald der gespeicherte Satz alle enthaltenen Währungen umfasst.
Für einzelne Reisen gibt es keine separate, unveränderliche Kursdatei. Beim Vorbereiten eines weiteren Sets wird derselbe Kursspeicher aktualisiert, den auch die übrige App verwendet.
Auch außerhalb von Reisen nützlich
Die Offline-Umrechnung kann bei einer schlechten Verbindung, einer Roaming-Unterbrechung, einem vorübergehenden Dienstausfall oder immer dann helfen, wenn eine schnelle Schätzung anhand eines Referenzkurses besser ist als gar kein Ergebnis.
Für den schnellen Blick auf ein gespeichertes Währungspaar nutzen Sie den Widget-Leitfaden für Android. Für Online-Umrechnungen öffnen Sie den Währungsrechner, vergleichen einen Betrag in mehreren Währungen mit dem Mehrwährungsrechner oder prüfen ein Umtauschangebot mit dem Rechner für Wechselkursabweichungen.
Referenzkurs mit Datum griffbereit
Gespeicherte Kurse in Balkan Converter verwenden
Die Android-App kann den zuletzt erfolgreich gespeicherten Wechselkursdatensatz ohne Verbindung wiederverwenden und kennzeichnet gespeicherte Daten sowie deren Kursdatum deutlich.
```

### Weitere dynamische Meldungen

- Auf dieser Seite gibt es keine weiteren dynamischen Meldungen.

## Wechselkursverlauf und Währungsdiagramm

URL: `/de/exchange-rate-history/`

Title: Wechselkursverlauf und Währungsdiagramm | Balkan Converter

Meta description: Sehen Sie die Wechselkursentwicklung über 30 Tage, 90 Tage oder ein Jahr, stellen Sie ein Währungspaar grafisch dar und rufen Sie den Referenzkurs für ein bestimmtes Datum ab.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Werkzeug für historische Referenzkurse
Wechselkursverlauf und Währungsdiagramm
Sehen Sie, wie sich ein Währungspaar über 30 Tage, 90 Tage oder ein Jahr entwickelt hat, und rufen Sie den Referenzkurs für ein bestimmtes Datum ab.
AusgangswährungEUR
ZielwährungRSD
Währungen tauschen
Zeitraum des Diagramms
30 Tage
90 Tage
1 Jahr
Wechselkursverlauf anzeigen
Wählen Sie ein Währungspaar und einen Zeitraum.
Historische Entwicklung
Wechselkursverlauf
Tägliche Referenzkurswerte; dies ist kein Börsenchart mit Intraday-Daten.
Neuester verfügbarer Kurs
Minimum
Maximum
Durchschnitt
Quelle: Öffentliche Referenzkurs-API von Frankfurter.
Bestimmter Tag
Historischen Kurs abrufen
Datum
Historischen Kurs abrufen
Es werden dieselben oben gewählten Ausgangs- und Zielwährungen verwendet.
Kurs für ein bestimmtes Datum
Referenzkurs an diesem Datum
Kurs
Tatsächliches Kursdatum
Datenquelle
Referenzkurs-API von Frankfurter
Was historische Referenzkurse zeigen
Jeder Punkt stellt den veröffentlichten Referenzwechselkurs für ein Datum dar. Minimum, Maximum und Durchschnitt fassen den ausgewählten Zeitraum zusammen; es sind keine Prognosen.
Referenzkurse können vom Kurs einer Bank, eines Kartenanbieters, Geldtransferdienstes oder einer Wechselstube abweichen, weil Anbieter Gebühren oder eine Kursmarge einrechnen können.
Zeiträume und Trends
Nutzen Sie das Diagramm, um Richtung und Schwankungen zu erkennen, nicht um die nächste Entwicklung vorherzusagen. Einige Anbieter veröffentlichen nicht an jedem Kalendertag. Wenn die API Daten für ein anderes verfügbares Datum liefert, zeigt die Abfrage dieses tatsächliche Kursdatum an, statt es als den ausgewählten Tag auszugeben.
Für eine Umrechnung zum neuesten verfügbaren Kurs nutzen Sie den Währungsrechner. Um ein Umtauschangebot mit dem Ergebnis zum Referenzkurs zu vergleichen, öffnen Sie den Rechner für Wechselkursabweichungen.
Wichtige Währungspaare griffbereit
Diagramme in Balkan Converter anzeigen
Die Android-App umfasst 30-Tage-Kursdiagramme, angeheftete Paare, Offline-Referenzkurse und weitere Währungswerkzeuge.
```

### Weitere dynamische Meldungen

- {count} Referenzkurse mit Datum geladen.
- © 2026 Balkan Currency Converter
- Analyse ablehnen
- Analyse zulassen
- Analyse-Einstellungen
- Balkan Currency Converter bei Google Play herunterladen
- Balkan Currency Converter Startseite
- Bedienelemente und Diagramm zum Wechselkursverlauf
- Bei Google Play herunterladen
- Datenschutz
- Datenschutzrichtlinie
- Diagramm zum Wechselkursverlauf
- Die API lieferte Referenzdaten vom {date}.
- Dunkles Design verwenden
- Erfahren Sie mehr
- Es ist mindestens ein gültiger historischer Kurs erforderlich.
- Farbthema wechseln
- Freiwillig
- Für diese Auswahl sind keine historischen Kurse verfügbar.
- Für dieses Datum und Paar konnte kein historischer Kurs geladen werden.
- Fußzeilennavigation
- Hauptnavigation
- Helfen Sie uns zu verstehen, wie die Website genutzt wird. Firebase Analytics bleibt deaktiviert, solange Sie nicht zustimmen.
- Helles Design verwenden
- Historische Kurse konnten nicht geladen werden. Überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.
- Historische Referenzkurse werden geladen…
- Historischer Kurs nach Datum
- Historischer Referenzkurs geladen.
- Historischer Referenzkurs wird geladen…
- Kurs wird abgerufen…
- Mehrere Währungen
- Neuester verfügbarer Datenstand in diesem Zeitraum: {date}.
- Optionale Analyse
- Referenzkursverlauf {base}/{quote} vom {from} bis {to}. Minimum {minimum}, Maximum {maximum}.
- Sehen Sie die Wechselkursentwicklung über 30 Tage, 90 Tage oder ein Jahr, stellen Sie ein Währungspaar grafisch dar und rufen Sie den Referenzkurs für ein bestimmtes Datum ab.
- Sehen Sie historische Referenzkurse, ein responsives Wechselkursdiagramm, Statistiken für den gewählten Zeitraum und den Kurs für ein bestimmtes Datum.
- Sie haben {selectedDate} gewählt; die nächsten verfügbaren veröffentlichten Daten der API stammen vom {date}.
- Startseite
- Ungültige Antwort für historische Kurse.
- Verlauf wird geladen…
- Wählen Sie ein gültiges Datum, das nicht in der Zukunft liegt.
- Wählen Sie ein gültiges historisches Datum.
- Wählen Sie zwei verschiedene Währungen.
- Währungsumrechnung für Android
- Wechselkursverlauf {base}/{quote}
- Wechselkursverlauf und Währungsdiagramm | Balkan Converter
- Zeigen Sie historische Referenzkurse in einem Diagramm an und rufen Sie einen Kurs für ein bestimmtes Datum ab.
- Zum Wechselkursverlauf

## Währungs-Widget für Android

URL: `/de/currency-converter-widget/`

Title: Währungs-Widget für Android | Balkan Converter

Meta description: Fügen Sie dem Android-Startbildschirm ein Währungs-Widget hinzu, um schnell auf einen gespeicherten Wechselkurs, das Kursdatum, die Tauschfunktion und die App-Verknüpfung zuzugreifen.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Anleitung für den Android-Startbildschirm
Währungs-Widget für Android
Behalten Sie ein wichtiges Währungspaar auf dem Startbildschirm. Das Balkan-Converter-Widget zeigt den gespeicherten Referenzkurs und sein Kursdatum, öffnet das Paar in der App und bietet im breiten Layout eine schnelle Tauschfunktion.
So fügen Sie das Widget hinzu
Das echte Balkan-Converter-Widget auf einem normalen Android-Startbildschirm.
Vier schnelle Schritte
Währungs-Widget hinzufügen
Die Launcher-Beschriftungen variieren geringfügig je nach Android-Gerät, der Standardablauf auf dem Startbildschirm ist jedoch derselbe.
Währungspaar vorbereiten
Öffnen Sie Balkan Converter, wählen Sie die gewünschten Währungen aus und lassen Sie die neuesten Referenzkurse erfolgreich laden.
Öffnen Sie Widgets
Halten Sie einen freien Bereich des Android-Startbildschirms gedrückt und wählen Sie anschließend Widgets.
Widget platzieren
Suchen Sie Balkan Converter und ziehen Sie das Währungs-Widget in einen freien Bereich Ihres Startbildschirms.
Größe anpassen und verwenden
Passen Sie die Größe an. Tippen Sie auf die Karte, um das Paar in der App zu öffnen. Das breitere Widget zeigt zusätzlich eine Tauschschaltfläche.
Was das Widget anzeigt
Die Widget-Karte zeigt den Referenzkurs des gewählten Paars, einen Aktualitätsstatus und das Kursdatum. Jedes neue Widget übernimmt zunächst das zuletzt in der App verwendete Paar und merkt sich danach seine eigene Auswahl.
Wenn Sie auf das Widget tippen, öffnet Balkan Converter das gewählte Währungspaar. Bei mittlerer Widget-Breite kehrt die Tauschfunktion das Paar direkt auf dem Startbildschirm um.
Warum das Datum wichtig ist
Das Widget verwendet den zuletzt erfolgreich gespeicherten Kursdatensatz der App und ist keine eigenständige Echtzeit-Kursquelle. Wenn Balkan Converter die Kurse erfolgreich aktualisiert, erhalten installierte Widgets die neuen gespeicherten Daten.
Ohne Internet bleibt der zuvor gespeicherte Referenzkurs für Schätzungen verfügbar; das Kursdatum zeigt, wie aktuell die Daten sind. Mehr dazu erfahren Sie im Leitfaden zur Offline-Umrechnung.
Kompaktes oder breites Layout?
Im kompakten Layout bleiben Kurs und Datum auf kleiner Fläche sichtbar. Verbreitern Sie das Widget, wenn neben dem Kurs eine eigene Tauschfunktion angezeigt werden soll.
Android-Launcher steuern die genaue Rastergröße, sodass die verfügbaren Größenänderungsschritte zwischen Telefonen und Tablets unterschiedlich sein können.
Für mehrere Währungen auf einmal
Öffnen Sie die App, um einen Betrag einzugeben, Währungen umzurechnen, den Wechselkursverlauf anzusehen, mehrere Währungen zu vergleichen oder gespeicherte Kurse für die Offline-Nutzung vorzubereiten.
Das Widget dient als schnelle Übersicht und Verknüpfung; den vollständigen Umrechnungsablauf bietet Balkan Converter.
Umrechnung auf einen Blick
Balkan Converter zum Startbildschirm hinzufügen
Installieren Sie die Android-App, laden Sie das gewünschte Währungspaar und platzieren Sie das Währungs-Widget an einer gut erreichbaren Stelle.
```

### Weitere dynamische Meldungen

- Auf dieser Seite gibt es keine weiteren dynamischen Meldungen.

## Gebühren und DCC vergleichen

URL: `/de/foreign-transaction-fee-calculator/`

Title: Fremdwährungsgebühren und DCC berechnen | Balkan Converter

Meta description: Vergleichen Sie eine Kartenzahlung oder Bargeldabhebung in Landeswährung mit einem DCC-Angebot. Berücksichtigen Sie dabei die Fremdwährungsgebühr und feste Gebühren anhand aktueller Referenzkurse.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Vergleich von Kartenzahlung und Bargeldabhebung
Gebühren und DCC vergleichen
In Landeswährung bezahlen oder die angebotene Umrechnung nutzen? Schätzen Sie beide Optionen anhand des zuletzt verfügbaren Referenzwechselkurses und der von Ihnen eingegebenen Gebühren.
Betrag für Kauf oder Bargeldabhebung
Der in der Landeswährung angezeigte Betrag
Landeswährung
RSD
Kartenwährung
EUR
Fremdwährungsgebühr
Prozentuale Gebühr auf den umgerechneten Betrag
Feste Karten- oder Geldautomatengebühr
Wird in Ihrer Kartenwährung zur Schätzung für die Zahlung in Landeswährung addiert
Angebotener DCC-Gesamtbetrag Freiwillig
Der vom Händler oder Geldautomaten angezeigte endgültige Betrag in der Kartenwährung einschließlich der dort ausgewiesenen Gebühren
Vergleichen Sie Zahlungsoptionen
Geben Sie die Transaktion und alle Ihnen bekannten Gebühren ein.
Ihre Schätzung
In Landeswährung bezahlen
Referenzkurs
Umgerechneter Betrag zum Referenzkurs
Fremdwährungsgebühr
Feste Karten-/Geldautomatengebühr
Geschätzter Gesamtbetrag
Angebotene Umrechnung (DCC)
Angebotener DCC-Gesamtbetrag
DCC über dem Referenzergebnis
Prozentuale DCC-Abweichung
Unterschied zwischen Optionen
Was bedeutet DCC?
Bei der dynamischen Währungsumrechnung (DCC) bieten Händler oder Geldautomaten an, den Betrag vor der Kartenbelastung in Ihre Kartenwährung umzurechnen. Wenn Sie stattdessen in Landeswährung bezahlen, übernimmt Ihr Kartenanbieter die Umrechnung.
Der Rechner vergleicht den vollständig eingegebenen DCC-Gesamtbetrag mit einer Schätzung auf Grundlage des Referenzkurses, Ihrer prozentualen Fremdwährungsgebühr und der festen Gebühr.
Was diese Schätzung nicht berücksichtigt
Ihre Bank, Ihr Kartenanbieter, der Händler oder der Geldautomat kann einen anderen Wechselkurs verwenden oder eine zusätzliche, nicht eingegebene Gebühr berechnen. Eine feste Geldautomatengebühr ist von einer prozentualen Fremdwährungsgebühr getrennt.
Dies ist ein unverbindlicher Vergleich der eingegebenen Werte, keine Finanzberatung und keine Zusage über den tatsächlich belasteten Betrag.
Ein anderer Vergleich?
Wenn Sie lediglich ein Umtauschangebot mit dem Ergebnis zum Referenzkurs vergleichen möchten, nutzen Sie den Rechner für Wechselkursabweichungen. Für eine gewöhnliche Umrechnung zwischen zwei Währungen öffnen Sie den Währungsrechner.
Referenzkurs und Kursdatum
Referenzkurse bieten einen neutralen Vergleichswert, aber keinen garantierten Transaktionskurs. Das Ergebnis zeigt das von der Referenzkurs-API von Frankfurter gelieferte Marktdatum.
Auf dem Smartphone vergleichen
Umtauschangebote mit Balkan Converter prüfen
Balkan Converter für Android enthält die Funktion „Tatsächliche Kosten“, mit der Sie ein Umtauschangebot samt Gebühren mit dem Ergebnis zum Referenzkurs vergleichen können.
```

### Weitere dynamische Meldungen

- © 2026 Balkan Currency Converter
- Abweichungsrechner
- Analyse ablehnen
- Analyse zulassen
- Analyse-Einstellungen
- Balkan Currency Converter bei Google Play herunterladen
- Balkan Currency Converter Startseite
- Bei Google Play herunterladen
- Betrag und Kurse müssen positive Zahlen sein.
- Datenschutz
- Datenschutzrichtlinie
- Datum
- Datum des Referenzkurses nicht verfügbar.
- DCC unter dem Referenzergebnis
- Der angebotene DCC-Betrag muss größer als null sein.
- Der Vergleich wurde anhand der neuesten verfügbaren Referenzwechselkurse aktualisiert.
- Dunkles Design verwenden
- Erfahren Sie mehr
- Farbthema wechseln
- Fremdwährungsgebühr ({percentage} %)
- Fremdwährungsgebühr in Prozent
- Fremdwährungsgebühren und DCC berechnen | Balkan Converter
- Fremdwährungsgebühren- und DCC-Rechner
- Fremdwährungsgebühren-Rechner
- Für dieses Währungspaar ist kein Referenzkurs verfügbar.
- Fußzeilennavigation
- Geben Sie einen Betrag für den Kauf oder die Bargeldabhebung ein, der größer als null ist.
- Geben Sie einen DCC-Gesamtbetrag größer als null ein oder lassen Sie das Feld leer.
- Geben Sie für Gebühren Werte von mindestens null ein.
- Geben Sie optional den angebotenen DCC-Gesamtbetrag ein, um beide Zahlungsarten zu vergleichen.
- Gebühren dürfen nicht negativ sein.
- Hauptnavigation
- Helfen Sie uns zu verstehen, wie die Website genutzt wird. Firebase Analytics bleibt deaktiviert, solange Sie nicht zustimmen.
- Helles Design verwenden
- Kurse konnten nicht geladen werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
- Nach diesen Angaben sind die geschätzten Kosten beider Zahlungsarten gleich.
- Nach diesen Angaben wäre die angebotene Umrechnung etwa {difference} günstiger.
- Nach diesen Angaben wäre die Zahlung in Landeswährung etwa {difference} günstiger.
- Neueste Kurse werden geladen…
- Neueste Referenzkurse werden geladen…
- Optionale Analyse
- Referenzkurse vom {date}.
- Referenzkurse vom {date}. Quelle: Referenzkurs-API von Frankfurter.
- Schätzen Sie die Kosten einer Zahlung in Landeswährung und vergleichen Sie sie mit einem optionalen DCC-Angebot.
- Startseite
- Vergleichen Sie die geschätzten Kosten einer Zahlung in Landeswährung mit einem optionalen Angebot zur dynamischen Währungsumrechnung (DCC) – jeweils in Ihrer Kartenwährung.
- Vergleichen Sie eine Kartenzahlung oder Bargeldabhebung in Landeswährung mit einem DCC-Angebot. Berücksichtigen Sie dabei die Fremdwährungsgebühr und feste Gebühren anhand aktueller Referenzkurse.
- Vergleichen Sie eine Kartenzahlung oder Bargeldabhebung in Landeswährung mit einer angebotenen Umrechnung.
- Von
- Wählen Sie zwei verschiedene Währungen.
- Währungsumrechnung für Android
- Zum Beispiel 90
- Zum Rechner

## Reisebudgetrechner

URL: `/de/travel-budget-calculator/`

Title: Reisebudgetrechner in zwei Währungen | Balkan Converter

Meta description: Schätzen Sie Ihr Reisebudget nach Tagen und Kategorien, ergänzen Sie feste Kosten und eine Reserve und rechnen Sie die Gesamtsumme anschließend mit aktuellen Referenzkursen um.

### Vollständiger sichtbarer Hauptinhalt

```text
Zurück zu Balkan Currency Converter
Kostenloser Reisebudgetrechner
Reisebudgetrechner
Schätzen Sie die Kosten Ihrer Reise in zwei Währungen. Erfassen Sie tägliche Ausgaben, feste Kosten und eine optionale Reserve – ohne Konto.
ZielwährungRSD
Eigene WährungEUR
Anzahl der Reisetage
Unterkunft pro Tag
Verpflegung pro Tag
Nahverkehr pro Tag
Aktivitäten pro Tag
Feste Reisekosten FreiwilligIn der Zielwährung
Reserve für unerwartete Ausgaben FreiwilligProzentsatz der Tages- und Fixkosten
Reisebudget berechnen
Geben Sie die ungefähren Kosten in Ihrer Zielwährung ein.
Ihre Schätzung
Geschätztes Reisebudget
Tagesbudget
Reisesumme vor Reserve
Aufschlüsselung nach Kategorien
Unterkunft
Verpflegung
Nahverkehr
Aktivitäten
Fixkosten
Reservebetrag
Endgültiges Budget in der Zielwährung
Endgültiges Budget in der eigenen Währung
Referenzkurs:
Eine schnelle Schätzung, kein Reiseplaner
Der Rechner multipliziert Ihre ungefähren täglichen Kosten mit der eingegebenen Reisedauer, addiert feste Kosten und wendet anschließend die optionale prozentuale Reserve an.
Nutzen Sie den Rechner als praktische Ausgangsbasis. Tatsächliche Preise, Kartengebühren und Wechselkurse können sich ändern.
So funktioniert die Umrechnung
Das endgültige Budget in der Zielwährung wird mit dem neuesten verfügbaren Referenzkurs von Frankfurter umgerechnet. Kursdatum und Quelle werden bei jedem Ergebnis angezeigt.
Nützliche Währungsrechner für Reisen
Vergleichen Sie einen Betrag in mehreren Währungen mit dem Mehrwährungsrechner, rechnen Sie ein Währungspaar schnell im Währungsrechner um oder erfahren Sie, wie die Android-App gespeicherte Kurse ohne Internet verwendet.
Welche Kosten gehören hinein?
Unterkunft, Verpflegung, Transport vor Ort und Aktivitäten sind Tagesbeträge. Fügen Sie Flüge, Bahnpässe oder andere einmalige Ausgaben zu den festen Reisekosten hinzu.
Währungen für Ihre Reise
Benötigte Währungen auf einen Blick
Balkan Converter für Android enthält die Reisetafel und gespeicherte Sets, damit wichtige Reisewährungen schnell verfügbar sind.
```

### Weitere dynamische Meldungen

- © 2026 Balkan Currency Converter
- Analyse ablehnen
- Analyse zulassen
- Analyse-Einstellungen
- Balkan Currency Converter bei Google Play herunterladen
- Balkan Currency Converter Startseite
- Bei Google Play herunterladen
- Budgetbeträge und Reserve dürfen nicht negativ sein.
- Das Budget wurde mit den neuesten verfügbaren Referenzkursen aktualisiert.
- Datenschutz
- Datenschutzrichtlinie
- Datum
- Datum des Referenzkurses nicht verfügbar.
- Die Anzahl der Reisetage muss eine ganze Zahl größer als null sein.
- Dunkles Design verwenden
- Erfahren Sie mehr
- Farbthema wechseln
- Für dieses Währungspaar ist kein Referenzkurs verfügbar.
- Fußzeilennavigation
- Geben Sie eine ganze Zahl von Reisetagen größer als null ein.
- Geben Sie für Budgetposten und Reserve Werte von mindestens null ein.
- Geben Sie in jedes Feld gültige Zahlen ein.
- Geben Sie mindestens einen Budgetposten größer als null ein.
- Hauptnavigation
- Helfen Sie uns zu verstehen, wie die Website genutzt wird. Firebase Analytics bleibt deaktiviert, solange Sie nicht zustimmen.
- Helles Design verwenden
- Kurse konnten nicht geladen werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.
- Mehrere Währungen
- Neueste Kurse werden geladen…
- Neueste Referenzkurse werden geladen…
- Optionale Analyse
- Planen Sie ein geschätztes Reisebudget in Zielwährung und eigener Währung.
- Referenzkurs-API von Frankfurter
- Referenzkurse vom {date}.
- Referenzkurse vom {date}. Quelle: Referenzkurs-API von Frankfurter.
- Referenzwechselkurse müssen positiv sein.
- Reisebudgetrechner in zwei Währungen | Balkan Converter
- Reserve in Prozent
- Schätzen Sie ein mehrtägiges Reisebudget nach Kategorien in Zielwährung und eigener Währung.
- Schätzen Sie Ihr Reisebudget nach Tagen und Kategorien, ergänzen Sie feste Kosten und eine Reserve und rechnen Sie die Gesamtsumme anschließend mit aktuellen Referenzkursen um.
- Schätzen Sie tägliche Reisekosten, feste Kosten und eine Reserve in zwei Währungen.
- Startseite
- Von
- Wählen Sie zwei verschiedene Währungen.
- Währungsumrechnung für Android
- Zum Rechner

## Berechnungen und technische Prüfung

- Die Abweichungsformel bleibt unverändert: Bei einem Referenzergebnis von 100 und einem Angebot von 95 beträgt das Ergebnis +5 %; bei einem Angebot von 105 beträgt es −5 %.
- Die Eingabe mit Dezimalkomma und Leerzeichen als Tausendertrennzeichen wird geprüft. Der Punkt als alleiniger Tausendertrenner wird nicht empfohlen, weil der bestehende Parser „11.500“ als 11,5 interpretiert.
- Der Browser-QA umfasst alle acht Seiten bei 320, 390, 768 und 1440 px, interaktive Zustände, Fehlermeldungen, Datums-/Zahlenformatierung und das Google-Play-Badge.

## Offene sprachliche Fragen

Keine. Die Änderungen bleiben in einem lokalen Commit; Push und Deployment werden nicht ausgeführt.
