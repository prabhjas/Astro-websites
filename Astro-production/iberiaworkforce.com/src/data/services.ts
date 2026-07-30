import type { Lang } from '../i18n/config';

export type ServiceCopy = {
  name: string;
  navName: string;
  short: string;          // card blurb + services-index summary
  metaTitle: string;
  metaDescription: string;
  hero: string;           // one-line hero subheading
  intro: string[];        // intro paragraphs
  includesTitle: string;
  includes: string[];     // "what's included" bullets
  whyTitle: string;
  why: string[];          // "why it matters" paragraphs
};

export type Service = {
  slug: string;
  icon: IconName;
  en: ServiceCopy;
  es: ServiceCopy;
};

export type IconName = 'eor' | 'payroll' | 'legal' | 'compliance' | 'staffing';

export const services: Service[] = [
  {
    slug: 'eor',
    icon: 'eor',
    en: {
      name: 'Employer of Record (EOR) in Spain',
      navName: 'Employer of Record',
      short: 'Hire employees in Spain without setting up a Spanish entity. We become the legal employer while your team works for you.',
      metaTitle: 'Employer of Record (EOR) in Spain | Iberia Workforce Solutions',
      metaDescription: 'Hire in Spain without a local entity. Iberia Workforce Solutions acts as your Employer of Record — compliant Spanish contracts, payroll, social security and benefits.',
      hero: 'Hire in Spain in days — no local entity required.',
      intro: [
        'Our Employer of Record (EOR) service lets you employ staff in Spain without incorporating a Spanish company. Iberia Workforce Solutions becomes the legal employer of record, handling compliant Spanish employment contracts, payroll, social security and benefits, while your employee reports to and works for you day to day.',
        'It is the fastest, lowest-risk way to expand into Spain, test the market, or retain Spanish talent — with full compliance under Spanish labour law from day one.',
      ],
      includesTitle: 'What our EOR service covers',
      includes: [
        'Compliant Spanish employment contracts (indefinite, fixed-term, part-time)',
        'Registration with Seguridad Social and the tax authorities',
        'Monthly payroll, IRPF withholding and social security filings',
        'Statutory benefits, paid leave and severance administration',
        'Onboarding, offboarding and contract amendments',
        'Ongoing HR and labour-law guidance for your team in Spain',
      ],
      whyTitle: 'Why choose an EOR in Spain',
      why: [
        'Setting up a Spanish subsidiary can take months and carries ongoing accounting, legal and tax obligations. With an EOR you can have a compliant employee on the ground in a matter of days.',
        'As an authorised operator regulated by the Spanish Ministry of Labour, we absorb the employment risk and keep you fully compliant — so you can focus on your business, not Spanish bureaucracy.',
      ],
    },
    es: {
      name: 'Employer of Record (EOR) en España',
      navName: 'Employer of Record',
      short: 'Contrata empleados en España sin abrir una empresa española. Nosotros somos el empleador legal mientras tu equipo trabaja para ti.',
      metaTitle: 'Employer of Record (EOR) en España | Iberia Workforce Solutions',
      metaDescription: 'Contrata en España sin entidad local. Iberia Workforce Solutions actúa como tu Employer of Record: contratos españoles conformes, nóminas, Seguridad Social y beneficios.',
      hero: 'Contrata en España en días, sin entidad local.',
      intro: [
        'Nuestro servicio de Employer of Record (EOR) te permite emplear personal en España sin constituir una empresa española. Iberia Workforce Solutions actúa como empleador legal, gestionando contratos laborales españoles conformes, nóminas, Seguridad Social y beneficios, mientras tu empleado trabaja para ti en el día a día.',
        'Es la forma más rápida y con menor riesgo de expandirte a España, probar el mercado o retener talento español, con plena conformidad con la legislación laboral española desde el primer día.',
      ],
      includesTitle: 'Qué incluye nuestro servicio EOR',
      includes: [
        'Contratos laborales españoles conformes (indefinido, temporal, parcial)',
        'Alta en la Seguridad Social y ante la Agencia Tributaria',
        'Nómina mensual, retención de IRPF y cotizaciones sociales',
        'Beneficios legales, vacaciones e indemnizaciones',
        'Altas, bajas y modificaciones contractuales',
        'Asesoramiento continuo en RR. HH. y derecho laboral para tu equipo en España',
      ],
      whyTitle: 'Por qué elegir un EOR en España',
      why: [
        'Constituir una filial en España puede llevar meses y conlleva obligaciones contables, legales y fiscales permanentes. Con un EOR puedes tener un empleado conforme sobre el terreno en cuestión de días.',
        'Como operador autorizado y regulado por el Ministerio de Trabajo de España, asumimos el riesgo laboral y te mantenemos plenamente conforme, para que te centres en tu negocio y no en la burocracia española.',
      ],
    },
  },
  {
    slug: 'payroll',
    icon: 'payroll',
    en: {
      name: 'Payroll Services in Spain',
      navName: 'Payroll',
      short: 'Accurate, on-time Spanish payroll — nómina, IRPF, social security and reporting — fully managed for your workforce.',
      metaTitle: 'Payroll Outsourcing in Spain | Iberia Workforce Solutions',
      metaDescription: 'Outsource Spanish payroll to Iberia Workforce Solutions. Monthly nómina, IRPF withholding, Seguridad Social filings and payslips — accurate, on time and compliant.',
      hero: 'Compliant Spanish payroll, handled end to end.',
      intro: [
        'We run your Spanish payroll from start to finish: calculating gross-to-net, producing payslips (nóminas), withholding IRPF, and filing social security and tax returns on the correct schedule.',
        'Whether you employ one person or a hundred in Spain, you get accurate payments, clear reporting and a single point of contact — without building an in-house payroll team.',
      ],
      includesTitle: 'What our payroll service covers',
      includes: [
        'Monthly gross-to-net calculation and payslip generation',
        'IRPF withholding and periodic tax filings (Modelo 111, 190)',
        'Seguridad Social contributions and RLC/RNT submissions',
        'New hires, terminations, absences and variable pay',
        'Annual summaries and payroll reporting for your finance team',
        'Guidance on collective bargaining agreements (convenios) that apply',
      ],
      whyTitle: 'Why outsource payroll in Spain',
      why: [
        'Spanish payroll is governed by sector-specific collective agreements and strict filing deadlines. Small errors trigger penalties and unhappy employees.',
        'Outsourcing to a specialist keeps you compliant, reduces cost, and frees your managers from a complex, deadline-driven administrative burden.',
      ],
    },
    es: {
      name: 'Servicios de Nóminas en España',
      navName: 'Nóminas',
      short: 'Nóminas españolas exactas y puntuales — nómina, IRPF, Seguridad Social y presentaciones — totalmente gestionadas.',
      metaTitle: 'Externalización de Nóminas en España | Iberia Workforce Solutions',
      metaDescription: 'Externaliza tus nóminas en España con Iberia Workforce Solutions. Nómina mensual, retención de IRPF, presentaciones a la Seguridad Social y recibos, exactos y conformes.',
      hero: 'Nóminas españolas conformes, gestionadas de principio a fin.',
      intro: [
        'Gestionamos tu nómina española de principio a fin: cálculo de bruto a neto, elaboración de recibos de salario (nóminas), retención de IRPF y presentación de declaraciones fiscales y de la Seguridad Social en los plazos correctos.',
        'Tanto si empleas a una persona como a cien en España, obtienes pagos exactos, informes claros y un único punto de contacto, sin necesidad de montar un equipo interno de nóminas.',
      ],
      includesTitle: 'Qué incluye nuestro servicio de nóminas',
      includes: [
        'Cálculo mensual de bruto a neto y elaboración de recibos',
        'Retención de IRPF y presentaciones fiscales periódicas (Modelo 111, 190)',
        'Cotizaciones a la Seguridad Social y envíos RLC/RNT',
        'Altas, bajas, ausencias y retribución variable',
        'Resúmenes anuales e informes de nómina para tu equipo financiero',
        'Asesoramiento sobre los convenios colectivos aplicables',
      ],
      whyTitle: 'Por qué externalizar la nómina en España',
      why: [
        'La nómina española se rige por convenios colectivos sectoriales y plazos de presentación estrictos. Pequeños errores generan sanciones y descontento entre los empleados.',
        'Externalizar a un especialista te mantiene conforme, reduce costes y libera a tus responsables de una carga administrativa compleja y sujeta a plazos.',
      ],
    },
  },
  {
    slug: 'labour-legal',
    icon: 'legal',
    en: {
      name: 'Labour & Legal Advisory in Spain',
      navName: 'Labour & Legal',
      short: 'Practical guidance on Spanish employment law — contracts, dismissals, disputes and collective agreements.',
      metaTitle: 'Labour & Legal Advisory in Spain | Iberia Workforce Solutions',
      metaDescription: 'Spanish labour and legal advisory: employment contracts, dismissals, disputes, collective agreements and workforce restructuring — compliant with Spanish law.',
      hero: 'Confident decisions under Spanish labour law.',
      intro: [
        'Spanish employment law is protective, detailed and enforced. Our labour and legal advisory service gives you clear, practical answers on hiring, contracts, working conditions, dismissals and disputes.',
        'We help you act correctly the first time — avoiding costly claims before the Spanish labour courts (juzgados de lo social) and keeping your workforce relationships sound.',
      ],
      includesTitle: 'How we support you',
      includes: [
        'Drafting and reviewing employment contracts and clauses',
        'Advice on the applicable collective bargaining agreement (convenio)',
        'Dismissals, settlements and disciplinary procedures',
        'Working time, holidays, leave and remote-work agreements',
        'Restructuring, redundancies and workforce changes',
        'Representation and support in labour disputes and inspections',
      ],
      whyTitle: 'Why specialist labour advice matters',
      why: [
        'Getting employment decisions wrong in Spain is expensive: unfair dismissal, back-pay and social-security liabilities add up quickly.',
        'Our team keeps you on the right side of Spanish labour law so you can manage people decisively and with confidence.',
      ],
    },
    es: {
      name: 'Asesoría Laboral y Legal en España',
      navName: 'Laboral y Legal',
      short: 'Orientación práctica sobre derecho laboral español — contratos, despidos, conflictos y convenios colectivos.',
      metaTitle: 'Asesoría Laboral y Legal en España | Iberia Workforce Solutions',
      metaDescription: 'Asesoría laboral y legal en España: contratos de trabajo, despidos, conflictos, convenios colectivos y reestructuraciones, conforme a la legislación española.',
      hero: 'Decisiones seguras bajo la legislación laboral española.',
      intro: [
        'El derecho laboral español es garantista, detallado y de estricto cumplimiento. Nuestro servicio de asesoría laboral y legal te ofrece respuestas claras y prácticas sobre contratación, contratos, condiciones de trabajo, despidos y conflictos.',
        'Te ayudamos a actuar correctamente a la primera, evitando reclamaciones costosas ante los juzgados de lo social y manteniendo unas buenas relaciones laborales.',
      ],
      includesTitle: 'Cómo te ayudamos',
      includes: [
        'Redacción y revisión de contratos y cláusulas laborales',
        'Asesoramiento sobre el convenio colectivo aplicable',
        'Despidos, acuerdos y procedimientos disciplinarios',
        'Jornada, vacaciones, permisos y acuerdos de teletrabajo',
        'Reestructuraciones, despidos colectivos y cambios de plantilla',
        'Apoyo y representación en conflictos laborales e inspecciones',
      ],
      whyTitle: 'Por qué importa el asesoramiento laboral especializado',
      why: [
        'Equivocarse en las decisiones laborales en España sale caro: despido improcedente, salarios de tramitación y responsabilidades con la Seguridad Social se acumulan rápidamente.',
        'Nuestro equipo te mantiene del lado correcto de la ley laboral española para que gestiones a tu personal con decisión y confianza.',
      ],
    },
  },
  {
    slug: 'compliance',
    icon: 'compliance',
    en: {
      name: 'Employment Compliance in Spain',
      navName: 'Compliance',
      short: 'Stay compliant with Spanish social security, tax and labour obligations — audits, filings and ongoing monitoring.',
      metaTitle: 'Employment Compliance in Spain | Iberia Workforce Solutions',
      metaDescription: 'Employment compliance in Spain: social security, IRPF, labour registrations, audits and ongoing monitoring so your workforce stays fully compliant.',
      hero: 'Full workforce compliance, continuously maintained.',
      intro: [
        'Employing people in Spain means ongoing obligations to the Seguridad Social, the tax authorities and the labour inspectorate. Our compliance service makes sure every registration, filing and record is correct and up to date.',
        'We monitor deadlines and regulatory changes, run compliance reviews, and prepare you for inspections — so nothing slips and no penalties arise.',
      ],
      includesTitle: 'What we keep compliant',
      includes: [
        'Social security and tax registrations and filings',
        'Contract, working-time and payroll compliance checks',
        'Occupational risk prevention (PRL) coordination',
        'Data protection (RGPD/LOPDGDD) in employment records',
        'Compliance audits and remediation plans',
        'Preparation and support for labour inspections',
      ],
      whyTitle: 'Why compliance is non-negotiable',
      why: [
        'Spanish labour inspections are active and sanctions are significant. Non-compliance can mean fines, back-payments and reputational damage.',
        'Continuous compliance monitoring protects your business and gives you documented peace of mind.',
      ],
    },
    es: {
      name: 'Compliance Laboral en España',
      navName: 'Compliance',
      short: 'Cumple con la Seguridad Social, la fiscalidad y las obligaciones laborales de España — auditorías, presentaciones y seguimiento continuo.',
      metaTitle: 'Compliance Laboral en España | Iberia Workforce Solutions',
      metaDescription: 'Compliance laboral en España: Seguridad Social, IRPF, altas laborales, auditorías y seguimiento continuo para que tu plantilla cumpla plenamente.',
      hero: 'Cumplimiento total de tu plantilla, mantenido de forma continua.',
      intro: [
        'Emplear personas en España conlleva obligaciones continuas con la Seguridad Social, la Agencia Tributaria y la Inspección de Trabajo. Nuestro servicio de compliance garantiza que cada alta, presentación y registro sea correcto y esté actualizado.',
        'Vigilamos plazos y cambios normativos, realizamos revisiones de cumplimiento y te preparamos para las inspecciones, de modo que nada se escape ni surjan sanciones.',
      ],
      includesTitle: 'Qué mantenemos conforme',
      includes: [
        'Altas y presentaciones ante la Seguridad Social y Hacienda',
        'Revisiones de conformidad de contratos, jornada y nómina',
        'Coordinación de prevención de riesgos laborales (PRL)',
        'Protección de datos (RGPD/LOPDGDD) en los registros laborales',
        'Auditorías de compliance y planes de subsanación',
        'Preparación y apoyo ante inspecciones de trabajo',
      ],
      whyTitle: 'Por qué el compliance no es negociable',
      why: [
        'Las inspecciones de trabajo en España son activas y las sanciones, cuantiosas. El incumplimiento puede suponer multas, pagos atrasados y daño reputacional.',
        'El seguimiento continuo del cumplimiento protege tu negocio y te da tranquilidad documentada.',
      ],
    },
  },
  {
    slug: 'staff-outsourcing',
    icon: 'staffing',
    en: {
      name: 'Staff Outsourcing & Temporary Staffing in Spain',
      navName: 'Staff Outsourcing',
      short: 'Flexible, fully-managed teams and temporary workers in Spain, supplied as an authorised ETT.',
      metaTitle: 'Staff Outsourcing & Temporary Staffing in Spain | Iberia Workforce',
      metaDescription: 'Staff outsourcing and temporary staffing in Spain from an authorised ETT. Scale your workforce up or down with fully-managed, compliant teams.',
      hero: 'Scale your Spanish workforce, up or down, on demand.',
      intro: [
        'As an authorised Empresa de Trabajo Temporal (ETT), Iberia Workforce Solutions supplies temporary and outsourced staff to companies operating in Spain — legally, quickly and fully managed.',
        'From seasonal peaks and project teams to ongoing outsourced functions, we recruit, employ and manage the workers while you direct the work. You get flexible capacity without the fixed headcount and administration.',
      ],
      includesTitle: 'What we deliver',
      includes: [
        'Temporary workers supplied under a compliant ETT framework',
        'Recruitment and selection of qualified candidates',
        'Full employment, payroll and social security administration',
        'Outsourced teams for defined functions or projects',
        'Rapid scale-up for seasonal or peak demand',
        'A single, accountable partner for your flexible workforce',
      ],
      whyTitle: 'Why work with an authorised ETT',
      why: [
        'In Spain, only companies authorised as an ETT by the Ministry of Labour may legally supply temporary workers. Using an unauthorised provider exposes you to serious liability.',
        'Our authorisation means your flexible staffing is compliant by design — with the workers properly employed, insured and managed.',
      ],
    },
    es: {
      name: 'Externalización de Personal y Trabajo Temporal en España',
      navName: 'Externalización',
      short: 'Equipos flexibles y trabajadores temporales en España, totalmente gestionados y suministrados como ETT autorizada.',
      metaTitle: 'Externalización de Personal y Trabajo Temporal en España | Iberia Workforce',
      metaDescription: 'Externalización de personal y trabajo temporal en España desde una ETT autorizada. Amplía o reduce tu plantilla con equipos gestionados y conformes.',
      hero: 'Amplía o reduce tu plantilla en España, bajo demanda.',
      intro: [
        'Como Empresa de Trabajo Temporal (ETT) autorizada, Iberia Workforce Solutions suministra personal temporal y externalizado a empresas que operan en España, de forma legal, rápida y totalmente gestionada.',
        'Desde picos estacionales y equipos de proyecto hasta funciones externalizadas continuas, reclutamos, empleamos y gestionamos a los trabajadores mientras tú diriges el trabajo. Obtienes capacidad flexible sin plantilla fija ni carga administrativa.',
      ],
      includesTitle: 'Qué ofrecemos',
      includes: [
        'Trabajadores temporales bajo un marco ETT conforme',
        'Reclutamiento y selección de candidatos cualificados',
        'Gestión completa de contratación, nómina y Seguridad Social',
        'Equipos externalizados para funciones o proyectos concretos',
        'Ampliación rápida para demanda estacional o puntual',
        'Un único socio responsable de tu plantilla flexible',
      ],
      whyTitle: 'Por qué trabajar con una ETT autorizada',
      why: [
        'En España, solo las empresas autorizadas como ETT por el Ministerio de Trabajo pueden ceder legalmente trabajadores temporales. Usar un proveedor no autorizado te expone a una responsabilidad grave.',
        'Nuestra autorización garantiza que tu personal flexible es conforme por diseño, con los trabajadores debidamente contratados, asegurados y gestionados.',
      ],
    },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function serviceCopy(s: Service, lang: Lang): ServiceCopy {
  return s[lang];
}
