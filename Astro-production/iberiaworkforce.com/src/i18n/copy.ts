import { getLocale, type Locale } from "./locale";

const en = {
  meta: {
    defaultTitle:
      "Iberia Work Force | ETT-licensed EOR in Spain & Europe",
    defaultDescription:
      "Employer of Record, payroll and workforce solutions across 5 European countries. ETT-licensed and backed by a Spanish law firm.",
    ogImageAlt:
      "Iberia Work Force — workforce solutions, grounded in 30 years of experience.",
  },
  nav: {
    home: "Home",
    about: "About Us",
    contact: "Contact",
    services: "Services",
    countries: "Countries",
    cta: "Request a Proposal",
    menu: "Menu",
    homeSr: "Iberia Work Force — home",
    primaryAria: "Primary",
    servicesRail: "Service categories",
    countriesRail: "Countries",
    comingSoon: "Coming Soon",
  },
  footer: {
    blurb:
      "Connecting exceptional talent with opportunity across Spain and the Iberian Peninsula.",
    ettVerify: "Officially authorised ETT verify us",
    authNo: "AUTHORISATION NO.",
    nif: "NIF",
    labourAuthority: "LABOUR AUTHORITY",
    registryHint:
      'In the registry, select “Cataluña” as the Autoridad Laboral to find us — please do not search by name.',
    getInTouch: "Get in Touch",
    madrid: "Madrid, Spain",
    requestProposal: "Request a Proposal",
    whatsapp: "Chat on WhatsApp",
    services: "Services",
    company: "Company",
    aboutUs: "About Us",
    copyright: "© 2026 Iberia Work Force. All rights reserved.",
    registered: "Registered in Spain",
    legal: ["Privacy Policy", "Cookie Policy", "Aviso Legal", "Terms of Service"],
  },
  form: {
    heading: "Get in touch",
    body: "Fill out the form and our specialists will reach out.",
    submit: "Send Message",
    name: "Name",
    namePlaceholder: "Enter your full name",
    email: "Email",
    phone: "Phone Number",
    phoneAria: "Phone country code",
    message: "Message",
    messagePlaceholder: "How can we help you today?",
    words: "words",
    honeypot: "Leave this empty",
    required: (field: string) => `${field} is required.`,
    emailInvalid: "Enter a valid email address, e.g. name@company.com.",
    phoneInvalid: "Enter a phone number using digits only.",
    tooShort: (field: string, n: number) =>
      `${field} must be at least ${n} characters.`,
    tooLong: (field: string, n: number) =>
      `${field} must be ${n} characters or fewer.`,
    checkField: "Please check this field.",
    wordLimit: (n: number) =>
      `Please shorten your message to ${n} words or fewer.`,
    oneField: "One field needs attention.",
    nFields: (n: number) => `${n} fields need attention.`,
    sending: "Sending…",
    thanks: "Thank you. Your enquiry has been received.",
    fail: "We could not submit your enquiry. Please try again.",
    thisField: "This field",
  },
  carousel: { prev: "Previous", next: "Next" },
  lang: {
    change: (current: string) => `Change language, currently ${current}`,
    menu: "Language",
  },
  hero: {
    heading: "Workforce solutions in Spain, grounded in 30 years of Spanish law.",
    body: "We help foreign companies and local businesses hire, pay and manage employees across Spain and Europe, backed by the legal expertise most providers simply don't have.",
    badges: ["ETT Licensed", "Law Firm Backed", "5 European Countries"],
    cta: "Talk to a Specialist",
    secondary: "See Our Services",
  },
  ett: {
    eyebrow: "OFFICIALLY AUTHORISED & PUBLICLY VERIFIABLE",
    heading: "The only Employer of Record with an official Spanish ETT licence",
    body: "We are a registered Empresa de Trabajo Temporal with the Spanish Ministry of Labour. Unlike other EOR providers, our status is public and verifiable, no other EOR appears in the official register.",
    authNo: "AUTHORISATION NO.",
    nif: "NIF",
    labourAuthority: "LABOUR AUTHORITY",
    verifyHeading: "Verify it yourself",
    verifyBody:
      'Open the Ministry of Labour register (SIGETT), choose “Cataluña”, search — or search our NIF B23977879. Iberia Workforce Solutions is there.',
    verifyCta: "Verify in the Official Register",
    verifyFoot:
      "Iberia Workforce Solutions ETT S.L. · Dirección General de Relaciones Laborales de Cataluña",
  },
  services: {
    eyebrow: "IBERIA WORKFORCE",
    heading: "Workforce solutions across Spain and Europe",
    eorTitle: "Employer of Record",
    eorBody:
      "Hire employees in Spain and Europe without setting up a legal entity. We are the employer on record - ETT-licensed and fully compliant.",
    eorCta: "Explore EOR",
    eorHref: "/employer-of-record",
    payrollTitle: "Payroll Outsourcing",
    payrollBody:
      "Full-service Spanish and European payroll — nómina, TGSS, IRPF, and multi-country payroll managed by compliance experts.",
    payrollCta: "Explore Payroll",
    payrollHref: "/payroll-outsourcing",
    cards: [
      {
        title: "Recruitment",
        description:
          "Talent sourcing across Spain and Europe - hiring and compliance under one roof.",
        href: "/recruitment",
        cta: "Explore Recruitment",
      },
      {
        title: "Temporary Staffing",
        description:
          "ETT-licensed temporary workforce for seasonal peaks and short-term needs.",
        href: "/temporary-staffing",
        cta: "Explore Temporary Staffing",
      },
      {
        title: "Staff Outsourcing",
        description:
          "Your workforce, managed under our legal umbrella. We handle contracts, compliance, and HR administration end to end.",
        href: "/staff-outsourcing",
        cta: "Explore Staff Outsourcing",
      },
    ],
  },
  differentiators: {
    headingBefore: "Why companies choose ",
    headingBrand: "Iberia Workforce",
    headingAfter: "?",
    items: [
      {
        title: "ETT-licensed.",
        description:
          "Spanish law requires an ETT licence to legally supply workers to third parties. Most EOR providers in Spain don't have one — exposing clients to serious legal risk. We hold the licence. They don't.",
      },
      {
        title: "Backed by a Spanish law firm",
        description:
          "Over 30 years of Spanish legal practice behind every hire. Employment lawyers and immigration specialists — not account managers who approximate the legislation.",
      },
      {
        title: "Immigration lawyers, not coordinators",
        description:
          "Non-EU hires, non-Schengen visas, complex work permits — handled by in-house lawyers. We take the cases other providers decline.",
      },
      {
        title: "9 Years. 10,000 employees. Proven at scale.",
        description:
          "Built over 9 years in the UAE — one of the world's most compliance-heavy environments. 10,000 employees placed. We brought that depth to Spain.",
      },
    ],
  },
  process: {
    eyebrow: "HOW IT WORKS",
    headingHtml: "Hire in Spain<br />in three steps.",
    aria: "How it works — scroll for more steps",
    ready: "Ready to hire in Europe without the legal exposure?",
    cta: "Talk to a Specialist",
    steps: [
      {
        title: "Tell us who you need to hire",
        description:
          "Share the role, location, start date, and whether the hire is EU or non-EU. We assess the right structure upfront.",
        alt: "Two colleagues at a Madrid office desk reviewing a document together",
      },
      {
        title: "We handle all legal and compliance work",
        description:
          "Our lawyers prepare the contract, register the employee with TGSS, and manage visa processing if required.",
        alt: "A person signing a printed employment contract at a desk",
      },
      {
        title: "Your employee is onboarded",
        description:
          "We run payroll, manage ongoing HR administration, and remain your legal employer of record. You manage the day-to-day.",
        alt: "A new employee being welcomed through an open-plan workspace",
      },
    ],
  },
  geography: {
    eyebrow: "WHERE WE OPERATE",
    heading: "Spain-first. Europe-ready.",
    body: "Employer of Record, payroll and workforce solutions across 5 European countries.",
    aria: "Countries we operate in — scroll for more",
    primary: "Primary Market",
    countries: [
      { name: "Spain", alt: "Spanish cityscape" },
      { name: "Germany", alt: "German cityscape" },
      { name: "Portugal", alt: "Portuguese coastline" },
      { name: "Poland", alt: "Polish cityscape" },
      { name: "Italy", alt: "Italian cityscape" },
    ],
  },
  pricing: {
    eyebrow: "PRICING",
    heading: "Transparent pricing. No hidden costs.",
    body: "EOR in Spain at a flat monthly rate. All other services quoted on request.",
    planName: "Employer of Record - Iberia EOR",
    unit: "/ employee / month",
    note: "Flat rate. No setup fees for standard EU hires. No surprises.",
    features: [
      "Employment contract",
      "TGSS registration",
      "Payroll processing",
      "Ongoing HR administration",
    ],
    planCta: "See Full EOR Details",
    customEyebrow: "All Other Services: Custom Quote",
    customHeading: "Payroll · Contractor · Recruitment · Staffing.",
    customBody:
      "Pricing depends on headcount, contract type, and country. Full breakdown before any commitment — no obligation.",
    customCta: "Talk to an expert",
    footnote:
      "EOR services in Spain typically range from €300–€800/month. Our flat €299 rate includes no setup fees for standard EU hires.",
  },
  social: {
    eyebrow: "OUR CLIENTS",
    heading: "Trusted by companies hiring across Europe",
    aria: "Client testimonials — scroll for more",
    quotes: [
      {
        quote:
          "We needed to hire in Spain and Portugal simultaneously, but most EOR platforms either couldn't handle the Beckham Law implications or had no idea what a convenio colectivo was. Iberia's team knew Spain's employment law inside out, gave us a quote in 2 days, and we were onboarded within a week. Worth the peace of mind.",
        role: "Head of People, TechScale (Series B)",
        location: "Madrid, Spain",
      },
      {
        quote:
          "We didn't have a Spanish entity and were terrified of hiring our first employee there. The legal risk felt enormous. What sold me was talking to their in-house lawyer, not an account manager. She asked questions our previous EOR provider never even thought to ask about residency permits. That's when I knew we were in the right hands.",
        role: "Operations Director, GrowthCo",
        location: "Berlin, Germany",
      },
      {
        quote:
          "Our employee wanted to move to Barcelona but we had no presence there. We needed something fast, reliable, and legally bulletproof before we could say yes. Iberia handled it all—visa, payroll, CBA compliance. Our HR team now uses them as a reference for every other market we're thinking about entering.",
        role: "Senior HR Business Partner, EuroTech",
        location: "Dublin, Ireland",
      },
    ],
  },
  closing: {
    heading: "Ready to hire in Spain or Europe without the legal risk?",
    body: "Speak with one of our employment lawyers or workforce specialists. We assess your situation, explain your options, and tell you exactly what compliance looks like for your hire.",
    cta: "Book a Meeting",
  },
  aboutPage: {
    title: "About Us — Iberia Work Force",
    description:
      "Iberia Workforce Solutions helps companies hire, pay and manage people in Spain — an authorised ETT, licensed by the Spanish Ministry of Labour.",
    closeHeading: "Talk to the people who’ll actually handle your account",
    closeBody:
      "Get in touch and you’ll speak with someone who understands both the Spanish legal side and what you’re trying to build.",
  },
  aboutHero: {
    eyebrow: "ABOUT IBERIA WORKFORCE",
    heading: "Your workforce partner in Spain",
    body: "Iberia Workforce Solutions helps companies hire, pay and manage people in Spain — compliantly, flexibly and without the overhead of building their own local operation.",
  },
  aboutStory: {
    heading: "Our story",
    lead:
      "Iberia Workforce started as a conversation between two founders who kept running into the same problem from opposite directions.",
    p1: "One is a lawyer with 30 years of practice in Spain. Over three decades, he’d seen exactly how companies get hiring in Spain wrong, and what it costs them when a workforce provider treats compliance as someone else’s problem.",
    p2: "The other had spent 9 years building EOR operations at scale, learning what actually breaks when a workforce provider grows fast and compliance doesn’t keep up.",
    p3: "That’s how Iberia Workforce became one of Spain’s most compliance-first workforce providers — not as a slogan, but as the reason the company exists.",
  },
  aboutEtt: {
    eyebrow: "LICENSED & AUTHORISED",
    heading: "An authorised ETT, not just an EOR",
    p1: "Iberia Workforce Solutions is an authorised Empresa de Trabajo Temporal (ETT), licensed by the Spanish Ministry of Labour. This authorisation lets us legally employ, supply and manage temporary and outsourced workers in Spain — a legal requirement that a large share of providers in this market don’t actually hold.",
    p2: "For clients, this means the staffing flexibility you need comes with the legal footing to back it up.",
    alt: "An Iberia Workforce specialist standing at her desk in a plant-filled office",
  },
  aboutApproach: {
    heading:
      "Understand your goals. Handle the Spanish complexity. Keep you compliant.",
    body: "That’s the whole approach, whether you’re expanding into Spain for the first time, retaining Spanish talent, or scaling a team up and down with demand. We make it fast, legal, and straightforward — in that order, because fast without legal isn’t actually fast, it’s just risk with a delay on it.",
    alt: "A consultant walking through a bright office corridor, reading from a tablet",
  },
  aboutDelivery: {
    eyebrow: "DELIVERY",
    heading: "What that looks like in practice?",
    items: [
      {
        title: "Compliance first",
        body: "Every contract, filing and payment is done correctly under Spanish law, the first time. No shortcuts, no surprises, no clean-up six months later.",
      },
      {
        title: "Immigration, handled properly",
        body: "Employees relocating from outside Spain go through lawyers who work immigration cases daily, not a generalist account manager reading the rules as they go.",
      },
      {
        title: "Flexibility",
        body: "As an authorised ETT, we can legally scale your workforce up or down as your business needs change, without the workarounds other providers rely on.",
      },
      {
        title: "Partnership",
        body: "One point of contact who actually knows your business, not a rotating queue of support tickets.",
      },
    ],
  },
  contactPage: {
    title: "Contact — Iberia Work Force",
    description:
      "Tell us what you need and we'll put you in touch with the right person on our team in Spain — not a queue.",
  },
  contactIntro: {
    eyebrow: "CONTACT",
    heading: "Let’s talk",
    body: "Tell us what you need and we’ll put you in touch with the right person on our team in Spain — not a queue.",
    commitments: [
      "Reply within one working day",
      "In-house legal and HR team in Spain",
      "No cost, no commitment",
    ],
    whatsappNote: "Fastest reply, 9:00–18:00 CET",
    phoneNote: "Monday to Friday, 9:00–18:00 CET",
    advisorLine: "I read every enquiry that comes through this form.",
    advisorTitle: "Employment Solutions Manager",
    whatsapp: "+34 679 833 405",
    phone: "+34 679 833 405",
    email: "contact@iberiaworkforce.com",
    office: "Madrid Office",
    addressLine1: "Madrid, Spain",
    addressLine2: "Cavall Bernat 27, 1-1 17250 Platja d'Aro",
    nif: "NIF B23977879",
    directions: "Get directions",
  },
  contactProcess: {
    eyebrow: "OUR PROCESS",
    heading: "What happens after you send this",
    footnote:
      "Administrative timelines in Spain depend on the Seguridad Social and the public administration. We quote realistic dates, not optimistic ones.",
    steps: [
      {
        title: "We read your enquiry",
        chip: "Within 1 working day",
        body: "A specialist on our team in Spain reads it. Not a chatbot, not an offshore desk.",
      },
      {
        title: "A 20-minute call",
        chip: "No charge",
        body: "We work out what you actually need: timelines, roles, the applicable convenio colectivo, and where the obligations sit.",
      },
      {
        title: "A written proposal",
        chip: "2–3 working days",
        body: "Costs, realistic timelines and who carries which responsibility, in writing.",
      },
    ],
  },
  contactAlternate: {
    heading: "Would you rather talk first?",
    cta: "Book a 20-minute call",
  },
  servicesPage: {
    title: "Services — Iberia Work Force",
    description:
      "Employer of Record, payroll outsourcing, recruitment, temporary staffing and staff outsourcing across Spain and Europe.",
    h1: "Workforce services across Spain and Europe",
  },
  notFound: {
    title: "Page not found — Iberia Work Force",
    description:
      "The page you were looking for does not exist. Browse our Employer of Record, payroll and workforce services, or get in touch.",
    eyebrow: "ERROR 404",
    heading: "This page doesn’t exist.",
    body: "The link may be out of date, or the address mistyped. Our Employer of Record, payroll, recruitment and staffing pages are all reachable from the menu above — or tell us what you need and we’ll point you to the right place.",
    home: "Back to homepage",
    contact: "Contact us",
  },
};

