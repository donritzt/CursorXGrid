# CursorXGrid

CursorXGrid (CXG) is een Windows-typetest met Nederlandse en Engelse woorden,
verschillende testmodi, Time Race en een scoreoverzicht.

## Downloaden en installeren

- [Download de Windows-installer voor versie 1.1.0](https://github.com/donritzt/CursorXGrid/releases/download/v1.1.0/CursorXGrid-Setup-1.1.0-x64.exe).
- [Bekijk de nieuwste versie op GitHub](https://github.com/donritzt/CursorXGrid/releases/latest).

De app heeft een nieuwe Windows-identiteit en wordt naast bestaande installaties
geïnstalleerd; eerdere desktopvoorkeuren worden niet automatisch overgenomen.

Open de installer en volg de stappen. Je hebt geen Node.js nodig om de app te
gebruiken. Omdat de installer momenteel niet is ondertekend, kunnen Windows of
je browser een waarschuwing tonen.

De desktopapp start schermvullend. Met **F11** schakel je tussen volledig
scherm en een venster; **Esc** blijft beschikbaar voor de typetest.

Bij het opstarten controleert de app op updates. Wanneer een update beschikbaar
is, kies je zelf of je die downloadt en installeert. De download verschijnt in
de app; na bevestiging sluit CursorXGrid kort, installeert de update zonder
installatievenster en start opnieuw. Windows kan alsnog een beveiligings- of
toestemmingsmelding tonen. Je kunt ook zonder internet typen, maar het gedeelde
scorebord werkt pas als de server en Supabase zijn ingesteld en bereikbaar zijn.

## Projectstructuur

- `electron/`: desktopvenster, beveiligde verbinding en updatecontrole.
- `public/`: frontend en afbeeldingen.
- `server.js`: Express-server en score-API.
- `supabase/`: SQL-schema voor centrale scores.
- `test/`: tests voor de desktopapp.
- `package.json` en `package-lock.json`: versie en afhankelijkheden.

## Ontwikkeling en Windows-build

De desktopapp verpakt de frontend lokaal met Electron. Voor een gedeeld
scorebord blijft de bestaande Express-server extern draaien met Supabase.
Het venster en de Windows-installer gebruiken het CursorXGrid-logo.
De `service_role`-sleutel hoort alleen op die server en nooit in de app of
installer. Zonder ingestelde of bereikbare server kun je typen en Time Race
spelen, maar kun je geen scores ophalen of opslaan. De desktopapp maakt geen
apart lokaal scorebord aan.

Installeer op de ontwikkelmachine Node.js 22.12 of nieuwer voor de
Electron-bouwtools en voer in de projectmap uit:

```powershell
npm install
# Optioneel: uitsluitend de HTTPS-origin van je eigen server, zonder pad.
# $env:CURSORXGRID_API_URL = "https://type.jouwdomein.nl"
npm run desktop
npm run dist:win
```

`npm run desktop` start de desktopapp voor ontwikkeling; `npm run dist:win`
maakt een 64-bit Windows NSIS-installer in `dist/`. De installer bevat zijn
eigen Electron-runtime: spelers hoeven Node.js niet te installeren. De ingestelde
API-origin wordt tijdens het bouwen vastgelegd; maak een nieuwe installer als
het adres verandert. Is nog geen adres beschikbaar, laat de variabele weg:
de app start dan zonder scoreverbinding. Ongeldige, niet-HTTPS-adressen worden
afgewezen.

Voor gedeelde scores moet je de bestaande server met Supabase-configuratie
zelf bereikbaar maken op een vast HTTPS-adres. De testsessies staan in het
geheugen van de server; na een serverherstart moeten actieve tests opnieuw
worden gestart.

### Releases en updates

Alleen code naar GitHub pushen verspreidt **geen** update. Publiceer voor
iedere nieuwe versie zelf een GitHub Release:

1. Zorg dat je appwijzigingen getest en naar `main` gepusht zijn. Controleer
   met `git status` dat je geen werk bent vergeten.
2. Verhoog de versie in `package.json` en `package-lock.json`. Bijvoorbeeld
   voor een kleine bugfix (`1.0.4` wordt `1.0.5`):

   ```powershell
   npm version patch --no-git-tag-version
   $version = node -p "require('./package.json').version"
   ```

   Werk de downloadinformatie bovenaan deze README bij zodra de release
   bestaat en push daarna de versiebestanden en README:

   ```powershell
   git add package.json package-lock.json README.md
   git commit -m "Release v$version"
   git push origin main
   ```

   Gebruik `npm version minor --no-git-tag-version` voor nieuwe functies of
   `major` voor niet-compatibele wijzigingen. Kies telkens een hogere versie.
3. Bouw de installer van die versie. Stel, zodra de server bestaat, telkens
   dezelfde vaste HTTPS-origin in; laat de variabele weg als er nog geen
   score-server is:

   ```powershell
   # $env:CURSORXGRID_API_URL = "https://type.jouwdomein.nl"
   npm run dist:win
   ```

4. Open de pagina **Releases** van de openbare GitHub-repository
   `donritzt/CursorXGrid`, kies **Draft a new release** en maak een nieuwe tag
   zoals `v1.0.5` op de zojuist gepushte commit. Upload uit `dist/` de
   **installer van die versie**, `latest.yml` en het bijbehorende
   `.blockmap`-bestand als dat is gegenereerd. Publiceer als normale release,
   niet als draft of prerelease. De build publiceert niets automatisch.
5. Test de release met een computer waarop een oudere versie geïnstalleerd is.
   Bij de volgende start controleert de app op updates. De speler krijgt buiten
   een actieve test een melding en kiest zelf om te downloaden en daarna te
   installeren en herstarten. Bestaande installaties gebruiken hiervoor nog hun
   eigen update-interface; de nieuwe interface werkt vanaf de versie waarin
   deze wijziging is uitgebracht. Een draaiende app controleert niet opnieuw tot
   de volgende start. Internet en toegang tot de openbare release zijn nodig.
   Als de app al up-to-date is, wordt dat gemeld. Als er nog geen release
   bestaat, meldt de app dat er nog geen updates gepubliceerd zijn.

De app werkt ook als de updatecontrole mislukt. De gewone `dist:win`-build
kan ongetekend zijn, waardoor Windows en browsers kunnen waarschuwen. Gebruik
voor publieke releases een vertrouwd Windows-codeondertekeningscertificaat en
bewaak de privésleutel buiten de repository. Configureer electron-builder
bijvoorbeeld met `WIN_CSC_LINK` en `WIN_CSC_KEY_PASSWORD` via een beveiligde
buildomgeving; zie de
[electron-builder-documentatie](https://www.electron.build/docs/features/code-signing/code-signing-win/).
Gebruik vervolgens `npm run dist:win:signed` in plaats van `npm run dist:win`:
die build moet mislukken als ondertekening niet lukt. Controleer vóór publicatie
ook de digitale handtekening van de installer.

Een geldig certificaat identificeert de uitgever, maar garandeert niet dat
SmartScreen of een browser direct geen waarschuwing meer toont: reputatie kan
nog moeten worden opgebouwd. Zie
[Microsofts uitleg over SmartScreen](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).
Een zelfondertekend certificaat is voor openbare distributie niet geschikt.
Deel nooit certificaten, privésleutels, wachtwoorden, GitHub-tokens of
Supabase-sleutels in de installer of repository.

## Typetest gebruiken

- Kies een tijdsduur of aantal woorden, de taal en de moeilijkheid **Normaal**
  of **1k**. Iedere test gebruikt een geschudde woordenlijst.
- Tijdens het typen verdwijnen de instellingen voor een rustige focusweergave.
  De resterende tijd of woordvoortgang en live WPM blijven subtiel zichtbaar;
  na afloop verschijnt de uitslag.
- De uitslag toont WPM, raw WPM, nauwkeurigheid, fouten, consistentie en een
  snelheidsgrafiek. Een gecorrigeerd fout teken telt als een halve fout mee
  voor nauwkeurigheid en foutentotaal.
- Druk op **Enter** voor dezelfde tekst of op **Esc** om terug te gaan. Kies
  **Opnieuw typen** voor een nieuwe tekst. Bij een herhaling toont een
  schaduw je snelste eerdere voortgang.
- Met **Tab** gevolgd door **Enter** binnen 1,5 seconde herstart je de test.
  Onderaan kies je het lettertype en een van de elf kleurthema's. Regular
  gebruikt een neutrale antracietachtergrond; bij de andere thema's past de
  achtergrond zich aan de accentkleur aan. Beide voorkeuren worden op het
  apparaat onthouden. De app gebruikt lokale systeemfonts.
- Via **Time Race** start je met 10 seconden. Een correct woord gevolgd door
  spatie of Enter levert een punt op; bonuswoorden voegen 3 seconden toe.
  Time Race wordt niet op het normale scorebord opgeslagen.
- Na een normale test kun je je naam en score opslaan als de score-server
  beschikbaar is. Bekijk het scorebord via het agenda-icoon **Scores** en
  keer met het logo terug naar de typetest.

Tijdens een test zijn kopiëren, knippen, plakken en slepen geblokkeerd. Als
het testvenster de focus verliest, wordt de test opnieuw ingesteld.

## Woordenlijsten

De Nederlandse en Engelse woordenlijsten zijn gefilterde selecties van FrequencyWords door Hermit Dave, gebaseerd op OpenSubtitles 2018. De aangepaste selecties vallen onder CC BY-SA 4.0: <https://creativecommons.org/licenses/by-sa/4.0/>. Bron: <https://github.com/hermitdave/FrequencyWords>.

## Centrale scores met Supabase

Supabase biedt een gratis pakket met gebruikslimieten en voorwaarden die kunnen veranderen. Maak zelf een project aan op <https://supabase.com>.

1. Open in het Supabase-dashboard **SQL Editor** en voer de inhoud van [`supabase/schema.sql`](./supabase/schema.sql) uit.
2. Kopieer de project-URL en de geheime `service_role`-sleutel uit de API-instellingen van het project. Deel die sleutel niet en zet hem nooit in browsercode of Git.
3. Kopieer `.env.example` naar `.env` in de projectmap en vul je eigen waarden in:

   ```text
   SUPABASE_URL=https://jouw-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=jouw-geheime-service-role-sleutel
   ```

4. Herstart de server en controleer de melding dat scores in Supabase worden
   opgeslagen. Zonder Supabase bewaart de server scores in `data/scores.json`.
5. Maak de server bereikbaar via een vast HTTPS-adres en bouw de desktopapp
   met dat adres als `CURSORXGRID_API_URL`. De desktopapp bevat geen geheime
   Supabase-sleutel.
