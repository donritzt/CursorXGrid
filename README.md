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
