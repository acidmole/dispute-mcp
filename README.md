# dispute-mcp

MCP-palvelin suomalaisten oikeudellisten riitojen luomiseen. Auttaa kuluttajia riitauttamaan laskuja, vastaamaan käräjäoikeuden haasteisiin ja tekemään reklamaatioita suomalaisen lainsäädännön viittauksilla. Tukee myös elatusapuasioita (elatussopimus, elatusapuhakemus, muutoshakemus ja Kela-elatustukihakemus).

Toimii täysin paikallisesti ilman ulkoisia API-avaimia. Embedding-malli (multilingual-e5-large) ladataan ja ajetaan lokaalisti.

> **TÄRKEÄ HUOMAUTUS**: Tämä työkalu ei ole oikeudellinen neuvo eikä korvaa juristia. Työkalu tuottaa automaattisesti generoituja asiakirjoja, jotka voivat sisältää virheitä tai puutteita. Tarkista aina oikeudelliset väitteet ja asiakirjat pätevän juristin kanssa ennen niiden käyttämistä. Tekijät eivät vastaa työkalun tuottamien asiakirjojen oikeellisuudesta tai niiden käytöstä aiheutuvista seurauksista.

## Asiakirjatyypit

Palvelin tukee 14 oikeudellista asiakirjatyyppiä, kukin oikeusperusteisella rakenteella:

| Asiakirjatyyppi | ID | Oikeusperusta | Vastaanottaja |
|----------------|-----|---------------|---------------|
| Vastaus käräjäoikeudelle | `karajaoikeus_vastaus` | OK 5:10 | Käräjäoikeus |
| Reklamaatio | `reklamaatio` | KSL 5:16 | Myyjä |
| KRIL-hakemus | `kril_hakemus` | Laki KRIL:stä | Kuluttajariitalautakunta |
| Laskun kiistäminen | `laskun_kiistaminen` | Perintälaki 4c § | Laskuttaja |
| Perinnän kiistäminen | `perinnan_kiistaminen` | Perintälaki 4b-4c § | Perintätoimisto |
| Hallintovalitus | `hallinto_valitus` | Hallintoprosessilaki 8 § | Hallinto-oikeus |
| Vakuutusoikaisu | `vakuutus_oikaisu` | Vakuutussopimuslaki | Vakuutusyhtiö |
| Vuokrareklamaatio | `vuokra_reklamaatio` | Huoneenvuokralaki | Vuokranantaja |
| Vahingonkorvaus | `vahingonkorvaus` | Vahingonkorvauslaki | Vahingonaiheuttaja |
| Takaisinsaantihakemus | `takaisinsaanti` | OK 12:15 | Käräjäoikeus |
| Elatussopimus | `elatusapu_sopimus` | Laki lapsen elatuksesta 7 § | Lastenvalvoja |
| Elatusapuhakemus | `elatusapu_hakemus` | Laki lapsen elatuksesta 8-11 § | Käräjäoikeus |
| Elatusavun muutoshakemus | `elatusapu_muutos` | Laki lapsen elatuksesta 11 § | Lastenvalvoja / käräjäoikeus |
| Elatustukihakemus (Kela) | `elatustuki_hakemus` | Elatustukilaki (580/2008) | Kela |

Jokaiselle asiakirjatyypille on määritelty pakolliset osiot, muodolliset vaatimukset, määräajat ja varoitukset.

## Oikeuslähteet

Palvelin indeksoi viidestä julkisesta oikeuslähteestä ja hakee niistä semanttisella vektorihaulla:

