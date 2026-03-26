# dispute-mcp

MCP-palvelin suomalaisten oikeudellisten riitojen luomiseen. Auttaa kuluttajia riitauttamaan laskuja, vastaamaan käräjäoikeuden haasteisiin ja tekemään reklamaatioita suomalaisen lainsäädännön viittauksilla.

Toimii täysin paikallisesti ilman ulkoisia API-avaimia. Embedding-malli (multilingual-e5-large) ladataan ja ajetaan lokaalisti.

> **TÄRKEÄ HUOMAUTUS**: Tämä työkalu ei ole oikeudellinen neuvo eikä korvaa juristia. Työkalu tuottaa automaattisesti generoituja asiakirjoja, jotka voivat sisältää virheitä tai puutteita. Tarkista aina oikeudelliset väitteet ja asiakirjat pätevän juristin kanssa ennen niiden käyttämistä. Tekijät eivät vastaa työkalun tuottamien asiakirjojen oikeellisuudesta tai niiden käytöstä aiheutuvista seurauksista.

## Oikeuslähteet

Palvelin indeksoi viidestä julkisesta oikeuslähteestä ja hakee niistä semanttisella vektorihaulla:

| Lähde | Tyyppi | Sisältö | Lähde |
|-------|--------|---------|-------|
| **Säädökset** | `law` | 18 kuluttajaoikeuden keskeistä lakia | [Finlex Open Data](https://opendata.finlex.fi) |
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

## MCP-työkalut

### `analyze_document`

Analysoi asiakirjan (lasku, haaste, sopimus) ja poimii rakenteelliset tiedot: osapuolet, vaatimukset, rahamäärät, päivämäärät, viitenumerot.

- Tukee PDF, kuva (OCR/Tesseract), tekstitiedostot
- Syöte: `file_path` tai `text` + `document_type`

### `search_legal`

Semanttinen haku oikeuslähteistä. Palauttaa relevantit lakitekstit, oikeustapaukset ja muut lähteet viittauksineen.

- `query`: Hakukysely suomeksi
- `source_type`: `law`, `kko_ruling`, `kho_ruling`, `he_document`, `consumer_board`, `all`
- `legal_area`: Rajaa oikeudenalaan, esim. `kuluttajansuoja`, `sopimusoikeus`
- `limit`: Tulosten enimmäismäärä (1-50)

### `generate_dispute`

Luo rakenteellisen riitakirjeen yhdistämällä dokumenttianalyysin, oikeusviittaukset ja käyttäjän argumentit.

- `dispute_type`: `invoice_denial`, `court_response`, `complaint`, `claim`, `objection`
- Tuottaa strukturoidun markdownin suomeksi tai ruotsiksi
- Viittaukset ryhmiteltyinä: lainkohdat, oikeuskäytäntö (KKO/KHO), lain esityöt (HE), lautakuntaratkaisut (KRIL)

## Tyypillinen työnkulku

1. **Analysoi** saatu asiakirja `analyze_document`-työkalulla
2. **Hae** relevantteja oikeuslähteitä `search_legal`-työkalulla
3. **Luo** riitakirje `generate_dispute`-työkalulla

## Arkkitehtuuri

```
src/
├── index.ts                    # MCP-palvelin (stdio)
├── types.ts                    # Tyypit ja lakidata
├── data/
│   ├── finlex-fetcher.ts       # Säädösten haku Finlex API:sta
│   ├── case-law-fetcher.ts     # KKO/KHO ennakkopäätösten haku
│   ├── he-fetcher.ts           # Hallituksen esitysten haku
│   ├── kril-scraper.ts         # KRIL-ratkaisujen scraper
│   ├── indexer.ts              # LanceDB-indeksointi + embedding
│   └── schemas.ts              # Zod-validointiskemat
├── services/
│   ├── embedding.ts            # Lokaali embedding (multilingual-e5-large)
│   ├── legal-search.ts         # Vektorihaku LanceDB:stä
│   ├── document-parser.ts      # PDF/kuva/teksti-parseri
│   └── dispute-generator.ts    # Riitakirjeen generointi
└── tools/
    ├── analyze-document.ts
    ├── search-legal.ts
    └── generate-dispute.ts
```

## Teknologiat

- **TypeScript** + Node.js (ES2022)
- **@modelcontextprotocol/sdk** - MCP-protokolla
- **LanceDB** - Embedded vektoritietokanta
- **@huggingface/transformers** - Lokaali embedding (multilingual-e5-large, 1024 dim)
- **fast-xml-parser** - Akoma Ntoso XML -parsinta
- **pdf-parse** + **tesseract.js** - PDF ja OCR

## Tietolähteet

### Finlex Open Data API

Säädökset, oikeuskäytäntö ja hallituksen esitykset haetaan [Finlex Open Data API:sta](https://opendata.finlex.fi) Akoma Ntoso XML -muodossa. Lisenssi: CC BY 4.0 (ajantasainen lainsäädäntö CC BY-NC 4.0).

### Kuluttajariitalautakunta

KRIL-ratkaisut haetaan [kuluttajariita.fi](https://www.kuluttajariita.fi/paatokset/) -sivustolta. Julkista viranomaisdataa.

## Vastuuvapauslauseke

**Tämä työkalu EI ole oikeudellinen palvelu.** Se on tekninen apuväline, joka hakee julkisia oikeuslähteitä ja tuottaa asiakirjapohjia. Työkalun tuottamat asiakirjat:

- Voivat sisältää virheellisiä tai vanhentuneita lakiviittauksia
- Eivät huomioi tapauskohtaisia erityispiirteitä
- Eivät korvaa oikeudellista neuvontaa
- Tulee aina tarkistuttaa juristilla ennen käyttöä

Tekijät eivät vastaa työkalun käytöstä aiheutuvista vahingoista.

## Lisenssi

MIT
