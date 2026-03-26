import type { DocumentAnalysis, LegalSearchResult, DisputeType, Language } from "../types.js";

interface DisputeInput {
  disputeType: DisputeType;
  documentAnalysis: DocumentAnalysis;
  legalReferences: LegalSearchResult[];
  userArguments: string;
  respondent: string;
  language: Language;
}

const DISPUTE_TYPE_TITLES: Record<DisputeType, Record<Language, string>> = {
  invoice_denial: {
    fi: "LASKUN KIISTÄMINEN",
    sv: "BESTRIDANDE AV FAKTURA",
  },
  court_response: {
    fi: "VASTAUS KÄRÄJÄOIKEUDELLE",
    sv: "SVAR TILL TINGSRÄTTEN",
  },
  complaint: {
    fi: "REKLAMAATIO",
    sv: "REKLAMATION",
  },
  claim: {
    fi: "VAATIMUS",
    sv: "KRAV",
  },
  objection: {
    fi: "MUISTUTUS / HUOMAUTUS",
    sv: "ANMÄRKNING",
  },
};

const SECTION_HEADERS: Record<string, Record<Language, string>> = {
  subject: { fi: "Asia", sv: "Ärende" },
  background: { fi: "Tausta ja tosiseikat", sv: "Bakgrund och fakta" },
  legalGrounds: { fi: "Oikeudelliset perusteet", sv: "Rättsliga grunder" },
  arguments: { fi: "Perustelut", sv: "Motivering" },
  demands: { fi: "Vaatimukset", sv: "Yrkanden" },
  signature: { fi: "Allekirjoitus", sv: "Underskrift" },
};

