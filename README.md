# TrendsType

Een typetest met tijd- en woordmodi, Nederlandse en Engelse woorden en een apart scoreoverzicht. Zonder Supabase worden scores lokaal opgeslagen in `data/scores.json`. Met Supabase worden nieuwe scores centraal opgeslagen zodat ze op meerdere apparaten beschikbaar zijn.

## Lokaal starten

Dubbelklik op [`scripts/start-trendstype.bat`](./scripts/start-trendstype.bat) in de projectmap. De eerste keer installeert het script zo nodig automatisch de benodigde onderdelen. Open daarna <http://localhost:3000> in je browser.

Laat het zwarte servervenster open zolang je de app gebruikt. Druk in dat venster op `Ctrl+C` om de server te stoppen. Als Node.js niet gevonden wordt, bekijk dan de installatie-informatie in deze README.

Je kunt de server ook handmatig vanuit VS Code starten via **Terminal → New Terminal**:

```powershell
& "$env:LOCALAPPDATA\Programs\TrendsType-Node\node.exe" server.js
```

## Projectstructuur

- `server.js`: Express-server en API.
- `public/`: frontend; afbeeldingen staan in `public/assets/`.
- `scripts/`: Windows-startscript.
- `supabase/`: SQL-schema voor centrale scores.
- `package.json` en `package-lock.json`: projectafhankelijkheden.

## Windows-desktopapp

De desktopapp verpakt de frontend lokaal met Electron. Voor een gedeeld
scorebord blijft de bestaande Express-server extern draaien met Supabase.
Het venster en de Windows-installer gebruiken het TrendsType-logo.
De `service_role`-sleutel hoort alleen op die server en nooit in de app of
installer. Zonder ingestelde of bereikbare server kun je typen en Time Race
spelen, maar kun je geen scores ophalen of opslaan. De desktopapp maakt geen
apart lokaal scorebord aan.

Installeer op de ontwikkelmachine Node.js 22.12 of nieuwer voor de
Electron-bouwtools en voer in de projectmap uit:

```powershell
npm install
# Optioneel: uitsluitend de HTTPS-origin van je eigen server, zonder pad.
# $env:TRENDSTYPE_API_URL = "https://type.jouwdomein.nl"
npm run desktop
npm run dist:win
```

`npm run desktop` start de desktopapp voor ontwikkeling; `npm run dist:win`
maakt een 64-bit Windows NSIS-installer in `dist/`. De installer bevat zijn
eigen Electron-runtime: spelers hoeven Node.js niet te installeren. De ingestelde
API-origin wordt tijdens het bouwen vastgelegd; maak een nieuwe installer als
het adres verandert. Is nog geen adres beschikbaar, laat de variabele weg:
de app start dan zonder scoreverbinding. Ongeldige, niet-HTTPS-adressen worden
afgewezen. De gewone webapp blijft beschikbaar via `npm start`.

Voor gedeelde scores moet je de bestaande server met Supabase-configuratie
zelf bereikbaar maken op een vast HTTPS-adres. Een tijdelijke Quick Tunnel kan
van adres veranderen en is daarom geen geschikte vaste releaseconfiguratie.
De testsessies staan in het geheugen van de server; na een serverherstart
moeten actieve tests opnieuw worden gestart.

### Releases en updates

Alleen code naar GitHub pushen verspreidt **geen** update. Publiceer voor
iedere nieuwe versie zelf een GitHub Release:

1. Zorg dat je appwijzigingen getest en naar `main` gepusht zijn. Controleer
   met `git status` dat je geen werk bent vergeten.
2. Verhoog de versie in `package.json` en `package-lock.json`. Bijvoorbeeld
   voor een kleine bugfix (`1.0.0` wordt `1.0.1`):

   ```powershell
   npm version patch --no-git-tag-version
   $version = node -p "require('./package.json').version"
   git add package.json package-lock.json
   git commit -m "Release v$version"
   git push origin main
   ```

   Gebruik `npm version minor --no-git-tag-version` voor nieuwe functies of
   `major` voor niet-compatibele wijzigingen. Kies telkens een hogere versie.
3. Bouw de installer van die versie. Stel, zodra de server bestaat, telkens
   dezelfde vaste HTTPS-origin in; laat de variabele weg als er nog geen
   score-server is:

   ```powershell
   # $env:TRENDSTYPE_API_URL = "https://type.jouwdomein.nl"
   npm run dist:win
   ```

4. Open de pagina **Releases** van de openbare GitHub-repository
   `donritzt/TrendsType`, kies **Draft a new release** en maak een nieuwe tag
   zoals `v1.0.1` op de zojuist gepushte commit. Upload uit `dist/` de
   **installer van die versie**, `latest.yml` en het bijbehorende
   `.blockmap`-bestand als dat is gegenereerd. Publiceer als normale release,
   niet als draft of prerelease. De build publiceert niets automatisch.
5. Test de release met een computer waarop een oudere versie geïnstalleerd is.
   Bij de volgende start controleert de app op updates. De speler krijgt buiten
   een actieve test een melding en kiest zelf om te downloaden en daarna te
   installeren en herstarten. Een draaiende app controleert niet opnieuw tot
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

