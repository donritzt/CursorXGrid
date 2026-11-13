# TrendsType

Een typetest met tijd- en woordmodi, Nederlandse en Engelse woorden en een apart scoreoverzicht. Zonder Supabase worden scores lokaal opgeslagen in `data/scores.json`. Met Supabase worden nieuwe scores centraal opgeslagen zodat ze op meerdere apparaten beschikbaar zijn.

## Lokaal starten

Dubbelklik op [`start-trendstype.bat`](./start-trendstype.bat) in de projectmap. De eerste keer installeert het script zo nodig automatisch de benodigde onderdelen. Open daarna <http://localhost:3000> in je browser.

Laat het zwarte servervenster open zolang je de app gebruikt. Druk in dat venster op `Ctrl+C` om de server te stoppen. Als Node.js niet gevonden wordt, bekijk dan de installatie-informatie in deze README.

Je kunt de server ook handmatig vanuit VS Code starten via **Terminal → New Terminal**:

```powershell
& "$env:LOCALAPPDATA\Programs\TrendsType-Node\node.exe" server.js
```

## Typetest gebruiken

Kies vóór de test de tijdsduur of het aantal woorden. Kies de taal met de aparte knoppen **Nederlands** en **English** en stel daarnaast de moeilijkheid in op **Normaal** of **1k**. 1k is een moeilijkheidsgraad, geen aantal woorden. Iedere test krijgt een opnieuw geschudde woordenlijst zonder herhalingen. Tijdens tijdtests zie je de resterende tijd live. Een fout teken dat je met Backspace corrigeert telt als een halve fout voor nauwkeurigheid en foutentotaal. Na afloop blijven WPM, nauwkeurigheid en fouten in het typescherm staan totdat je opnieuw start of op **Esc** drukt. Met **Zelfde tekst opnieuw** kun je dezelfde woorden opnieuw proberen; tijdens die poging laat een subtiele schaduw je snelste voortgang zien. Gebruik de tab **Scores** bovenaan om bestaande scores te bekijken; nieuwe scores opslaan is momenteel uitgeschakeld.

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

4. Herstart de server met `start-trendstype.bat`. In het servervenster hoort te staan dat scores in Supabase worden opgeslagen.

De geheime sleutel wordt alleen door de backend gebruikt en `.env` is uitgesloten van Git. Als beide Supabase-waarden leeg zijn, gebruikt de app lokale JSON-opslag. Als Supabase is ingesteld maar niet bereikbaar is, meldt de app een fout en schakelt hij niet stilletjes over naar lokale opslag. Bij het starten worden bestaande scores uit `data/scores.json` veilig naar Supabase overgezet; opnieuw starten maakt geen dubbele scores aan.

## Eigen domein met Cloudflare Tunnel

Zorg dat `cloudflared` beschikbaar is en dat je domein in Cloudflare staat. Maak een tunnel aan (eenmalig):

```powershell
cloudflared tunnel login
cloudflared tunnel create trendstype
cloudflared tunnel route dns trendstype type.jouwdomein.nl
```

Maak `%USERPROFILE%\.cloudflared\config.yml` met de UUID die `tunnel create` heeft getoond:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: C:\Users\<JOUW-NAAM>\.cloudflared\<TUNNEL-UUID>.json

ingress:
  - hostname: type.jouwdomein.nl
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Start eerst de TrendsType-server en daarna in een tweede PowerShell-venster:

```powershell
cloudflared tunnel run trendstype
```

Gebruik Cloudflare Access om de openbare domeinnaam af te schermen. Zonder toegangsbeleid kan iedereen met de URL de app bereiken.
