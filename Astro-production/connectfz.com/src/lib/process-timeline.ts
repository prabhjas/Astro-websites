export type ProcessStep = { title: string; body: string };

const GOLDEN: ProcessStep[] = [
  {
    title: "Documentation",
    body: "Our team helps you gather all the required documents and complete the paperwork, obtaining all the necessary approvals.",
  },
  {
    title: "Submission",
    body: "Our team ensures to submit all of your documents to the respective Authority and follows up until your application is processed.",
  },
  {
    title: "Approval",
    body: "We will let you know when your application gets approved so you can start planning your move and next steps in the UAE.",
  },
  {
    title: "Multiple-entry visa",
    body: "You will get a multiple-entry visa so you can enter the UAE, which will be valid for 6 months while residency is issued.",
  },
  {
    title: "Residence issuance",
    body: "The UAE will issue your Golden Visa so you can now become a legal resident and enjoy long-term stay benefits.",
  },
  {
    title: "Ongoing support",
    body: "We will help you with any other aspect you want our help with, from dependents to renewals and local formalities.",
  },
];

function visaSteps(label: string): ProcessStep[] {
  return GOLDEN.map((s) =>
    s.title === "Residence issuance"
      ? {
          ...s,
          body: `The UAE will issue your ${label} so you can become a legal resident and start your stay with confidence.`,
        }
      : s,
  );
}

const SETUP: ProcessStep[] = [
  {
    title: "Consultation",
    body: "Share your business activity, visa needs, and budget. We outline the fastest, most cost-effective setup route.",
  },
  {
    title: "Choose jurisdiction",
    body: "We compare free zones and mainland options against your activity, ownership, and office requirements.",
  },
  {
    title: "Documentation",
    body: "Our team prepares trade name options, application forms, KYC packs, and any authority-specific paperwork.",
  },
  {
    title: "Submission",
    body: "We file with the relevant authority, pay government fees on your behalf, and track every approval.",
  },
  {
    title: "License issuance",
    body: "You receive your trade license, establishment documents, and company stamps ready to operate.",
  },
  {
    title: "Visas & banking",
    body: "We assist with establishment cards, investor/employee visas, and introductions for corporate bank accounts.",
  },
];

const LICENSE: ProcessStep[] = [
  {
    title: "Activity selection",
    body: "We map your business model to the correct licensed activities so the application is accepted first time.",
  },
  {
    title: "Documentation",
    body: "Our team compiles passport copies, visa pages, proof of address, and any professional certificates required.",
  },
  {
    title: "Submission",
    body: "We submit the license application to DED or the free zone and follow up with the case officer.",
  },
  {
    title: "Initial approval",
    body: "Once initial approval is granted, we complete remaining formalities such as tenancy and MOA.",
  },
  {
    title: "License issuance",
    body: "Your trade license is issued. We share digital and hard copies and explain what you can operate under it.",
  },
  {
    title: "Ongoing support",
    body: "Need visas, a bank account, or an amendment later? We stay with you after the license is in your hands.",
  },
];

const BANK: ProcessStep[] = [
  {
    title: "Eligibility check",
    body: "We review your license, activity, nationality, and turnover to match you with banks that will actually onboard you.",
  },
  {
    title: "Document pack",
    body: "Our team prepares KYC files, company documents, and business profiles in each bank’s preferred format.",
  },
  {
    title: "Bank matching",
    body: "We introduce you to relationship managers at suitable UAE banks and schedule the application.",
  },
  {
    title: "Application",
    body: "Forms are completed accurately and submitted with supporting evidence to avoid compliance bounce-backs.",
  },
  {
    title: "Compliance interview",
    body: "We brief you for KYC interviews and remain available while compliance completes their checks.",
  },
  {
    title: "Account activation",
    body: "Once approved, we help you activate internet banking, cards, and initial deposits so you can transact.",
  },
];

const LIQUIDATION: ProcessStep[] = [
  {
    title: "Assessment",
    body: "We review your license, visas, liabilities, and bank accounts to confirm the correct liquidation route.",
  },
  {
    title: "Board resolution",
    body: "We prepare shareholder resolutions and appointment of a liquidator as required by the authority.",
  },
  {
    title: "Public notice",
    body: "Statutory advertisements and creditor notices are filed within the required timelines.",
  },
  {
    title: "Clearances",
    body: "We obtain immigration, labour, and utility clearances and cancel visas linked to the company.",
  },
  {
    title: "Authority filing",
    body: "Final liquidation documents are submitted to DED or the free zone until the license is cancelled.",
  },
  {
    title: "Deregistration",
    body: "You receive cancellation certificates and we close remaining bank and government files.",
  },
];

export function processStepsForPath(path: string): ProcessStep[] {
  if (/golden-visa/i.test(path)) return GOLDEN;
  if (/job-seeker/i.test(path)) return visaSteps("Job Seeker Visa");
  if (/spouse-visa/i.test(path)) return visaSteps("Spouse Visa");
  if (/freelance/i.test(path)) return visaSteps("Freelance Visa");
  if (/investor-visa/i.test(path)) return visaSteps("Investor Visa");
  if (/remote/i.test(path)) return visaSteps("Remote Work Visa");
  if (/retirement/i.test(path)) return visaSteps("Retirement Visa");
  if (/bank-account/i.test(path)) return BANK;
  if (/liquidation/i.test(path)) return LIQUIDATION;
  if (/license/i.test(path)) return LICENSE;
  return SETUP;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderProcessTimeline(steps: ProcessStep[]): string {
  const items = steps
    .map(
      (step, i) => `
      <li class="cfz-process-timeline__item${i === 1 ? " is-active" : ""}">
        <span class="cfz-process-timeline__dot" aria-hidden="true"></span>
        <article class="cfz-process-timeline__card">
          <span class="cfz-process-timeline__num">${i + 1}</span>
          <div class="cfz-process-timeline__copy">
            <h3>${escapeHtml(step.title)}</h3>
            <p>${escapeHtml(step.body)}</p>
          </div>
        </article>
      </li>`,
    )
    .join("");
  return `<ol class="cfz-process-timeline" data-cfz-process="1">${items}</ol>`;
}

/** Restore Elementor nested-accordion PROCESS steps that were dropped in the WP extract. */
export function injectProcessTimeline(html: string, path: string): string {
  if (!html || html.includes("cfz-process-timeline")) return html;
  const found = html.match(/>PROCESS<\/(?:p|span|h[1-6])>/i);
  if (!found || found.index == null) return html;
  const idx = found.index;
  const marker = found[0];

  const closeWidget = (from: number) => {
    const slice = html.slice(from);
    const m = slice.match(/<\/div>\s*<\/div>/);
    return m && m.index != null ? from + m.index + m[0].length : from;
  };

  let pos = closeWidget(idx + marker.length);
  const peek = html.slice(pos, pos + 900);
  if (/elementor-widget-heading/i.test(peek) && /<h[12]\b/i.test(peek)) {
    pos = closeWidget(pos);
  }

  let head = html.slice(0, pos);
  const h2 = '<h2 class="elementor-heading-title elementor-size-default"';
  const lastH2 = head.lastIndexOf(h2);
  if (lastH2 >= idx) {
    head =
      head.slice(0, lastH2) +
      '<h2 class="elementor-heading-title elementor-size-default cfz-process-title"' +
      head.slice(lastH2 + h2.length);
  }

  return head + renderProcessTimeline(processStepsForPath(path)) + html.slice(pos);
}