| Lähde | Tyyppi | Sisältö | Lähde |
|-------|--------|---------|-------|
| **Ajantasainen lainsäädäntö** | `law` | 24 keskeistä lakia: kuluttajaoikeus + perheoikeus (ajantasaiset konsolidoidut versiot) | [Finlex Open Data](https://opendata.finlex.fi) |
| **KKO** | `kko_ruling` | Korkeimman oikeuden ennakkopäätökset | Finlex Open Data |
| **KHO** | `kho_ruling` | Korkeimman hallinto-oikeuden päätökset | Finlex Open Data |
| **HE** | `he_document` | Hallituksen esitykset (lain esityöt) | Finlex Open Data |
| **KRIL** | `consumer_board` | Kuluttajariitalautakunnan ratkaisut | [kuluttajariita.fi](https://www.kuluttajariita.fi/paatokset/) |

## Asennus

```bash
git clone https://github.com/acidmole/dispute-mcp.git
cd dispute-mcp
npm install
npm run build
```

Ei vaadi API-avaimia tai ympäristömuuttujia. Embedding-malli ladataan automaattisesti ensimmäisellä käyttökerralla (~1.3 GB).

## Tietokannan indeksointi

Ennen käyttöä oikeuslähteet pitää indeksoida paikalliseen vektoritietokantaan:

```bash
# Indeksoi kaikki lähteet (kestää ~2 tuntia)
npm run index-finlex

# Tai indeksoi yksittäinen lähde
npm run index-finlex -- --source=law      # Säädökset (~5 min)
npm run index-finlex -- --source=kko      # KKO ennakkopäätökset (~30 min)
npm run index-finlex -- --source=kho      # KHO päätökset (~30 min)
npm run index-finlex -- --source=he       # Hallituksen esitykset (~40 min)
npm run index-finlex -- --source=kril     # Kuluttajariitalautakunta (~20 min)

# Rajaa vuosilla (KKO, KHO, HE)
npm run index-finlex -- --source=kko --start-year=2020 --end-year=2025
```

## Käyttö MCP-palvelimena

### Claude Desktop

Lisää `claude_desktop_config.json` -tiedostoon:

```json
{
  "mcpServers": {
    "dispute-mcp": {
      "command": "node",
      "args": ["/polku/dispute-mcp/build/index.js"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add dispute-mcp node /polku/dispute-mcp/build/index.js
```

## MCP-kapabiliteetit

Palvelin tarjoaa kolme MCP-mekanismia:

### Prompts (Claude Desktop)

Asiakirjatyyppikohtaiset rakenneohjeistukset. Claude saa automaattisesti tiedon pakollisista osioista, muodollisista vaatimuksista, määräajoista ja ehdotetuista oikeuslähdehauista ennen asiakirjan laatimista. Valittavissa Claude Desktopin prompt-valikosta.

### Resources (Claude Code + Desktop)

Samat asiakirjarakenteet saatavilla myös resursseina URI-osoitteilla:

```
dispute://templates/karajaoikeus_vastaus
dispute://templates/reklamaatio
dispute://templates/kril_hakemus
dispute://templates/laskun_kiistaminen
dispute://templates/perinnan_kiistaminen
dispute://templates/hallinto_valitus
dispute://templates/vakuutus_oikaisu
dispute://templates/vuokra_reklamaatio
dispute://templates/vahingonkorvaus
dispute://templates/takaisinsaanti
dispute://templates/elatusapu_sopimus
dispute://templates/elatusapu_hakemus
dispute://templates/elatusapu_muutos
dispute://templates/elatustuki_hakemus
```

### Tools

#### `analyze_document`

Analysoi asiakirjan (lasku, haaste, sopimus) ja poimii rakenteelliset tiedot: osapuolet, vaatimukset, rahamäärät, päivämäärät, viitenumerot.

- Tukee PDF, kuva (OCR/Tesseract), tekstitiedostot
- Syöte: `file_path` tai `text` + `document_type`

#### `search_legal`

Semanttinen haku oikeuslähteistä. Palauttaa relevantit lakitekstit, oikeustapaukset ja muut lähteet viittauksineen.

- `query`: Hakukysely suomeksi
- `source_type`: `law`, `kko_ruling`, `kho_ruling`, `he_document`, `consumer_board`, `all`
- `legal_area`: Rajaa oikeudenalaan, esim. `kuluttajansuoja`, `sopimusoikeus`
- `limit`: Tulosten enimmäismäärä (1-50)

#### `generate_dispute`

Luo rakenteellisen oikeudellisen asiakirjan yhdistämällä dokumenttianalyysin, oikeusviittaukset ja käyttäjän argumentit.

- `dispute_type`: Mikä tahansa 14 asiakirjatyypistä (tai legacy-tyypeistä)
- Tuottaa asiakirjatyypin mukaisen rakenteen pakollisine osioineen
- Viittaukset ryhmiteltyinä: lainkohdat, oikeuskäytäntö (KKO/KHO), lain esityöt (HE), lautakuntaratkaisut (KRIL)

## Tyypillinen työnkulku

1. Claude valitsee asiakirjatyypin **promptista/resurssista** ja saa rakenneohjeistuksen
2. **Analysoi** saatu asiakirja `analyze_document`-työkalulla
3. **Hae** relevantteja oikeuslähteitä `search_legal`-työkalulla (promptin ehdottamilla hauilla)
4. **Luo** asiakirja `generate_dispute`-työkalulla oikealla rakenteella
5. Claude täydentää ja viimeistelee argumentit

## Arkkitehtuuri

```
src/
├── index.ts                    # MCP-palvelin (stdio, tools + prompts + resources)
├── types.ts                    # Tyypit ja lakidata
├── data/
│   ├── document-templates.ts   # 14 asiakirjatyyppiä rakennetietoineen
│   ├── elatusapu-constants.ts  # Elatusapuvakiot (OM 2007:2, STM indeksitarkistukset)
│   ├── finlex-fetcher.ts       # Säädösten haku Finlex API:sta
│   ├── case-law-fetcher.ts     # KKO/KHO ennakkopäätösten haku
│   ├── he-fetcher.ts           # Hallituksen esitysten haku
│   ├── kril-scraper.ts         # KRIL-ratkaisujen scraper
│   ├── indexer.ts              # LanceDB-indeksointi + embedding
│   └── schemas.ts              # Zod-validointiskemat
├── services/
│   ├── prompt-builder.ts       # Asiakirjatyypin rakenneohjeistus
│   ├── embedding.ts            # Lokaali embedding (multilingual-e5-large)
│   ├── legal-search.ts         # Vektorihaku LanceDB:stä
│   ├── document-parser.ts      # PDF/kuva/teksti-parseri
│   └── dispute-generator.ts    # Template-pohjainen asiakirjan generointi
└── tools/
    ├── analyze-document.ts
    ├── search-legal.ts
    └── generate-dispute.ts
```

## Teknologiat

- **TypeScript** + Node.js (ES2022)
- **@modelcontextprotocol/sdk** - MCP-protokolla (tools, prompts, resources)
- **LanceDB** - Embedded vektoritietokanta
- **@huggingface/transformers** - Lokaali embedding (multilingual-e5-large, 1024 dim)
- **fast-xml-parser** - Akoma Ntoso XML -parsinta
- **pdf-parse** + **tesseract.js** - PDF ja OCR

## Tietolähteet

### Finlex Open Data API

Ajantasainen lainsäädäntö, oikeuskäytäntö ja hallituksen esitykset haetaan [Finlex Open Data API:sta](https://opendata.finlex.fi) Akoma Ntoso XML -muodossa. Säädökset haetaan konsolidoituina ajantasaisina versioina, jotka sisältävät kaikki voimassa olevat muutokset. Lisenssi: CC BY 4.0 (ajantasainen lainsäädäntö CC BY-NC 4.0).

Indeksoidut lait:

- Kuluttajansuojalaki (38/1978)
- Oikeudenkäymiskaari (4/1734)
- Vahingonkorvauslaki (412/1974)
- Korkolaki (633/1982)
- Laki saatavien perinnästä (513/1999)
- Asuntokauppalaki (843/1994)
- Työsopimuslaki (55/2001)
- Perustuslaki (731/1999)
- Laki varallisuusoikeudellisista oikeustoimista (228/1929)
- Kauppalaki (120/1966)
- Laki kuluttajariitalautakunnasta (746/2013)
- Maakaari (1552/1995)
- Laki asuinhuoneiston vuokrauksesta (746/2005)
- Laki sähköisestä viestinnästä (460/2007)
- Rikoslaki, 36 luku – petokset (527/2013)
- Kuluttajaturvallisuuslaki (100/2010)
- Laki velan vanhentumisesta (1118/1996)
- Tietosuojalaki (228/2004)

**Perheoikeus:**

- Laki lapsen elatuksesta (704/1975)
- Elatustukilaki (580/2008)
- Avioliittolaki (234/1929)
- Isyyslaki (11/2015)
- Äitiyslaki (253/2018)
- Laki lapsen huollosta ja tapaamisoikeudesta (361/1983)

### Elatusapuohjeistukset

Elatusaputoiminnallisuus perustuu seuraaviin virallisiin ohjeisiin:

- **OM 2007:2** "Ohje lapsen elatusavun suuruuden arvioimiseksi" — peruslaskentaohje
- **OM 2023** "Elatusapu vuoroasumistilanteessa" — vuoroasumisen erityissäännöt
- **STM** "Elatusapujen määrät" — vuosittaiset indeksitarkistukset (2026: kerroin 2338/2343)

### Kuluttajariitalautakunta

KRIL-ratkaisut haetaan [kuluttajariita.fi](https://www.kuluttajariita.fi/paatokset/) -sivustolta. Julkista viranomaisdataa.

## Vastuuvapauslauseke

**Tämä työkalu EI ole oikeudellinen palvelu.** Se on tekninen apuväline, joka hakee julkisia oikeuslähteitä ja tuottaa asiakirjapohjia. Työkalun tuottamat asiakirjat:

- Voivat sisältää virheellisiä tai vanhentuneita lakiviittauksia
- Eivät huomioi tapauskohtaisia erityispiirteitä
- Eivät korvaa oikeudellista neuvontaa
- Tulee aina tarkistuttaa juristilla ennen käyttöä

Tekijät eivät vastaa työkalun käytöstä aiheutuvista vahingoista.

## Kiitokset

MCP-työkalut kehitetty [@hoblin](https://github.com/hoblin):n MCP-tooling-ratkaisujen pohjalta.

## Lisenssi

MIT
