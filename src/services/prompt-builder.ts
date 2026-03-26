import type { LegalDocumentTemplate } from "../data/document-templates.js";

export function buildDocumentPrompt(
  template: LegalDocumentTemplate,
  context: string
): string {
  const lines: string[] = [];

  lines.push(`# Tehtävä: Laadi ${template.name}`);
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
  lines.push("1. Jos käyttäjällä on asiakirja (haaste, lasku, päätös), analysoi se `analyze_document`-työkalulla");
  lines.push("2. Hae oikeuslähteet `search_legal`-työkalulla (yllä olevat haut + tapauskohtaiset)");
  lines.push("3. Kysy käyttäjältä puuttuvat tiedot (osapuolet, tosiseikat, vaatimukset)");
  lines.push("4. Laadi asiakirja `generate_dispute`-työkalulla yllä olevan rakenteen mukaisesti");
  lines.push("5. Varmista, että kaikki PAKOLLISET osiot ovat mukana");
  lines.push("6. Lisää vastuuvapauslauseke");
  lines.push("");
  lines.push("**Tämä on automaattisesti generoitu asiakirjapohja. Se ei ole oikeudellinen neuvo. Tarkista asiakirja juristin kanssa ennen käyttöä.**");

  return lines.join("\n");
}
