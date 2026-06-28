# Dicteewebsite versie 3.1

## Online zetten
Upload de volledige inhoud van deze map naar de hoofdmap van je GitHub repository.

## Leerkrachtpagina
Ga naar je website met `?admin=1` achter de link.

Voorbeeld:
`https://jufnina.github.io/dictee/?admin=1`

Daar kun je aanduiden welke woordpakketten zichtbaar zijn en de leerlinglink kopiëren.

## Resultaten verzamelen
Leerlingen vullen eerst hun naam in. Resultaten worden lokaal op hun toestel bewaard.

Wil je als leerkracht alle resultaten centraal zien, gebruik dan Google Sheets met Apps Script.

1. Maak een nieuwe Google Sheet.
2. Ga naar Extensies en kies Apps Script.
3. Plak de code uit `google-apps-script-resultaten.txt`.
4. Klik op Implementeren en kies Nieuwe implementatie.
5. Kies type Webapp.
6. Toegang uitvoeren als jezelf.
7. Toegang voor iedereen met de link.
8. Kopieer de webapp link.
9. Open `data/settings.json`.
10. Plak de link bij `resultEndpoint`.

Daarna komen de resultaten automatisch in je Google Sheet.
