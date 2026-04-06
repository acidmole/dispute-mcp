export interface DocumentSection {
  id: string;
  title: string;
  required: boolean;
  description: string;
  legalBasis?: string;
  subsections?: DocumentSection[];
}

export interface DemandOption {
  id: string;
  text: string;
  condition?: string;
}

export interface LegalDocumentTemplate {
  id: string;
  name: string;
  description: string;
  targetInstitution: string;
  legalBasis: string;
  applicableLaws: string[];
  searchQueries: string[];
  deadline?: {
    description: string;
    days?: number;
    fromEvent: string;
  };
  formalRequirements: string[];
  warnings: string[];
  sections: DocumentSection[];
  demands: DemandOption[];
  legacyType?: string;
}

export const DOCUMENT_TEMPLATES: LegalDocumentTemplate[] = [
  // 1. Käräjäoikeuden vastaus
  {
    id: "karajaoikeus_vastaus",
    name: "Vastaus käräjäoikeudelle",
    description: "Vastaajan kirjallinen vastaus riita-asiassa käräjäoikeuden haasteeseen",
    targetInstitution: "Käräjäoikeus",
    legalBasis: "Oikeudenkäymiskaari 5 luku 10 §",
    applicableLaws: ["Oikeudenkäymiskaari"],
    searchQueries: [
      "vastaajan kirjallinen vastaus riita-asia",
      "kanteen kiistäminen perusteet",
      "oikeudenkäyntikulujen korvaaminen",
    ],
    deadline: {
      description: "Vastaus annettava käräjäoikeuden asettamassa määräajassa",
      days: 14,
      fromEvent: "haasteen tiedoksisaannista",
    },
    formalRequirements: [
      "Allekirjoitettava vastaajan tai laatijan toimesta",
      "Laatijan ammatti ja asuinpaikka ilmoitettava",
      "Asiakirjaliitteet lueteltava",
    ],
    warnings: [
      "Vastaamatta jättäminen voi johtaa yksipuoliseen tuomioon (OK 5:13), joka on välittömästi täytäntöönpanokelpoinen",
      "Yksipuoliseen tuomioon voi hakea takaisinsaantia 30 päivän kuluessa",
      "Kaikki kiistämisperusteet on esitettävä vastauksessa - myöhemmin esitettyjä perusteita ei välttämättä oteta huomioon",
    ],
    sections: [
      {
        id: "tunnistetiedot",
        title: "Tunnistetiedot",
        required: true,
        description: "Asian diaarinumero haasteesta, vastaajan nimi ja yhteystiedot, kantajan nimi",
      },
      {
        id: "kanta",
        title: "Kanta kanteeseen",
        required: true,
        description: "Selkeä ilmoitus: myöntääkö vai kiistääkö vastaaja kanteen. Jos kiistää osittain, eriteltävä mitkä kohdat myönnetään ja mitkä kiistetään.",
        legalBasis: "OK 5:10 kohta 1",
      },
      {
        id: "kiistamisperusteet",
        title: "Kiistämisen perusteet",
        required: true,
        description: "Oikeustosiseikat (mitä on tapahtunut vastaajan näkökulmasta) ja oikeudelliset perusteet (miksi kanne on perusteeton). Jokainen kanteen väite on käsiteltävä erikseen.",
        legalBasis: "OK 5:10 kohta 2",
      },
      {
        id: "todisteet",
        title: "Todisteet",
        required: true,
        description: "Luettelo todisteista: kustakin todisteesta 1) mikä todiste on (asiakirja, henkilö), 2) todistusteema eli mitä sillä näytetään toteen.",
        legalBasis: "OK 5:10 kohta 3",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Viittaukset sovellettaviin lainkohtiin, KKO:n ennakkopäätöksiin ja hallituksen esityksiin",
      },
      {
        id: "oikeudenkayntikulut",
        title: "Oikeudenkäyntikuluvaatimus",
        required: true,
        description: "Vaatimus kantajan velvoittamisesta korvaamaan oikeudenkäyntikulut. Eriteltävä vaadittava summa tai varattava oikeus esittää kuluvaatimus myöhemmin.",
        legalBasis: "OK 21 luku",
      },
      {
        id: "prosessivaitteet",
        title: "Prosessiväitteet",
        required: false,
        description: "Väitteet tuomioistuimen toimivallasta, kanteen vanhentumisesta tai muista prosessuaalisista esteistä. Esitettävä ennen pääasiaan vastaamista.",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus ja nimenselvennys",
      },
      {
        id: "liitteet",
        title: "Liiteluettelo",
        required: true,
        description: "Luettelo kaikista vastauksen liitteenä olevista asiakirjoista",
      },
    ],
    demands: [
      { id: "hylkaa", text: "Vaadin, että kanne hylätään kokonaisuudessaan." },
      { id: "hylkaa_osittain", text: "Vaadin, että kanne hylätään seuraavilta osin: [eriteltävä].", condition: "Kun kanne kiistetään osittain" },
      { id: "kulut", text: "Vaadin, että kantaja velvoitetaan korvaamaan oikeudenkäyntikuluni viivästyskorkoineen." },
      { id: "kirjallinen", text: "Pyydän, että asia ratkaistaan kirjallisessa menettelyssä ilman suullista käsittelyä.", condition: "Kun asia on yksinkertainen" },
    ],
    legacyType: "court_response",
  },

  // 2. Reklamaatio
  {
    id: "reklamaatio",
    name: "Reklamaatio",
    description: "Virheilmoitus ja vaatimus myyjälle tai palveluntarjoajalle tavaran tai palvelun virheestä",
    targetInstitution: "Myyjä / palveluntarjoaja",
    legalBasis: "Kuluttajansuojalaki 5 luku 16 §",
    applicableLaws: ["Kuluttajansuojalaki", "Kauppalaki (irtain omaisuus)"],
    searchQueries: [
      "tavaran virhe kuluttajansuoja",
      "reklamaatioaika kohtuullinen aika",
      "virheen oikaisu hinnanalennus kaupan purku",
      "myyjän vastuu virheestä",
    ],
    deadline: {
      description: "Reklamaatio tehtävä kohtuullisessa ajassa virheen havaitsemisesta",
      fromEvent: "virheen havaitsemisesta",
    },
    formalRequirements: [
      "Tehtävä kirjallisesti tai muulla pysyvällä tavalla",
      "Virheen kuvaus riittävän tarkasti",
      "Vaatimukset eriteltävä selkeästi",
    ],
    warnings: [
      "Reklamaatio-oikeus voidaan menettää jos ilmoitusta ei tehdä kohtuullisessa ajassa",
      "Kohtuullinen aika on yleensä muutama kuukausi virheen havaitsemisesta",
      "Oikaisukeinot ovat portaittaiset: korjaus → vaihto → hinnanalennus → kaupan purku",
    ],
    sections: [
      {
        id: "osapuolet",
        title: "Osapuolet",
        required: true,
        description: "Ostajan/tilaajan nimi ja yhteystiedot, myyjän/palveluntarjoajan nimi ja yhteystiedot",
      },
      {
        id: "kohde",
        title: "Kaupan/palvelun kohde",
        required: true,
        description: "Tuote tai palvelu, hankintapäivämäärä, hinta, tilaus-/kuittinumero",
      },
      {
        id: "virheen_kuvaus",
        title: "Virheen kuvaus",
        required: true,
        description: "Tarkka kuvaus virheestä: mitä vikaa on, milloin virhe havaittiin, miten se ilmenee. Kuvaile ero sovitun ja toteutuneen laadun välillä.",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Mitä vaaditaan: ensisijaisesti virheen korjaus tai vaihto, toissijaisesti hinnanalennus, viimesijaisesti kaupan purku. Euromäärä jos relevantti.",
        legalBasis: "KSL 5:18-19",
      },
      {
        id: "maaraaika",
        title: "Määräaika vastaukselle",
        required: true,
        description: "Kohtuullinen vastausaika, tyypillisesti 14 päivää",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Viittaukset kuluttajansuojalakiin ja relevanttiin oikeuskäytäntöön",
      },
      {
        id: "liitteet",
        title: "Liitteet",
        required: false,
        description: "Kuitti, valokuvat virheestä, asiantuntijalausunto, aiempi kirjeenvaihto",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "korjaus", text: "Vaadin ensisijaisesti virheen korjaamista." },
      { id: "vaihto", text: "Vaadin tuotteen vaihtamista virheettömään.", condition: "Kun korjaus ei ole mahdollinen" },
      { id: "hinnanalennus", text: "Vaadin hinnanalennusta virhettä vastaavasti.", condition: "Kun korjaus tai vaihto ei onnistu" },
      { id: "purku", text: "Vaadin kaupan purkua ja kauppahinnan palauttamista.", condition: "Kun virhe on olennainen" },
      { id: "vahingonkorvaus", text: "Vaadin korvausta virheestä aiheutuneesta vahingosta.", condition: "Kun virheestä on aiheutunut lisävahinkoa" },
    ],
    legacyType: "complaint",
  },

  // 3. KRIL-hakemus
  {
    id: "kril_hakemus",
    name: "Hakemus kuluttajariitalautakunnalle",
    description: "Ratkaisupyyntö kuluttajariitalautakunnalle kuluttajan ja yrityksen välisessä riita-asiassa",
    targetInstitution: "Kuluttajariitalautakunta",
    legalBasis: "Laki kuluttajariitalautakunnasta (8/2007)",
    applicableLaws: ["Kuluttajansuojalaki", "Laki kuluttajariitalautakunnasta"],
    searchQueries: [
      "kuluttajariitalautakunta hakemus",
      "kuluttajansuoja virhevastuu",
    ],
    formalRequirements: [
      "Reklamaatio yritykselle on tehtävä ennen hakemusta",
      "Vaatimukset numeroitava - KRIL ei voi suositella enempää kuin on vaadittu",
      "Liitteet PDF-muodossa",
    ],
    warnings: [
      "KRIL:n päätös on suositus, ei sitova tuomio",
      "Käsittelyaika 6-14 kuukautta",
      "KRIL ei käsittele asiaa joka on vireillä tuomioistuimessa",
    ],
    sections: [
      {
        id: "hakija",
        title: "Hakijan tiedot",
        required: true,
        description: "Kuluttajan nimi, osoite, puhelinnumero, sähköposti",
      },
      {
        id: "vastapuoli",
        title: "Yrityksen tiedot",
        required: true,
        description: "Yrityksen nimi, Y-tunnus, osoite",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset numeroidusti",
        required: true,
        description: "Jokainen vaatimus omana numerointina. Tarkka euromäärä jos rahallinen vaatimus. KRIL ei voi suositella enempää kuin on vaadittu.",
      },
      {
        id: "asian_kuvaus",
        title: "Asian kuvaus",
        required: true,
        description: "Tapahtumat aikajärjestyksessä: milloin ostettu, milloin virhe havaittu, miten reklamoitu, mitä yritys vastannut",
      },
      {
        id: "yrityksen_vastaus",
        title: "Yrityksen vastaus reklamaatioon",
        required: true,
        description: "Mitä yritys on vastannut reklamaatioon tai onko jättänyt vastaamatta",
      },
      {
        id: "lainkohdat",
        title: "Sovellettavat lainkohdat",
        required: false,
        description: "Viittaukset kuluttajansuojalakiin tai muuhun sovellettavaan lakiin",
      },
      {
        id: "liitteet",
        title: "Liitteet",
        required: true,
        description: "Kauppasopimus, kuitti, reklamaatio ja yrityksen vastaus, valokuvat, asiantuntijalausunnot (PDF-muodossa)",
      },
    ],
    demands: [
      { id: "hinnanalennus", text: "Vaadin hinnanalennusta [summa] euroa." },
      { id: "purku", text: "Vaadin kaupan purkua ja kauppahinnan [summa] euron palauttamista." },
      { id: "korjaus", text: "Vaadin virheen korjaamista myyjän kustannuksella." },
      { id: "vahingonkorvaus", text: "Vaadin vahingonkorvausta [summa] euroa.", condition: "Kun virheestä on aiheutunut lisävahinkoa" },
    ],
  },

  // 4. Laskun kiistäminen
  {
    id: "laskun_kiistaminen",
    name: "Laskun kiistäminen",
    description: "Perusteettoman tai virheellisen laskun kiistäminen",
    targetInstitution: "Laskuttaja",
    legalBasis: "Laki saatavien perinnästä 4c §",
    applicableLaws: ["Laki saatavien perinnästä", "Kuluttajansuojalaki"],
    searchQueries: [
      "laskun kiistäminen perusteeton saatava",
      "perintälaki kuluttajan oikeudet",
      "saatavan vanhentuminen",
    ],
    formalRequirements: [
      "Kiistäminen tehtävä kirjallisesti",
      "Kiistämisperuste mainittava selkeästi",
    ],
    warnings: [
      "Pelkkä maksuhaluttomuus ei ole pätevä kiistämisperuste",
      "Kiistämisen jälkeen vapaaehtoinen perintä lakkaa ja asia voi siirtyä oikeudelliseen perintään",
    ],
    sections: [
      {
        id: "laskun_tiedot",
        title: "Laskun tunnistetiedot",
        required: true,
        description: "Laskunumero, päivämäärä, summa, laskuttaja, viitenumero",
      },
      {
        id: "kiistamisperuste",
        title: "Kiistämisperuste",
        required: true,
        description: "Miksi lasku kiistetään: tuotetta/palvelua ei toimitettu, sopimusta ei syntynyt, lasku on virheellinen, saatava vanhentunut, muu syy",
      },
      {
        id: "tosiseikat",
        title: "Tosiseikat",
        required: true,
        description: "Mitä on tapahtunut: aikajärjestyksessä kerrottuna",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Laskun peruuttaminen, perinnän lopettaminen, mahdollinen palautusvaatimus",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Viittaukset perintälakiin ja kuluttajansuojalakiin",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "peruuta", text: "Vaadin, että lasku peruutetaan kokonaisuudessaan." },
      { id: "palautus", text: "Mikäli lasku on jo maksettu, vaadin palautusta viivästyskorkoineen.", condition: "Kun lasku on maksettu" },
      { id: "ei_perintaan", text: "Vaadin, ettei asiaa siirretä perintään tai ettei perintätoimia jatketa." },
    ],
    legacyType: "invoice_denial",
  },

  // 5. Perinnän kiistäminen
  {
    id: "perinnan_kiistaminen",
    name: "Perinnän kiistäminen",
    description: "Perintätoimiston saatavan kiistäminen ja perinnän keskeyttämisvaatimus",
    targetInstitution: "Perintätoimisto",
    legalBasis: "Laki saatavien perinnästä 4b-4c §",
    applicableLaws: ["Laki saatavien perinnästä", "Vanhentumislaki (saatavan vanhentuminen)"],
    searchQueries: [
      "saatavan kiistäminen perintätoimisto",
      "perintälaki vapaaehtoinen perintä oikeudellinen perintä",
      "perintäkulut kohtuullisuus",
      "saatavan vanhentuminen",
    ],
    formalRequirements: [
      "Kiistäminen tehtävä kirjallisesti tai muulla pysyvällä tavalla",
      "Kiistämisperuste oltava asiallinen (ei pelkkä maksukyvyttömyys)",
    ],
    warnings: [
      "Pelkkä maksukyvyttömyys ei ole kiistämisperuste - saatavan perusteeseen tai määrään on vedottava",
      "Kiistämisen jälkeen perintätoimisto voi siirtää asian oikeudelliseen perintään",
      "Perintätoimisto voi olla vahingonkorvausvelvollinen perusteettomasta perinnästä (perintälaki 15 §)",
    ],
    sections: [
      {
        id: "saatavan_tiedot",
        title: "Saatavan tunnistetiedot",
        required: true,
        description: "Perintätoimiston viite, alkuperäinen velkoja, saatavan määrä, perintäkulut",
      },
      {
        id: "kiistamisperuste",
        title: "Kiistämisperuste",
        required: true,
        description: "Saatavan perusteen tai määrän kiistäminen: virheellinen, perusteeton, vanhentunut, sopimusta ei ole, suoritus on tehty",
        legalBasis: "Perintälaki 4c §",
      },
      {
        id: "keskeytyspyynto",
        title: "Vaatimus perinnän keskeyttämisestä",
        required: true,
        description: "Vaatimus vapaaehtoisen perinnän lopettamisesta ja asian siirtämisestä oikeudelliseen perintään jos velkoja haluaa jatkaa",
        legalBasis: "Perintälaki 4c §",
      },
      {
        id: "perintakulut",
        title: "Perintäkulujen kiistäminen",
        required: false,
        description: "Jos perintäkulut ovat kohtuuttomat tai perintä on ollut perusteetonta, vaatimus perintäkulujen poistamisesta",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Viittaukset perintälakiin, vanhentumislakiin ja kuluttajansuojalakiin",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "keskeyta", text: "Vaadin vapaaehtoisen perinnän välitöntä lopettamista." },
      { id: "kiista", text: "Kiistän saatavan perusteen ja/tai määrän edellä esitetyin perustein." },
      { id: "oikeudellinen", text: "Mikäli velkoja katsoo saatavan olevan oikeutettu, pyydän asian siirtämistä tuomioistuimen ratkaistavaksi." },
      { id: "kulut", text: "Vaadin perintäkulujen poistamista kokonaisuudessaan.", condition: "Kun perintä on ollut perusteetonta" },
    ],
    legacyType: "objection",
  },

  // 6. Hallintovalitus
  {
    id: "hallinto_valitus",
    name: "Valitus hallinto-oikeuteen",
    description: "Valitus viranomaisen päätöksestä hallinto-oikeuteen",
    targetInstitution: "Hallinto-oikeus",
    legalBasis: "Laki oikeudenkäynnistä hallintoasioissa 8 §",
    applicableLaws: ["Perustuslaki"],
    searchQueries: [
      "hallintovalitus muutoksenhaku",
      "hallintopäätöksen lainvastaisuus",
      "viranomaisen harkintavallan käyttö",
    ],
    deadline: {
      description: "Valitusaika on 30 päivää eikä sitä voi jatkaa",
      days: 30,
      fromEvent: "päätöksen tiedoksisaannista",
    },
    formalRequirements: [
      "Valitus toimitettava hallinto-oikeudelle määräajassa",
      "Valituksenalainen päätös liitettävä",
      "Tiedoksisaantitodistus liitettävä",
      "Allekirjoitettava",
    ],
    warnings: [
      "Valitusaika 30 päivää on ehdoton - myöhässä saapunut valitus jätetään tutkimatta",
      "Tiedoksisaantipäivää ei lasketa valitusaikaan",
      "Valitus korkeimpaan hallinto-oikeuteen vaatii valitusluvan",
    ],
    sections: [
      {
        id: "valittaja",
        title: "Valittajan tiedot",
        required: true,
        description: "Nimi, osoite, sähköposti, puhelinnumero",
      },
      {
        id: "prosessiosoite",
        title: "Prosessiosoite",
        required: true,
        description: "Osoite johon asian käsittelyyn liittyvät asiakirjat lähetetään (postiosoite tai sähköposti)",
        legalBasis: "Hallintoprosessilaki 8 § kohta 5",
      },
      {
        id: "valituksen_kohde",
        title: "Valituksen kohde",
        required: true,
        description: "Mikä päätös on valituksen kohteena: viranomainen, päätöksen päivämäärä ja numero",
        legalBasis: "Hallintoprosessilaki 8 § kohta 3",
      },
      {
        id: "muutosvaatimukset",
        title: "Muutosvaatimukset",
        required: true,
        description: "Mitä kohtia päätöksestä valitetaan ja miten päätöstä vaaditaan muutettavaksi",
        legalBasis: "Hallintoprosessilaki 8 § kohta 4",
      },
      {
        id: "perusteet",
        title: "Valituksen perusteet",
        required: true,
        description: "Miksi päätös on lainvastainen tai virheellinen: mitkä lainkohdat, mitkä menettelyvirheet, mitkä tosiseikat",
      },
      {
        id: "todisteet",
        title: "Todisteet",
        required: false,
        description: "Luettelo todisteista ja todistajista",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Päivämäärä ja allekirjoitus",
        legalBasis: "Hallintoprosessilaki 8 § kohta 6",
      },
      {
        id: "liitteet",
        title: "Liitteet",
        required: true,
        description: "Valituksenalainen päätös (alkuperäinen tai kopio) ja tiedoksisaantitodistus",
      },
    ],
    demands: [
      { id: "kumoa", text: "Vaadin, että valituksenalainen päätös kumotaan." },
      { id: "muuta", text: "Vaadin, että päätöstä muutetaan siten, että [eriteltävä]." },
      { id: "palauta", text: "Vaadin, että asia palautetaan viranomaiselle uudelleen käsiteltäväksi." },
      { id: "taytantoonpano", text: "Vaadin, että päätöksen täytäntöönpano kielletään valituksen käsittelyn ajaksi.", condition: "Kun päätös aiheuttaa välitöntä haittaa" },
    ],
  },

  // 7. Vakuutusoikaisu
  {
    id: "vakuutus_oikaisu",
    name: "Oikaisupyyntö vakuutusyhtiölle",
    description: "Vakuutusyhtiön kielteisen tai puutteellisen korvauspäätöksen oikaisupyyntö",
    targetInstitution: "Vakuutusyhtiö",
    legalBasis: "Vakuutussopimuslaki (543/1994)",
    applicableLaws: ["Kuluttajansuojalaki"],
    searchQueries: [
      "vakuutuskorvaus kielteinen päätös oikaisu",
      "vakuutussopimuslaki korvausvelvollisuus",
      "vakuutusehtojen tulkinta",
    ],
    deadline: {
      description: "Oikaisupyyntö tehtävä 3 vuoden kuluessa päätöksestä",
      fromEvent: "kirjallisen korvauspäätöksen vastaanottamisesta",
    },
    formalRequirements: [
      "Vapaamuotoinen kirjallinen pyyntö",
      "Alkuperäinen korvauspäätös yksilöitävä",
    ],
    warnings: [
      "Vakuutusyhtiön sisäinen oikaisu on ensimmäinen askel",
      "Seuraava instanssi on FINE (Vakuutus- ja rahoitusneuvonta) ja Vakuutuslautakunta",
      "Vakuutuslautakunnan päätös on suositus, ei sitova",
    ],
    sections: [
      {
        id: "paatos",
        title: "Korvauspäätöksen tunnistetiedot",
        required: true,
        description: "Vakuutusyhtiö, vahinkonumero, päätöksen päivämäärä, vakuutusnumero",
      },
      {
        id: "kiistaminen",
        title: "Päätöksen kiistäminen",
        required: true,
        description: "Miksi päätös on virheellinen: vakuutusehtojen tulkinta, tosiseikkojen arviointi, korvausmäärä",
      },
      {
        id: "uusi_selvitys",
        title: "Uusi selvitys",
        required: false,
        description: "Uudet todisteet tai tiedot jotka eivät olleet käytettävissä alkuperäisessä päätöksessä",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Tarkka korvaussumma tai muu vaatimus",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Viittaukset vakuutussopimuslakiin, vakuutusehtoihin, Vakuutuslautakunnan ratkaisukäytäntöön",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "korvaus", text: "Vaadin vakuutuskorvausta [summa] euroa." },
      { id: "uudelleenkasittely", text: "Vaadin päätöksen uudelleenkäsittelyä." },
      { id: "lisakorvaus", text: "Vaadin lisäkorvausta [summa] euroa alkuperäisen päätöksen lisäksi.", condition: "Kun korvaus on osittain myönnetty" },
    ],
  },

  // 8. Vuokrareklamaatio
  {
    id: "vuokra_reklamaatio",
    name: "Vuokrariita-ilmoitus",
    description: "Reklamaatio tai vaatimus vuokrasuhteessa vuokranantajalle tai vuokralaiselle",
    targetInstitution: "Vuokranantaja / vuokralainen",
    legalBasis: "Laki asuinhuoneiston vuokrauksesta (481/1995)",
    applicableLaws: ["Laki asuinhuoneiston vuokrauksesta"],
    searchQueries: [
      "asuinhuoneiston vuokra virhe kunto",
      "vuokranantajan korjausvelvollisuus",
      "vuokravakuuden palauttaminen",
      "vuokran alennus huoneiston puutteet",
    ],
    formalRequirements: [
      "Kirjallinen ilmoitus",
      "Todistettavasti toimitettu: kuittaus, todistaja, kirjattu kirje tai ulosottomies",
    ],
    warnings: [
      "Vahingosta tai puutteesta on ilmoitettava viipymättä",
      "Vuokralainen voi olla korvausvelvollinen jos ilmoitus viivästyy ja vahinko pahenee",
      "Vuokrasopimuksen irtisanomisella on omat muotovaatimuksensa",
    ],
    sections: [
      {
        id: "osapuolet",
        title: "Osapuolet",
        required: true,
        description: "Vuokranantajan ja vuokralaisen nimet ja yhteystiedot",
      },
      {
        id: "vuokrakohde",
        title: "Vuokrakohde",
        required: true,
        description: "Osoite, huoneiston numero, vuokrasopimuksen päivämäärä",
      },
      {
        id: "riidan_kohde",
        title: "Riidan kohde",
        required: true,
        description: "Kuvaus ongelmasta: asunnon kunto, vuokranmaksu, vakuus, korjaukset, muu riita",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Korjausvaatimus, vuokran alennus, vakuuden palautus, vahingonkorvaus",
      },
      {
        id: "perusteet",
        title: "Perusteet ja tosiseikat",
        required: true,
        description: "Aikajärjestyksessä: milloin ongelma havaittu, miten ilmoitettu, mitä vastapuoli vastannut",
      },
      {
        id: "todisteet",
        title: "Todisteet",
        required: false,
        description: "Valokuvat, tarkastuspöytäkirjat, kirjeenvaihto, muuttotarkastuksen dokumentit",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "korjaus", text: "Vaadin puutteen korjaamista [määräaika] kuluessa." },
      { id: "vuokranalennus", text: "Vaadin vuokran alennusta [summa] euroa/kk puutteen ajalta." },
      { id: "vakuus", text: "Vaadin vuokravakuuden [summa] euron palauttamista.", condition: "Vuokrasuhteen päättyessä" },
      { id: "vahingonkorvaus", text: "Vaadin vahingonkorvausta [summa] euroa." },
    ],
  },

  // 9. Vahingonkorvausvaatimus
  {
    id: "vahingonkorvaus",
    name: "Vahingonkorvausvaatimus",
    description: "Vaatimus vahingonkorvauksesta aiheutuneesta henkilö- tai esinevahingosta",
    targetInstitution: "Vahingonaiheuttaja",
    legalBasis: "Vahingonkorvauslaki (412/1974)",
    applicableLaws: ["Vahingonkorvauslaki", "Korkolaki"],
    searchQueries: [
      "vahingonkorvaus tuottamus syy-yhteys",
      "vahingonkorvauksen määrä henkilövahinko esinevahinko",
      "korvattava vahinko laajuus",
    ],
    formalRequirements: [
      "Vaatimus kirjallisesti",
      "Vahinko eriteltävä ja perusteltava",
      "Vaatimuksen euromäärä ilmoitettava",
    ],
    warnings: [
      "Vahingonkorvausvaatimus vanhenee 3 vuodessa vahingon ilmenemisestä",
      "Kantajan on näytettävä toteen vahinko, tuottamus ja syy-yhteys",
    ],
    sections: [
      {
        id: "osapuolet",
        title: "Osapuolet",
        required: true,
        description: "Vahinkoa kärsineen ja vahingonaiheuttajan tiedot",
      },
      {
        id: "tapahtumakuvaus",
        title: "Tapahtumakuvaus",
        required: true,
        description: "Mitä tapahtui, milloin, missä, kenen toimesta",
      },
      {
        id: "vahinko",
        title: "Vahingon kuvaus",
        required: true,
        description: "Mikä vahinko aiheutui: henkilövahinko, esinevahinko, taloudellinen vahinko. Yksityiskohtaisesti eriteltynä.",
      },
      {
        id: "syy_yhteys",
        title: "Syy-yhteys",
        required: true,
        description: "Miten vahingonaiheuttajan toiminta aiheutti vahingon",
        legalBasis: "VahL 2:1",
      },
      {
        id: "korvausvaatimus",
        title: "Korvausvaatimus eriteltynä",
        required: true,
        description: "Erittely vaadittavista korvauksista euromääräisesti: hoitokulut, ansionmenetys, kipu ja särky, esinevahingot, muut kulut",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Viittaukset vahingonkorvauslakiin, korkolakiin ja relevanttiin oikeuskäytäntöön",
      },
      {
        id: "todisteet",
        title: "Todisteet",
        required: true,
        description: "Lääkärintodistukset, kuitit, valokuvat, silminnäkijät, asiantuntijalausunnot",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "korvaus", text: "Vaadin vahingonkorvausta yhteensä [summa] euroa viivästyskorkoineen." },
      { id: "hoitokulut", text: "Hoitokulut: [summa] euroa.", condition: "Henkilövahinko" },
      { id: "ansionmenetys", text: "Ansionmenetys: [summa] euroa.", condition: "Työkyvyttömyys" },
      { id: "kipu", text: "Kipu ja särky: [summa] euroa.", condition: "Henkilövahinko" },
      { id: "esinevahinko", text: "Esinevahinko: [summa] euroa.", condition: "Esinevahinko" },
    ],
    legacyType: "claim",
  },

  // 10. Takaisinsaantihakemus
  {
    id: "takaisinsaanti",
    name: "Takaisinsaantihakemus",
    description: "Hakemus yksipuolisen tuomion kumoamiseksi käräjäoikeudessa",
    targetInstitution: "Käräjäoikeus",
    legalBasis: "Oikeudenkäymiskaari 12 luku 15 §",
    applicableLaws: ["Oikeudenkäymiskaari"],
    searchQueries: [
      "takaisinsaanti yksipuolinen tuomio",
      "yksipuolisen tuomion kumoaminen",
      "takaisinsaannin määräaika",
    ],
    deadline: {
      description: "Takaisinsaantia haettava 30 päivän kuluessa",
      days: 30,
      fromEvent: "yksipuolisen tuomion tiedoksisaannista",
    },
    formalRequirements: [
      "Hakemus tehtävä yksipuolisen tuomion antaneelle käräjäoikeudelle",
      "Määräaika ehdoton - myöhästynyttä hakemusta ei tutkita",
    ],
    warnings: [
      "Yksipuolinen tuomio on välittömästi täytäntöönpanokelpoinen - ulosotto voi alkaa ennen takaisinsaantia",
      "Takaisinsaannin hakeminen ei automaattisesti keskeytä täytäntöönpanoa",
      "Jos takaisinsaantia ei haeta 30 päivässä, tuomio jää lainvoimaiseksi",
    ],
    sections: [
      {
        id: "tunnistetiedot",
        title: "Asian tunnistetiedot",
        required: true,
        description: "Käräjäoikeuden nimi, yksipuolisen tuomion päivämäärä ja diaarinumero",
      },
      {
        id: "tiedoksisaanti",
        title: "Tiedoksisaantipäivä",
        required: true,
        description: "Päivämäärä jolloin yksipuolinen tuomio saatiin tiedoksi",
      },
      {
        id: "syy_vastaamatta",
        title: "Syy vastaamatta jättämiselle",
        required: true,
        description: "Miksi alkuperäiseen haasteeseen ei vastattu: haaste ei tavoittanut, laillinen este, muu pätevä syy",
      },
      {
        id: "kanta_kanteeseen",
        title: "Kanta alkuperäiseen kanteeseen",
        required: true,
        description: "Samat vaatimukset kuin käräjäoikeuden vastauksessa: myöntäminen/kiistäminen, perusteet, todisteet",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Yksipuolisen tuomion kumoaminen ja kanteen hylkääminen",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Paikka, päivämäärä, allekirjoitus",
      },
    ],
    demands: [
      { id: "kumoa", text: "Vaadin, että yksipuolinen tuomio kumotaan." },
      { id: "hylkaa", text: "Vaadin, että alkuperäinen kanne hylätään." },
      { id: "keskeyta", text: "Vaadin, että tuomion täytäntöönpano keskeytetään takaisinsaantiasian käsittelyn ajaksi." },
    ],
  },

  // --- Elatusapu (child support) templates ---

  {
    id: "elatusapu_sopimus",
    name: "Elatussopimus",
    description: "Vanhempien sopimus lapsen elatusavusta lastenvalvojan vahvistettavaksi",
    targetInstitution: "Lastenvalvoja / hyvinvointialue",
    legalBasis: "Laki lapsen elatuksesta (704/1975) 7 §",
    applicableLaws: [
      "Laki lapsen elatuksesta",
      "Avioliittolaki",
      "Laki lapsen huollosta ja tapaamisoikeudesta",
    ],
    searchQueries: [
      "elatusapu sopimus lastenvalvoja vahvistus",
      "lapsen elatuksen tarve laskeminen",
      "elatuskyky vanhemmat tulot menot",
      "OM 2007 elatusapuohje",
    ],
    formalRequirements: [
      "Sopimus on tehtävä kirjallisesti",
      "Lastenvalvojan on vahvistettava sopimus, jotta se on täytäntöönpanokelpoinen",
      "Sopimuksessa on mainittava lapsen nimi, syntymäaika ja elatusavun määrä",
      "Elatusavun laskenta OM 2007:2 ohjeen mukaisesti",
    ],
    warnings: [
      "Sopimus ei ole täytäntöönpanokelpoinen ilman lastenvalvojan vahvistusta",
      "Lastenvalvoja tarkistaa, että sopimus on lapsen edun mukainen",
      "Elatusapu on lapsen oikeus, ei vanhemman — siitä ei voi luopua lapsen puolesta",
      "Suositellaan tapaamista lastenvalvojan kanssa ennen sopimuksen laatimista",
    ],
    sections: [
      {
        id: "lapsen_tiedot",
        title: "Lapsen tiedot",
        required: true,
        description: "Lapsen nimi, syntymäaika, henkilötunnus ja ikäryhmä elatusavun laskentaa varten",
      },
      {
        id: "osapuolet",
        title: "Vanhempien tiedot",
        required: true,
        description: "Molempien vanhempien nimet, henkilötunnukset ja yhteystiedot",
      },
      {
        id: "lapsen_kulut",
        title: "Lapsen elatuksen tarve",
        required: true,
        description: "Lapsen peruskulutus ikäryhmän mukaan (OM 2007:2 ohje) sekä erityiskustannukset",
        legalBasis: "Laki lapsen elatuksesta 1-2 §",
      },
      {
        id: "asumiskustannukset",
        title: "Asumiskustannukset",
        required: true,
        description: "Lähivanhemman asumiskustannukset ja lapsen osuus OM 2007:2 prosenttitaulukon mukaan",
      },
      {
        id: "elatuskyky",
        title: "Vanhempien elatuskyky",
        required: true,
        description: "Kummankin vanhemman tulot, vähennyskelpoiset menot ja elatuskyky",
        legalBasis: "Laki lapsen elatuksesta 2 §",
      },
      {
        id: "vuoroasuminen",
        title: "Vuoroasuminen",
        required: false,
        description: "Jos lapsi asuu vuorotellen molempien vanhempien luona (≥ 40 % ajasta), alennetut asumisprosentit ja luonapitovähennys",
      },
      {
        id: "luonapitovahennys",
        title: "Luonapitovähennys",
        required: false,
        description: "Vähennys elatusavusta etävanhemman luona vietettyjen öiden perusteella",
      },
      {
        id: "elatusapulaskelma",
        title: "Elatusapulaskelma",
        required: true,
        description: "Yhteenveto elatusavun laskennasta: lapsen tarve, vanhempien elatuskyvyn suhde ja elatusavun määrä",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitukset",
        required: true,
        description: "Molempien vanhempien allekirjoitukset ja päivämäärä",
      },
    ],
    demands: [
      { id: "elatusapu_maara", text: "Elatusvelvollinen maksaa elatusapua [summa] euroa kuukaudessa." },
      { id: "indeksikorotus", text: "Elatusapu tarkistetaan vuosittain elinkustannusindeksin mukaisesti." },
      { id: "erityiskulut", text: "Erityiskustannukset (esim. hammashoito, harrastukset) jaetaan vanhempien elatuskyvyn suhteessa." },
    ],
  },

  {
    id: "elatusapu_hakemus",
    name: "Elatusapuhakemus käräjäoikeudelle",
    description: "Hakemus käräjäoikeudelle elatusavun vahvistamiseksi kun vanhemmat eivät pääse sopimukseen",
    targetInstitution: "Käräjäoikeus",
    legalBasis: "Laki lapsen elatuksesta (704/1975) 8-11 §",
    applicableLaws: [
      "Laki lapsen elatuksesta",
      "Oikeudenkäymiskaari",
    ],
    searchQueries: [
      "elatusapu käräjäoikeus hakemus vahvistaminen",
      "lapsen elatus tuomioistuin",
      "elatusavun määrä oikeuskäytäntö",
      "elatuskyky tulot menot oikeus",
    ],
    formalRequirements: [
      "Hakemus on tehtävä kirjallisesti ja toimitettava käräjäoikeudelle",
      "Hakemuksessa on yksilöitävä vaatimukset ja niiden perusteet",
      "Elatusavun laskentaperusteet on esitettävä OM 2007:2 ohjeen mukaisesti",
      "Tulotiedot ja tositteet on liitettävä hakemukseen",
    ],
    warnings: [
      "Oikeudenkäynti on viimesijainen keino — yritä ensin sopia lastenvalvojan avustuksella",
      "Oikeudenkäyntikulut voivat olla merkittävät",
      "Tuomioistuin ei ole sidottu OM:n ohjeeseen, mutta käyttää sitä arvioinnin lähtökohtana",
      "Elatusapu voidaan vahvistaa takautuvasti kanteen vireillepanosta lukien",
    ],
    sections: [
      {
        id: "hakija",
        title: "Hakijan tiedot",
        required: true,
        description: "Hakijan nimi, henkilötunnus ja yhteystiedot",
      },
      {
        id: "lapsen_tiedot",
        title: "Lapsen tiedot",
        required: true,
        description: "Lapsen nimi, syntymäaika, henkilötunnus ja ikäryhmä",
      },
      {
        id: "vastapuoli",
        title: "Vastapuolen tiedot",
        required: true,
        description: "Elatusvelvollisen nimi, henkilötunnus ja yhteystiedot",
      },
      {
        id: "lapsen_kulut",
        title: "Lapsen elatuksen tarve",
        required: true,
        description: "Lapsen peruskulutus ja erityiskustannukset OM 2007:2 ohjeen mukaan",
        legalBasis: "Laki lapsen elatuksesta 1-2 §",
      },
      {
        id: "asumiskustannukset",
        title: "Asumiskustannukset",
        required: true,
        description: "Lapsen osuus asumiskustannuksista",
      },
      {
        id: "elatuskyky",
        title: "Vanhempien elatuskyky",
        required: true,
        description: "Kummankin vanhemman tulot, menot ja elatuskyky",
        legalBasis: "Laki lapsen elatuksesta 2 §",
      },
      {
        id: "vuoroasuminen",
        title: "Vuoroasuminen",
        required: false,
        description: "Vuoroasumisjärjestely ja sen vaikutus elatusapuun",
      },
      {
        id: "elatusapulaskelma",
        title: "Elatusapulaskelma",
        required: true,
        description: "Yhteenveto elatusavun laskennasta ja vaadittu elatusavun määrä",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Elatusavun vahvistamista koskevat vaatimukset",
      },
      {
        id: "todisteet",
        title: "Todisteet",
        required: true,
        description: "Luettelo todisteista: tulotodistukset, verotuspäätökset, asumiskustannukset",
      },
      {
        id: "oikeuslahteet",
        title: "Oikeuslähteet",
        required: false,
        description: "Sovelletut lainkohdat ja oikeuskäytäntö",
      },
      {
        id: "oikeudenkayntikulut",
        title: "Oikeudenkäyntikulut",
        required: true,
        description: "Vaatimus vastapuolen velvoittamisesta korvaamaan oikeudenkäyntikulut",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Hakijan allekirjoitus ja päivämäärä",
      },
      {
        id: "liitteet",
        title: "Liitteet",
        required: true,
        description: "Luettelo hakemuksen liitteistä (tulotositteet, asumiskustannukset, elatusapulaskelma)",
      },
    ],
    demands: [
      { id: "vahvista", text: "Vaadin, että [vastapuoli] velvoitetaan maksamaan elatusapua [summa] euroa kuukaudessa." },
      { id: "takautuva", text: "Vaadin elatusavun vahvistamista takautuvasti kanteen vireillepanosta lukien.", condition: "Kun elatusapua ei ole aiemmin vahvistettu" },
      { id: "oikeudenkayntikulut", text: "Vaadin, että vastapuoli velvoitetaan korvaamaan oikeudenkäyntikuluni viivästyskorkoineen." },
    ],
  },

  {
    id: "elatusapu_muutos",
    name: "Elatusavun muutoshakemus",
    description: "Hakemus elatusavun muuttamiseksi olosuhteiden olennaisen muutoksen perusteella",
    targetInstitution: "Lastenvalvoja / käräjäoikeus",
    legalBasis: "Laki lapsen elatuksesta (704/1975) 11 §",
    applicableLaws: [
      "Laki lapsen elatuksesta",
    ],
    searchQueries: [
      "elatusavun muuttaminen olosuhteiden muutos",
      "elatusapu muutos 15 prosenttia kynnys",
      "elatussopimuksen muuttaminen edellytykset",
      "elatusapu muutos takautuva",
    ],
    formalRequirements: [
      "Alkuperäisen sopimuksen tai tuomion tiedot on esitettävä",
      "Olosuhteiden muutos on perusteltava ja osoitettava pysyväksi",
      "Uuden elatusavun laskelma on esitettävä ja muutoksen tulee ylittää 15 %",
      "Muutosta ei voida soveltaa takautuvasti",
    ],
    warnings: [
      "Muutoskynnys on ≥ 15 % — pienempi muutos ei yleensä riitä perusteeksi",
      "Tilapäinen muutos (esim. lyhyt sairausloma) ei oikeuta pysyvään muutokseen",
      "Muutos tulee voimaan aikaisintaan asian vireillepanosta, ei takautuvasti",
      "Yritä ensin sopia muutoksesta lastenvalvojan avustuksella",
    ],
    sections: [
      {
        id: "hakija",
        title: "Hakijan tiedot",
        required: true,
        description: "Hakijan nimi, henkilötunnus ja yhteystiedot",
      },
      {
        id: "lapsen_tiedot",
        title: "Lapsen tiedot",
        required: true,
        description: "Lapsen nimi, syntymäaika ja ikäryhmä",
      },
      {
        id: "alkuperainen_sopimus",
        title: "Alkuperäinen sopimus tai tuomio",
        required: true,
        description: "Voimassa olevan elatussopimuksen tai tuomion tiedot: päivämäärä, vahvistaja, elatusavun määrä",
        legalBasis: "Laki lapsen elatuksesta 11 §",
      },
      {
        id: "muutoksen_peruste",
        title: "Muutoksen peruste",
        required: true,
        description: "Olosuhteiden olennainen muutos ja sen pysyvyys: mitä on muuttunut, milloin ja miten se vaikuttaa elatusapuun",
        legalBasis: "Laki lapsen elatuksesta 11 §",
      },
      {
        id: "lapsen_kulut",
        title: "Lapsen nykyinen elatuksen tarve",
        required: true,
        description: "Lapsen ajantasaiset perus- ja erityiskustannukset",
      },
      {
        id: "asumiskustannukset",
        title: "Asumiskustannukset",
        required: true,
        description: "Ajantasaiset asumiskustannukset ja lapsen osuus",
      },
      {
        id: "elatuskyky",
        title: "Vanhempien nykyinen elatuskyky",
        required: true,
        description: "Kummankin vanhemman ajantasaiset tulot ja menot",
      },
      {
        id: "vuoroasuminen",
        title: "Vuoroasuminen",
        required: false,
        description: "Mahdollinen vuoroasumisjärjestely ja sen muutokset",
      },
      {
        id: "elatusapulaskelma",
        title: "Uusi elatusapulaskelma",
        required: true,
        description: "Uusi laskelma ja vertailu alkuperäiseen: muutoksen on oltava ≥ 15 %",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Vaadittu uusi elatusavun määrä ja voimaantuloajankohta",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Hakijan allekirjoitus ja päivämäärä",
      },
      {
        id: "liitteet",
        title: "Liitteet",
        required: true,
        description: "Alkuperäinen sopimus/tuomio, tulotodistukset, uusi elatusapulaskelma",
      },
    ],
    demands: [
      { id: "muuta", text: "Vaadin elatusavun muuttamista [nykyinen summa] eurosta [uusi summa] euroon kuukaudessa." },
      { id: "indeksi", text: "Vaadin elatusavun tarkistamista elinkustannusindeksin mukaisesti." },
    ],
  },

  {
    id: "elatustuki_hakemus",
    name: "Elatustukihakemus (Kela)",
    description: "Hakemus Kelalle elatustuen saamiseksi kun elatusvelvollinen ei maksa tai elatusapu on alle vähimmäismäärän",
    targetInstitution: "Kela",
    legalBasis: "Elatustukilaki (580/2008)",
    applicableLaws: [
      "Elatustukilaki",
      "Laki lapsen elatuksesta",
    ],
    searchQueries: [
      "elatustuki kela hakemus edellytykset",
      "elatustuki maksamattomuus",
      "elatustuki vähimmäismäärä 2026",
    ],
    formalRequirements: [
      "Vahvistettu elatussopimus tai tuomio on liitettävä hakemukseen",
      "Lapsen on asuttava vakituisesti Suomessa",
      "Hakemus voidaan tehdä OmaKela-palvelussa tai lomakkeella (LU 1e)",
    ],
    warnings: [
      "Kela perii maksamattomat elatusmaksut elatusvelvolliselta (takautumisoikeus)",
      "Elatustukea voidaan maksaa takautuvasti enintään 3 kuukaudelta",
      "Jos vahvistettu elatusapu on alle Kelan vähimmäismäärän, Kela maksaa erotuksen",
      "Hakemusta voi täydentää OmaKela-palvelussa",
    ],
    sections: [
      {
        id: "hakija",
        title: "Hakijan tiedot",
        required: true,
        description: "Hakijan (lähivanhemman) nimi, henkilötunnus ja yhteystiedot",
      },
      {
        id: "lapsen_tiedot",
        title: "Lapsen tiedot",
        required: true,
        description: "Lapsen nimi, syntymäaika ja henkilötunnus",
      },
      {
        id: "alkuperainen_sopimus",
        title: "Elatussopimus tai tuomio",
        required: true,
        description: "Voimassa olevan vahvistetun elatussopimuksen tai tuomion tiedot",
        legalBasis: "Elatustukilaki 6-7 §",
      },
      {
        id: "maksamattomuus",
        title: "Elatusavun maksamattomuus",
        required: true,
        description: "Elatusvelvollisen laiminlyönnin kuvaus: maksamattomat kuukaudet, summat ja mahdolliset perintätoimet",
        legalBasis: "Elatustukilaki 5 §",
      },
      {
        id: "vaatimukset",
        title: "Vaatimukset",
        required: true,
        description: "Elatustuen myöntämistä koskeva vaatimus",
      },
      {
        id: "allekirjoitus",
        title: "Allekirjoitus",
        required: true,
        description: "Hakijan allekirjoitus ja päivämäärä",
      },
      {
        id: "liitteet",
        title: "Liitteet",
        required: true,
        description: "Vahvistettu elatussopimus tai tuomio, mahdolliset perintäkirjeet",
      },
    ],
    demands: [
      { id: "myonna", text: "Haen elatustukea lapselle [lapsen nimi] elatusvelvollisen maksamattomuuden perusteella." },
      { id: "takautuva", text: "Haen elatustukea takautuvasti [kuukausien lukumäärä] kuukaudelta (enintään 3 kk).", condition: "Kun maksamattomuus on jatkunut pidempään" },
    ],
  },
];

// Map legacy dispute types to new template IDs
const LEGACY_TYPE_MAP: Record<string, string> = {};
for (const t of DOCUMENT_TEMPLATES) {
  if (t.legacyType) {
    LEGACY_TYPE_MAP[t.legacyType] = t.id;
  }
}

export function findTemplate(disputeType: string): LegalDocumentTemplate | undefined {
  return (
    DOCUMENT_TEMPLATES.find((t) => t.id === disputeType) ||
    DOCUMENT_TEMPLATES.find((t) => t.legacyType === disputeType)
  );
}

export { LEGACY_TYPE_MAP };