const es: typeof en = {
  meta: {
    defaultTitle:
      "Iberia Work Force | EOR con licencia ETT en España y Europa",
    defaultDescription:
      "Employer of Record, nóminas y soluciones de personal en 5 países europeos. Con licencia ETT y respaldo de un despacho español.",
    ogImageAlt:
      "Iberia Work Force — soluciones de personal, con 30 años de experiencia.",
  },
  nav: {
    home: "Inicio",
    about: "Nosotros",
    contact: "Contacto",
    services: "Servicios",
    countries: "Países",
    cta: "Solicitar propuesta",
    menu: "Menú",
    homeSr: "Iberia Work Force — inicio",
    primaryAria: "Principal",
    servicesRail: "Categorías de servicios",
    countriesRail: "Países",
    comingSoon: "Próximamente",
  },
  footer: {
    blurb:
      "Conectamos talento excepcional con oportunidades en España y la península ibérica.",
    ettVerify: "ETT autorizada: compruébalo tú mismo",
    authNo: "N.º DE AUTORIZACIÓN",
    nif: "NIF",
    labourAuthority: "AUTORIDAD LABORAL",
    registryHint:
      "En el registro, selecciona «Cataluña» como Autoridad Laboral para encontrarnos — no busques por nombre.",
    getInTouch: "Contacto",
    madrid: "Madrid, España",
    requestProposal: "Solicitar propuesta",
    whatsapp: "Escribir por WhatsApp",
    services: "Servicios",
    company: "Empresa",
    aboutUs: "Nosotros",
    copyright: "© 2026 Iberia Work Force. Todos los derechos reservados.",
    registered: "Registrada en España",
    legal: [
      "Política de privacidad",
      "Política de cookies",
      "Aviso Legal",
      "Términos de servicio",
    ],
  },
  form: {
    heading: "Ponte en contacto",
    body: "Rellena el formulario y nuestros especialistas te responderán.",
    submit: "Enviar mensaje",
    name: "Nombre",
    namePlaceholder: "Introduce tu nombre completo",
    email: "Correo electrónico",
    phone: "Teléfono",
    phoneAria: "Prefijo del país",
    message: "Mensaje",
    messagePlaceholder: "¿En qué podemos ayudarte?",
    words: "palabras",
    honeypot: "Deja este campo vacío",
    required: (field: string) => `${field} es obligatorio.`,
    emailInvalid: "Introduce un correo válido, p. ej. nombre@empresa.com.",
    phoneInvalid: "Introduce un teléfono solo con dígitos.",
    tooShort: (field: string, n: number) =>
      `${field} debe tener al menos ${n} caracteres.`,
    tooLong: (field: string, n: number) =>
      `${field} debe tener ${n} caracteres o menos.`,
    checkField: "Revisa este campo.",
    wordLimit: (n: number) =>
      `Acorta el mensaje a ${n} palabras o menos.`,
    oneField: "Hay un campo que necesita atención.",
    nFields: (n: number) => `${n} campos necesitan atención.`,
    sending: "Enviando…",
    thanks: "Gracias. Hemos recibido tu consulta.",
    fail: "No hemos podido enviar tu consulta. Inténtalo de nuevo.",
    thisField: "Este campo",
  },
  carousel: { prev: "Anterior", next: "Siguiente" },
  lang: {
    change: (current: string) => `Cambiar idioma, actual ${current}`,
    menu: "Idioma",
  },
  hero: {
    heading:
      "Soluciones de personal en España, con 30 años de derecho laboral español.",
    body: "Ayudamos a empresas extranjeras y locales a contratar, pagar y gestionar empleados en España y Europa, con la expertise jurídica que la mayoría de proveedores no tiene.",
    badges: ["Licencia ETT", "Respaldados por un despacho", "5 países europeos"],
    cta: "Habla con un especialista",
    secondary: "Ver servicios",
  },
  ett: {
    eyebrow: "AUTORIZACIÓN OFICIAL Y VERIFICABLE PÚBLICAMENTE",
    heading:
      "El único Employer of Record con licencia ETT oficial en España",
    body: "Somos una Empresa de Trabajo Temporal inscrita en el Ministerio de Trabajo. A diferencia de otros proveedores de EOR, nuestra condición es pública y verificable: ningún otro EOR aparece en el registro oficial.",
    authNo: "N.º DE AUTORIZACIÓN",
    nif: "NIF",
    labourAuthority: "AUTORIDAD LABORAL",
    verifyHeading: "Compruébalo tú mismo",
    verifyBody:
      "Abre el registro del Ministerio de Trabajo (SIGETT), elige «Cataluña», busca — o busca nuestro NIF B23977879. Iberia Workforce Solutions está ahí.",
    verifyCta: "Verificar en el registro oficial",
    verifyFoot:
      "Iberia Workforce Solutions ETT S.L. · Dirección General de Relaciones Laborales de Cataluña",
  },
  services: {
    eyebrow: "IBERIA WORKFORCE",
    heading: "Soluciones de personal en España y Europa",
    eorTitle: "Employer of Record",
    eorBody:
      "Contrata empleados en España y Europa sin constituir una entidad jurídica. Somos el empleador de registro, con licencia ETT y plena conformidad.",
    eorCta: "Ver EOR",
    eorHref: "/employer-of-record",
    payrollTitle: "Externalización de nóminas",
    payrollBody:
      "Nómina española y europea de principio a fin — nómina, TGSS, IRPF y nómina multi-país, gestionada por especialistas en compliance.",
    payrollCta: "Ver nóminas",
    payrollHref: "/payroll-outsourcing",
    cards: [
      {
        title: "Selección de personal",
        description:
          "Búsqueda de talento en España y Europa: contratación y compliance bajo un mismo techo.",
        href: "/recruitment",
        cta: "Ver selección",
      },
      {
        title: "Trabajo temporal",
        description:
          "Plantilla temporal con licencia ETT para picos de temporada y necesidades a corto plazo.",
        href: "/temporary-staffing",
        cta: "Ver trabajo temporal",
      },
      {
        title: "Externalización de personal",
        description:
          "Tu plantilla, gestionada bajo nuestro paraguas legal. Contratos, compliance y administración de RR. HH. de principio a fin.",
        href: "/staff-outsourcing",
        cta: "Ver externalización",
      },
    ],
  },
  differentiators: {
    headingBefore: "Por qué las empresas eligen ",
    headingBrand: "Iberia Workforce",
    headingAfter: "?",
    items: [
      {
        title: "Con licencia ETT.",
        description:
          "La ley española exige una licencia ETT para ceder trabajadores a terceros. La mayoría de proveedores de EOR en España no la tienen — y exponen a sus clientes a un riesgo legal serio. Nosotros sí la tenemos. Ellos no.",
      },
      {
        title: "Respaldados por un despacho español",
        description:
          "Más de 30 años de práctica jurídica española detrás de cada contratación. Abogados laboralistas y de extranjería — no gestores de cuentas que aproximan la normativa.",
      },
      {
        title: "Abogados de extranjería, no coordinadores",
        description:
          "Contrataciones extra-UE, visados no Schengen, permisos de trabajo complejos: los gestionan abogados internos. Asumimos los casos que otros proveedores rechazan.",
      },
      {
        title: "9 años. 10.000 empleados. Probado a escala.",
        description:
          "Construido durante 9 años en los EAU — uno de los entornos más exigentes del mundo en compliance. 10.000 empleados colocados. Esa profundidad la trajimos a España.",
      },
    ],
  },
  process: {
    eyebrow: "CÓMO FUNCIONA",
    headingHtml: "Contrata en España<br />en tres pasos.",
    aria: "Cómo funciona — desplaza para ver más pasos",
    ready: "¿Listo para contratar en Europa sin exposición legal?",
    cta: "Habla con un especialista",
    steps: [
      {
        title: "Cuéntanos a quién necesitas contratar",
        description:
          "Comparte el puesto, la ubicación, la fecha de inicio y si la contratación es UE o extra-UE. Valoramos la estructura adecuada desde el principio.",
        alt: "Dos colegas en un despacho de Madrid revisando un documento juntos",
      },
      {
        title: "Nosotros nos ocupamos de lo legal y el compliance",
        description:
          "Nuestros abogados preparan el contrato, inscriben al empleado en la TGSS y gestionan el visado si hace falta.",
        alt: "Una persona firmando un contrato de trabajo impreso en un escritorio",
      },
      {
        title: "Tu empleado queda incorporado",
        description:
          "Gestionamos la nómina, la administración de RR. HH. continua y seguimos siendo tu empleador legal de registro. Tú gestionas el día a día.",
        alt: "Un nuevo empleado siendo recibido en un espacio de oficinas abierto",
      },
    ],
  },
  geography: {
    eyebrow: "DÓNDE OPERAMOS",
    heading: "España primero. Europa lista.",
    body: "Employer of Record, nóminas y soluciones de personal en 5 países europeos.",
    aria: "Países en los que operamos — desplaza para ver más",
    primary: "Mercado principal",
    countries: [
      { name: "España", alt: "Paisaje urbano de España" },
      { name: "Alemania", alt: "Paisaje urbano de Alemania" },
      { name: "Portugal", alt: "Costa de Portugal" },
      { name: "Polonia", alt: "Paisaje urbano de Polonia" },
      { name: "Italia", alt: "Paisaje urbano de Italia" },
    ],
  },
  pricing: {
    eyebrow: "PRECIOS",
    heading: "Precios transparentes. Sin costes ocultos.",
    body: "EOR en España a tarifa mensual fija. El resto de servicios, presupuesto a medida.",
    planName: "Employer of Record - Iberia EOR",
    unit: "/ empleado / mes",
    note: "Tarifa plana. Sin gastos de alta para contrataciones UE estándar. Sin sorpresas.",
    features: [
      "Contrato de trabajo",
      "Alta en TGSS",
      "Gestión de nómina",
      "Administración de RR. HH. continua",
    ],
    planCta: "Ver detalle de EOR",
    customEyebrow: "Resto de servicios: presupuesto a medida",
    customHeading: "Nómina · Autónomos · Selección · Personal.",
    customBody:
      "El precio depende de la plantilla, el tipo de contrato y el país. Desglose completo antes de cualquier compromiso — sin obligación.",
    customCta: "Habla con un experto",
    footnote:
      "Los servicios de EOR en España suelen situarse entre 300 y 800 €/mes. Nuestra tarifa plana de 299 € no incluye gastos de alta para contrataciones UE estándar.",
  },
  social: {
    eyebrow: "NUESTROS CLIENTES",
    heading: "La confianza de empresas que contratan en Europa",
    aria: "Testimonios de clientes — desplaza para ver más",
    quotes: [
      {
        quote:
          "Necesitábamos contratar en España y Portugal a la vez, pero la mayoría de plataformas de EOR o no sabían gestionar la Ley Beckham o no tenían ni idea de qué es un convenio colectivo. El equipo de Iberia conocía el derecho laboral español al dedillo, nos dio presupuesto en 2 días y estábamos dados de alta en una semana. Mereció la tranquilidad.",
        role: "Head of People, TechScale (Series B)",
        location: "Madrid, España",
      },
      {
        quote:
          "No teníamos entidad en España y nos daba pánico contratar al primer empleado. El riesgo legal parecía enorme. Lo que me convenció fue hablar con su abogada interna, no con un gestor de cuentas. Hizo preguntas sobre permisos de residencia que nuestro EOR anterior ni se planteó. Ahí supe que estábamos en buenas manos.",
        role: "Operations Director, GrowthCo",
        location: "Berlín, Alemania",
      },
      {
        quote:
          "Nuestro empleado quería mudarse a Barcelona y no teníamos presencia allí. Necesitábamos algo rápido, fiable y jurídicamente sólido antes de decir que sí. Iberia lo gestionó todo: visado, nómina, convenio. Nuestro equipo de RR. HH. ahora los usa como referencia para cualquier otro mercado.",
        role: "Senior HR Business Partner, EuroTech",
        location: "Dublín, Irlanda",
      },
    ],
  },
  closing: {
    heading: "¿Listo para contratar en España o Europa sin el riesgo legal?",
    body: "Habla con uno de nuestros abogados laboralistas o especialistas de personal. Valoramos tu situación, te explicamos las opciones y te decimos exactamente cómo es el compliance de tu contratación.",
    cta: "Reservar una reunión",
  },
  aboutPage: {
    title: "Nosotros — Iberia Work Force",
    description:
      "Iberia Workforce Solutions ayuda a las empresas a contratar, pagar y gestionar personas en España — una ETT autorizada por el Ministerio de Trabajo.",
    closeHeading: "Habla con quienes realmente llevarán tu cuenta",
    closeBody:
      "Ponte en contacto y hablarás con alguien que entiende tanto el lado legal español como lo que estás construyendo.",
  },
  aboutHero: {
    eyebrow: "SOBRE IBERIA WORKFORCE",
    heading: "Tu socio de personal en España",
    body: "Iberia Workforce Solutions ayuda a las empresas a contratar, pagar y gestionar personas en España — con conformidad, flexibilidad y sin el coste de montar su propia operación local.",
  },
  aboutStory: {
    heading: "Nuestra historia",
    lead:
      "Iberia Workforce nació de una conversación entre dos fundadores que se encontraban con el mismo problema desde direcciones opuestas.",
    p1: "Uno es abogado con 30 años de ejercicio en España. En tres décadas había visto exactamente cómo las empresas se equivocan al contratar en España, y lo que les cuesta cuando un proveedor de personal trata el compliance como problema de otro.",
    p2: "El otro había pasado 9 años construyendo operaciones de EOR a escala, aprendiendo qué se rompe de verdad cuando un proveedor crece rápido y el compliance no sigue el ritmo.",
    p3: "Así Iberia Workforce se convirtió en uno de los proveedores de personal más centrados en el compliance de España — no como eslogan, sino como razón de ser de la empresa.",
  },
  aboutEtt: {
    eyebrow: "LICENCIA Y AUTORIZACIÓN",
    heading: "Una ETT autorizada, no solo un EOR",
    p1: "Iberia Workforce Solutions es una Empresa de Trabajo Temporal (ETT) autorizada por el Ministerio de Trabajo. Esta autorización nos permite contratar, ceder y gestionar legalmente a trabajadores temporales y externalizados en España — un requisito legal que una parte importante de los proveedores de este mercado no tiene.",
    p2: "Para los clientes, eso significa que la flexibilidad de personal que necesitas viene con el respaldo legal para sostenerla.",
    alt: "Una especialista de Iberia Workforce de pie en su escritorio, en una oficina llena de plantas",
  },
  aboutApproach: {
    heading:
      "Entender tus objetivos. Gestionar la complejidad española. Mantenerte conforme.",
    body: "Ese es todo el enfoque, tanto si te expandes a España por primera vez, retienes talento español o escalas un equipo según la demanda. Lo hacemos rápido, legal y sencillo — en ese orden, porque rápido sin legal no es rápido: es riesgo con retraso.",
    alt: "Un consultor caminando por un pasillo de oficina luminoso, leyendo una tableta",
  },
  aboutDelivery: {
    eyebrow: "ENTREGA",
    heading: "¿Cómo se traduce eso en la práctica?",
    items: [
      {
        title: "Compliance primero",
        body: "Cada contrato, presentación y pago se hace bien a la primera, conforme a la ley española. Sin atajos, sin sorpresas, sin arreglos seis meses después.",
      },
      {
        title: "Extranjería, bien hecha",
        body: "Los empleados que se relocan desde fuera de España pasan por abogados que llevan casos de extranjería a diario, no por un gestor generalista leyendo las normas sobre la marcha.",
      },
      {
        title: "Flexibilidad",
        body: "Como ETT autorizada, podemos ampliar o reducir tu plantilla de forma legal cuando cambian las necesidades del negocio, sin los apaños que usan otros proveedores.",
      },
      {
        title: "Colaboración",
        body: "Un único interlocutor que conoce tu negocio de verdad, no una cola rotatoria de tickets de soporte.",
      },
    ],
  },
  contactPage: {
    title: "Contacto — Iberia Work Force",
    description:
      "Cuéntanos qué necesitas y te pondremos en contacto con la persona adecuada de nuestro equipo en España — no con una cola.",
  },
  contactIntro: {
    eyebrow: "CONTACTO",
    heading: "Hablemos",
    body: "Cuéntanos qué necesitas y te pondremos en contacto con la persona adecuada de nuestro equipo en España — no con una cola.",
    commitments: [
      "Respuesta en un día laborable",
      "Equipo jurídico y de RR. HH. en España",
      "Sin coste, sin compromiso",
    ],
    whatsappNote: "Respuesta más rápida, 9:00–18:00 CET",
    phoneNote: "De lunes a viernes, 9:00–18:00 CET",
    advisorLine: "Leo cada consulta que llega por este formulario.",
    advisorTitle: "Responsable de soluciones de empleo",
    whatsapp: "+34 679 833 405",
    phone: "+34 679 833 405",
    email: "contact@iberiaworkforce.com",
    office: "Oficina de Madrid",
    addressLine1: "Madrid, España",
    addressLine2: "Cavall Bernat 27, 1-1 17250 Platja d'Aro",
    nif: "NIF B23977879",
    directions: "Cómo llegar",
  },
  contactProcess: {
    eyebrow: "NUESTRO PROCESO",
    heading: "Qué ocurre después de enviarlo",
    footnote:
      "Los plazos administrativos en España dependen de la Seguridad Social y de la administración pública. Cotizamos fechas realistas, no optimistas.",
    steps: [
      {
        title: "Leemos tu consulta",
        chip: "En 1 día laborable",
        body: "La lee un especialista de nuestro equipo en España. No un chatbot ni un escritorio en el extranjero.",
      },
      {
        title: "Una llamada de 20 minutos",
        chip: "Sin cargo",
        body: "Aclaramos lo que realmente necesitas: plazos, puestos, el convenio colectivo aplicable y dónde recaen las obligaciones.",
      },
      {
        title: "Una propuesta por escrito",
        chip: "2–3 días laborables",
        body: "Costes, plazos realistas y quién asume cada responsabilidad, por escrito.",
      },
    ],
  },
  contactAlternate: {
    heading: "¿Prefieres hablar primero?",
    cta: "Reservar una llamada de 20 minutos",
  },
  servicesPage: {
    title: "Servicios — Iberia Work Force",
    description:
      "Employer of Record, externalización de nóminas, selección, trabajo temporal y externalización de personal en España y Europa.",
    h1: "Servicios de personal en España y Europa",
  },
  notFound: {
    title: "Página no encontrada — Iberia Work Force",
    description:
      "La página que buscabas no existe. Consulta nuestros servicios de Employer of Record, nóminas y personal, o ponte en contacto.",
    eyebrow: "ERROR 404",
    heading: "Esta página no existe.",
    body: "El enlace puede estar desactualizado o la dirección mal escrita. Las páginas de Employer of Record, nóminas, selección y personal están en el menú de arriba — o cuéntanos qué necesitas y te indicamos el sitio.",
    home: "Volver al inicio",
    contact: "Contactar",
  },
};

export const messages: Record<Locale, typeof en> = { en, es };

export function getUi(pathname: string) {
  const lang = getLocale(pathname);
  return { lang, t: messages[lang] };
}