function formatDate(lang: Language): string {
  const now = new Date();
  if (lang === "fi") {
    return `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function generateDemands(
  input: DisputeInput,
  lang: Language
): string {
  const { disputeType, documentAnalysis } = input;
  const demands: string[] = [];

  switch (disputeType) {
    case "invoice_denial":
      if (lang === "fi") {
        demands.push("Vaadin, että lasku peruutetaan kokonaisuudessaan.");
        if (documentAnalysis.amounts.length > 0) {
          const total = documentAnalysis.amounts.reduce((s, a) => s + a.value, 0);
          demands.push(
            `Mikäli lasku on jo maksettu, vaadin palautusta ${total.toFixed(2)} € viivästyskorkoineen.`
          );
        }
        demands.push(
          "Vaadin, ettei asiaa siirretä perintään tai ettei perintätoimia jatketa."
        );
      }
      break;
    case "court_response":
      if (lang === "fi") {
        demands.push("Vaadin, että kanne hylätään kokonaisuudessaan.");
        demands.push(
          "Vaadin, että kantaja velvoitetaan korvaamaan oikeudenkäyntikuluni."
        );
      }
      break;
    case "complaint":
      if (lang === "fi") {
        demands.push("Vaadin virheen oikaisua / hinnanalennusta / kaupan purkua.");
        demands.push(
          "Vaadin vastausta tähän reklamaatioon 14 päivän kuluessa."
        );
      }
      break;
    case "claim":
      if (lang === "fi") {
        demands.push("Vaadin vahingonkorvausta aiheutuneesta vahingosta.");
      }
      break;
    case "objection":
      if (lang === "fi") {
        demands.push("Vaadin asian uudelleenkäsittelyä edellä esitetyin perustein.");
      }
      break;
  }

  return demands.map((d) => `- ${d}`).join("\n");
}

export function generateDispute(input: DisputeInput): string {
  const { disputeType, documentAnalysis, legalReferences, userArguments, respondent, language } = input;
  const lang = language;
  const h = (key: string) => SECTION_HEADERS[key]?.[lang] || key;

  const lines: string[] = [];

  // Header
  lines.push(`# ${DISPUTE_TYPE_TITLES[disputeType][lang]}`);
  lines.push("");
  lines.push(`**${lang === "fi" ? "Päivämäärä" : "Datum"}:** ${formatDate(lang)}`);
  lines.push("");

  // Parties
  if (documentAnalysis.parties.sender || respondent) {
    lines.push(`**${lang === "fi" ? "Vastaanottaja" : "Mottagare"}:** ${respondent}`);
    if (documentAnalysis.parties.recipient) {
      lines.push(
        `**${lang === "fi" ? "Lähettäjä" : "Avsändare"}:** ${documentAnalysis.parties.recipient}`
      );
    }
    lines.push("");
  }

  // Reference numbers
  if (documentAnalysis.referenceNumbers.length > 0) {
    lines.push(
      `**${lang === "fi" ? "Viite" : "Referens"}:** ${documentAnalysis.referenceNumbers.join(", ")}`
    );
    lines.push("");
  }

  // Subject
  lines.push(`## ${h("subject")}`);
  lines.push("");
  lines.push(documentAnalysis.summary);
  lines.push("");

  // Background and facts
  lines.push(`## ${h("background")}`);
  lines.push("");
  if (documentAnalysis.claims.length > 0) {
    lines.push(
      lang === "fi"
        ? "Asiakirjassa esitetyt vaatimukset/väitteet:"
        : "Krav/påståenden i dokumentet:"
    );
    for (const claim of documentAnalysis.claims) {
      lines.push(`- ${claim}`);
    }
    lines.push("");
  }
  if (documentAnalysis.amounts.length > 0) {
    lines.push(lang === "fi" ? "Rahamäärät:" : "Belopp:");
    for (const amount of documentAnalysis.amounts) {
      lines.push(
        `- ${amount.description}: ${amount.value.toFixed(2)} ${amount.currency}`
      );
    }
    lines.push("");
  }
  if (documentAnalysis.dates.length > 0) {
    lines.push(lang === "fi" ? "Olennaiset päivämäärät:" : "Relevanta datum:");
    for (const date of documentAnalysis.dates) {
      lines.push(`- ${date.description}: ${date.date}`);
    }
    lines.push("");
  }

  // User's arguments
  lines.push(`## ${h("arguments")}`);
  lines.push("");
  lines.push(userArguments);
  lines.push("");

  // Legal grounds - grouped by source type
  if (legalReferences.length > 0) {
    lines.push(`## ${h("legalGrounds")}`);
    lines.push("");
    lines.push(
      lang === "fi"
        ? "Kiistäminen perustuu seuraaviin oikeuslähteisiin:"
        : "Bestridandet grundar sig på följande rättskällor:"
    );
    lines.push("");

    const sourceGroups: Record<string, Record<Language, string>> = {
      law: { fi: "Sovellettavat lainkohdat", sv: "Tillämpliga lagbestämmelser" },
      kko_ruling: { fi: "Oikeuskäytäntö (KKO)", sv: "Rättspraxis (HD)" },
      kho_ruling: { fi: "Oikeuskäytäntö (KHO)", sv: "Rättspraxis (HFD)" },
      he_document: { fi: "Lain esityöt", sv: "Lagens förarbeten" },
      consumer_board: { fi: "Kuluttajariitalautakunnan ratkaisukäytäntö", sv: "Konsumenttvistenämndens beslutspraxis" },
    };

    const groupOrder = ["law", "kko_ruling", "kho_ruling", "he_document", "consumer_board"];
    const grouped = new Map<string, LegalSearchResult[]>();
    for (const ref of legalReferences) {
      const group = grouped.get(ref.sourceType) || [];
      group.push(ref);
      grouped.set(ref.sourceType, group);
    }

    for (const sourceType of groupOrder) {
      const refs = grouped.get(sourceType);
      if (!refs || refs.length === 0) continue;

      const groupTitle = sourceGroups[sourceType]?.[lang] || sourceType;
      lines.push(`### ${groupTitle}`);
      lines.push("");

      for (const ref of refs) {
        lines.push(`**${ref.citation}**`);
        lines.push("");
        const excerpt =
          ref.text.length > 500
            ? ref.text.substring(0, 500) + "..."
            : ref.text;
        lines.push(`> ${excerpt.replace(/\n/g, "\n> ")}`);
        lines.push("");
        if (ref.url) {
          lines.push(`*${lang === "fi" ? "Lähde" : "Källa"}: ${ref.url}*`);
          lines.push("");
        }
      }
    }

    // Any remaining ungrouped references
    for (const [sourceType, refs] of grouped) {
      if (!groupOrder.includes(sourceType)) {
        for (const ref of refs) {
          lines.push(`### ${ref.citation}`);
          lines.push("");
          const excerpt =
            ref.text.length > 500
              ? ref.text.substring(0, 500) + "..."
              : ref.text;
          lines.push(`> ${excerpt.replace(/\n/g, "\n> ")}`);
          lines.push("");
        }
      }
    }
  }

  // Demands
  lines.push(`## ${h("demands")}`);
  lines.push("");
  lines.push(generateDemands(input, lang));
  lines.push("");

  // Deadlines warning
  if (documentAnalysis.deadlines.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(
      lang === "fi"
        ? "**Huom! Asiakirjassa mainitut määräajat:**"
        : "**OBS! Tidsfrister nämnda i dokumentet:**"
    );
    for (const deadline of documentAnalysis.deadlines) {
      lines.push(`- ${deadline.description}: **${deadline.date}**`);
    }
    lines.push("");
  }

  // Signature block
  lines.push("---");
  lines.push("");
  lines.push(`## ${h("signature")}`);
  lines.push("");
  lines.push(`${lang === "fi" ? "Paikka ja aika" : "Ort och tid"}: ____________________`);
  lines.push("");
  lines.push(
    `${lang === "fi" ? "Allekirjoitus" : "Underskrift"}: ____________________`
  );
  lines.push("");
  lines.push(
    `${lang === "fi" ? "Nimenselvennys" : "Namnförtydligande"}: ____________________`
  );
  lines.push("");

  // Disclaimer
  lines.push("---");
  lines.push("");
  lines.push(
    lang === "fi"
      ? "*Tämä asiakirja on luotu automaattisesti dispute-mcp-työkalulla. Se ei ole oikeudellinen neuvo. Tarkista aina oikeudelliset väitteet pätevän juristin kanssa.*"
      : "*Detta dokument har skapats automatiskt med dispute-mcp-verktyget. Det utgör inte juridisk rådgivning. Kontrollera alltid juridiska påståenden med en kvalificerad jurist.*"
  );

  return lines.join("\n");
}