Kies vóór de test de tijdsduur of het aantal woorden. Kies de taal met de aparte knoppen **Nederlands** en **English** en stel daarnaast de moeilijkheid in op **Normaal** of **1k**. 1k is een moeilijkheidsgraad, geen aantal woorden. Iedere test krijgt een opnieuw geschudde woordenlijst zonder herhalingen. Tijdens tijdtests zie je de resterende tijd live. Een fout teken dat je met Backspace corrigeert telt als een halve fout voor nauwkeurigheid en foutentotaal. Na afloop zie je WPM, raw WPM, nauwkeurigheid, fouten en consistentie, plus een grafiek van je raw WPM per seconde op dezelfde pagina. De brede, transparante uitslag staat iets boven het midden en vervangt tijdelijk de typetest; de hoofdbalk en instellingen verdwijnen ook en komen bij **Esc** vloeiend terug. Druk op **Enter** om dezelfde tekst opnieuw te typen, op **Esc** om met een vloeiende overgang terug te keren naar de typetest of op **Opnieuw typen** voor een nieuwe tekst. De consistentiescore is gebaseerd op hoeveel je tempo gedurende de test schommelde. Met **Zelfde tekst opnieuw** kun je dezelfde woorden opnieuw proberen; tijdens die poging laat een subtiele schaduw je snelste voortgang zien. Na een normale typetest kun je je naam invullen en je score opslaan; de server controleert de testsessie en score voordat die op het scorebord verschijnt. **Time Race** wordt niet opgeslagen op het normale scorebord. Gebruik de tab **Scores** bovenaan om scores te bekijken.

Start **Time Race** met de kleine klokkaart aan de rechterkant van het startscherm. Na een aftellende 3–2–1 start de ronde met 10 seconden. Typ een woord precies goed en druk op spatie of Enter om een punt te scoren. Om de 3 tot 5 woorden verschijnt een bonuswoord dat 3 seconden toevoegt. Bij nul seconden zie je je score en kun je opnieuw spelen; druk op **Esc** om terug te gaan naar de normale typetest.

Druk op **Tab** en daarna binnen 1,5 seconde op **Enter** om de test direct opnieuw te starten, ook tijdens het typen.

Rechts onderaan kun je het lettertype aanpassen. De keuze wordt in deze browser onthouden; de app gebruikt lokale systeemfonts en haalt dus geen lettertypes van internet.

Tijdens een test zijn kopiëren, knippen, plakken en slepen geblokkeerd. Als het testvenster de focus verliest of het tabblad wordt verlaten, wordt de test ongeldig en opnieuw ingesteld. Een website kan het wisselen van browsertabbladen niet volledig verhinderen.

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

4. Herstart de server met `scripts\start-trendstype.bat`. In het servervenster hoort te staan dat scores in Supabase worden opgeslagen.
## Delen via Cloudflare Tunnel

### Tijdelijke link (Quick Tunnel)

Start TrendsType met `scripts/start-trendstype.bat`. Dubbelklik daarna op `scripts/start-trendstype-quick-tunnel.bat`. Het script controleert eerst of TrendsType bereikbaar is en start dan de tunnel. De deelbare URL verschijnt in het tunnelvenster.

Je kunt de tunnel ook handmatig in een tweede PowerShell-venster starten:

```powershell
& "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:3000 --no-autoupdate
```

De Quick Tunnel-link is tijdelijk en kan bij een nieuwe start veranderen. De link werkt alleen zolang zowel de TrendsType-server als het tunnelvenster actief zijn. Druk op `Ctrl+C` in het tunnelvenster om de tunnel te stoppen. Iedereen met de link kan de app bereiken.

### Vaste URL met een eigen domein

Voor een vaste URL, bijvoorbeeld `type.jouwdomein.nl`, heb je een eigen domein nodig dat aan Cloudflare is toegevoegd en daar actief is. Een Cloudflare-account zonder domein is niet genoeg. De tunnel en DNS-route stel je eenmalig in; daarna kun je de tunnel steeds starten en stoppen terwijl de URL hetzelfde blijft.

1. Voeg je domein toe aan Cloudflare. Als het domein ergens anders is geregistreerd, volg dan Cloudflares stappen om de nameservers naar Cloudflare te laten verwijzen.
2. Meld `cloudflared` eenmalig aan bij Cloudflare. Dit opent een browservenster:

   ```powershell
   $cloudflared = "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe"
   & $cloudflared tunnel login
   ```

3. Maak de tunnel en DNS-route aan; vervang de hostnaam door een adres onder je eigen domein:

   ```powershell
   & $cloudflared tunnel create trendstype
   & $cloudflared tunnel route dns trendstype type.jouwdomein.nl
   ```

   Bewaar de tunnel-UUID die het eerste commando toont.
4. Maak `%USERPROFILE%\.cloudflared\config.yml` met die UUID en het bijbehorende credentials-bestand:

   ```yaml
   tunnel: <TUNNEL-UUID>
   credentials-file: C:\Users\<JOUW-NAAM>\.cloudflared\<TUNNEL-UUID>.json

   ingress:
     - hostname: type.jouwdomein.nl
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```

5. Start eerst TrendsType en daarna de tunnel in een tweede PowerShell-venster:

   ```powershell
   & "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe" tunnel run trendstype
   ```

Druk op `Ctrl+C` om de tunnel te stoppen en start hetzelfde commando opnieuw om hem weer aan te zetten. De URL blijft gelijk, maar is alleen bereikbaar zolang zowel TrendsType als de tunnel draaien. Zonder Cloudflare Access kan iedereen met de vaste URL de app bereiken.
