import type { LegalDocumentTemplate } from "../data/document-templates.js";

export function buildDocumentPrompt(
  template: LegalDocumentTemplate,
  context: string
): string {
  const lines: string[] = [];

  lines.push(`# Tehtävä: Laadi ${template.name}`);
  lines.push("");

  // Legality and verification requirements (must come first)
  lines.push("## ⚠️ EHDOTTOMAT VAATIMUKSET");
  lines.push("");
  lines.push("**1. Lainmukaisuus.** Et saa avustaa lainvastaisissa tai rikollisissa tarkoituksissa. Älä laadi asiakirjaa, joka:");
  lines.push("- Sisältää perättömiä tai harhaanjohtavia tietoja viranomaiselle (RL 16:8)");
  lines.push("- Esittää väärennettyjä todisteita tai sepitettyjä tosiseikkoja");
  lines.push("- Vaatii perusteettomia korvauksia tai pyrkii vilpilliseen taloudelliseen hyötyyn (RL 36:1)");
  lines.push("- Pyrkii painostamaan, uhkailemaan tai kiristämään vastapuolta (RL 25:8, 31:3)");
  lines.push("- Käyttää oikeusprosessia kiusantekoon tai vastapuolen vahingoittamiseen");
  lines.push("");
  lines.push("Jos käyttäjän pyyntö vaikuttaa tällaiselta, **kieltäydy kohteliaasti** ja selitä miksi. Pyydä tarvittaessa lisätietoja arvioidaksesi tilanteen.");
  lines.push("");
  lines.push("**2. Lakiviittausten verifiointi.** ENNEN kuin kutsut `generate_dispute`-työkalua:");
  lines.push("- **Hae kaikki lakiviittaukset `search_legal`-työkalulla** vektoritietokannasta");
  lines.push("- **Älä koskaan keksi tai arvaa** lainkohtia, pykäliä, KKO/KHO-ratkaisuja tai HE-numeroita");
  lines.push("- Käytä vain hakutuloksia, joiden relevanssi (`relevanceScore`) on **vähintään 0.3**");
  lines.push("- Tarkista, että viittauksen sisältö (teksti) tukee väitettä, jota viittaat");
  lines.push("- Jos et löydä relevanttia lähdettä, **älä lisää viittausta** — kerro käyttäjälle, että lähde puuttuu");
  lines.push("- Generaattori hylkää automaattisesti viittaukset, joita ei voida varmistaa");
  lines.push("");
  lines.push("**3. Tosiseikkojen tarkistus.** Pyydä käyttäjältä vahvistus kaikista olennaisista tosiseikoista. Älä keksi päivämääriä, summia, henkilötietoja tai tapahtumia.");
  lines.push("");

  lines.push("## Asiakirjatyyppi");
  lines.push(`- **Nimi**: ${template.name}`);
  lines.push(`- **Vastaanottaja**: ${template.targetInstitution}`);
  lines.push(`- **Oikeusperusta**: ${template.legalBasis}`);
  lines.push("");

  if (context) {
    lines.push("## Käyttäjän kuvaus tilanteesta");
    lines.push(context);
    lines.push("");
  }

  // Deadline
  if (template.deadline) {
    lines.push("## MÄÄRÄAIKA");
    lines.push(`**${template.deadline.description}**`);
    if (template.deadline.days) {
      lines.push(`Aikaa: **${template.deadline.days} päivää** ${template.deadline.fromEvent}.`);
    }
    lines.push("");
  }

  // Formal requirements
  if (template.formalRequirements.length > 0) {
    lines.push("## Muodolliset vaatimukset");
    for (const req of template.formalRequirements) {
      lines.push(`- ${req}`);
    }
    lines.push("");
  }

  // Document structure
  lines.push("## Asiakirjan rakenne");
  lines.push("");
  lines.push("Asiakirjan TULEE sisältää seuraavat osiot tässä järjestyksessä:");
  lines.push("");

  for (const section of template.sections) {
    const marker = section.required ? "**[PAKOLLINEN]**" : "[valinnainen]";
    lines.push(`### ${section.title} ${marker}`);
    lines.push(section.description);
    if (section.legalBasis) {
      lines.push(`*Perusta: ${section.legalBasis}*`);
    }
    if (section.subsections) {
      for (const sub of section.subsections) {
        lines.push(`- **${sub.title}**: ${sub.description}`);
      }
    }
    lines.push("");
  }

  // Demands
  if (template.demands.length > 0) {
    lines.push("## Tyypilliset vaatimukset");
    lines.push("Valitse ja muokkaa tilanteeseen sopivat vaatimukset:");
    lines.push("");
    for (const d of template.demands) {
      const cond = d.condition ? ` *(${d.condition})*` : "";
      lines.push(`- ${d.text}${cond}`);
    }
    lines.push("");
  }

  // Search instructions
  lines.push("## Oikeuslähteiden haku");
  lines.push("Hae relevantit oikeuslähteet search_legal-työkalulla. Ehdotetut haut:");
  lines.push("");
  for (const q of template.searchQueries) {
    lines.push(`- \`search_legal({ query: "${q}" })\``);
  }
  if (template.applicableLaws.length > 0) {
    lines.push("");
    lines.push("Keskeiset lait: " + template.applicableLaws.join(", "));
  }
  lines.push("");

  // Warnings
  if (template.warnings.length > 0) {
    lines.push("## Varoitukset");
    for (const w of template.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }

  // Workflow instructions
  lines.push("## Työnkulku");
  lines.push("1. **Arvioi pyynnön lainmukaisuus.** Jos pyyntö pyrkii lainvastaiseen tai vilpilliseen lopputulokseen, kieltäydy.");
  lines.push("2. Jos käyttäjällä on asiakirja (haaste, lasku, päätös), analysoi se `analyze_document`-työkalulla");
  lines.push("3. **Hae ja verifioi kaikki oikeuslähteet** `search_legal`-työkalulla — älä koskaan keksi viittauksia");
  lines.push("4. Kysy käyttäjältä puuttuvat tiedot (osapuolet, tosiseikat, vaatimukset) ja vahvista ne");
  lines.push("5. Tarkista, että jokainen lakiviittaus tukee väitettä, johon sitä käytetään");
  lines.push("6. Laadi asiakirja `generate_dispute`-työkalulla yllä olevan rakenteen mukaisesti");
  lines.push("7. Varmista, että kaikki PAKOLLISET osiot ovat mukana");
  lines.push("8. **Tarkista lopputulos:** lue generoitu asiakirja läpi ja varmista, ettei se sisällä perättömiä väitteitä tai perusteettomia vaatimuksia");
  lines.push("9. Kerro käyttäjälle, että asiakirja on tarkistutettava juristilla ennen lähettämistä");
  lines.push("");
  lines.push("**Tämä on automaattisesti generoitu asiakirjapohja. Se ei ole oikeudellinen neuvo. Tarkista asiakirja juristin kanssa ennen käyttöä. Ohjelmaa ei saa käyttää lainvastaisiin tai rikollisiin tarkoituksiin.**");

  return lines.join("\n");
}
