import type { Lang } from './config';

// Shared UI + page copy per language. Service copy lives in ../data/services.ts.
export const t = {
  en: {
    langName: 'English',
    dir: 'ltr',
    nav: {
      home: 'Home',
      services: 'Services',
      about: 'About us',
      contact: 'Contact',
      cta: 'Get a quote',
    },
    footer: {
      tagline: 'Workforce, payroll and compliance solutions across Spain.',
      servicesTitle: 'Services',
      companyTitle: 'Company',
      contactTitle: 'Contact',
      rights: 'All rights reserved.',
      builtIn: 'Serving companies hiring and operating in Spain.',
      ett: {
        title: 'Officially authorised ETT — verify us',
        authLabel: 'Authorisation No.',
        nifLabel: 'NIF',
        authorityLabel: 'Labour authority',
        verify: 'Verify here',
        note: 'In the registry, select “Cataluña” as the Autoridad Laboral to find us — please do not search by name.',
      },
    },
    common: {
      learnMore: 'Learn more',
      allServices: 'All services',
      talkToUs: 'Talk to us',
      getStarted: 'Get started',
      spainOnly: 'Spain-focused',
    },
    home: {
      metaTitle: 'Iberia Workforce Solutions — EOR, Payroll & Compliance in Spain',
      metaDescription:
        'Iberia Workforce Solutions: Employer of Record, payroll, labour & legal, compliance and staff outsourcing in Spain. Authorised ETT by Spain’s Ministry of Labour.',
      heroEyebrow: 'Workforce solutions in Spain',
      heroTitle: 'Hire, pay and manage your workforce in Spain — fully compliant.',
      heroSubtitle:
        'Iberia Workforce Solutions is your single partner for employment in Spain: Employer of Record, payroll, labour & legal advisory, compliance and staff outsourcing. Authorised Empresa de Trabajo Temporal (ETT) by the Spanish Ministry of Labour.',
      heroPrimary: 'Get a free consultation',
      heroSecondary: 'Explore services',
      trustTitle: 'Why companies choose Iberia Workforce',
      trust: [
        { title: 'Authorised ETT', text: 'Regulated as an Empresa de Trabajo Temporal by the Spanish Ministry of Labour — legal, temporary and outsourced staffing done right.' },
        { title: 'Spain specialists', text: 'We do one thing well: the Spanish workforce. Deep knowledge of Spanish labour law, convenios and Seguridad Social.' },
        { title: 'One accountable partner', text: 'Employment, payroll, legal and compliance under one roof, with a single point of contact.' },
        { title: 'Fast and compliant', text: 'Employees on the ground in days, not months — with full compliance from day one.' },
      ],
      servicesEyebrow: 'What we do',
      servicesTitle: 'Complete workforce solutions in Spain',
      servicesIntro:
        'Everything you need to hire and manage people in Spain, without setting up your own entity or in-house HR.',
      statsTitle: 'Built for expanding in Spain',
      stats: [
        { value: 'Days', label: 'to a compliant hire in Spain' },
        { value: 'ETT', label: 'authorised by the Ministry of Labour' },
        { value: '100%', label: 'Spanish labour-law compliance' },
        { value: '1', label: 'partner for your whole workforce' },
      ],
      ctaTitle: 'Ready to build your team in Spain?',
      ctaText: 'Tell us what you need and we will show you the fastest compliant way to do it.',
      verify: {
        eyebrow: 'Officially authorised & publicly verifiable',
        title: 'The only Employer of Record with an official Spanish ETT licence',
        text: 'Iberia Workforce Solutions is a registered Empresa de Trabajo Temporal (ETT), authorised by the Spanish Ministry of Labour. Unlike other EOR providers, our authorisation is public and verifiable — no other EOR appears in the official government register.',
        authLabel: 'Authorisation No.',
        nifLabel: 'NIF',
        authorityLabel: 'Labour authority',
        howTitle: 'Verify it yourself',
        howText: 'Open the Ministry of Labour’s public ETT registry (SIGETT), choose “Cataluña” as the Autoridad Laboral — or search our NIF B23977879 — and you will find Iberia Workforce Solutions ETT SL listed.',
        button: 'Verify in the official government registry',
        sealTitle: 'Officially registered ETT',
        sealAuthority: 'Spanish Ministry of Labour',
        viewRegistryShort: 'View in the official registry',
        screenshotAlt: 'Iberia Workforce Solutions ETT SL listed in the Spanish Ministry of Labour ETT registry (SIGETT)',
        screenshotCaption: 'Our entry in the Ministry of Labour’s official ETT registry',
      },
    },
    about: {
      metaTitle: 'About Iberia Workforce Solutions | Authorised ETT in Spain',
      metaDescription:
        'Iberia Workforce Solutions is an authorised Empresa de Trabajo Temporal (ETT) by the Spanish Ministry of Labour, providing EOR, payroll and compliance across Spain.',
      eyebrow: 'About us',
      title: 'Your workforce partner in Spain',
      lead:
        'Iberia Workforce Solutions helps companies hire, pay and manage people in Spain — compliantly, flexibly and without the overhead of building their own local operation.',
      body: [
        'We are a Spanish company focused entirely on the workforce in Spain. From Employer of Record and payroll to labour and legal advisory, compliance and staff outsourcing, we give international and domestic businesses one trusted partner for everything related to employing people in Spain.',
        'Iberia Workforce Solutions is an authorised Empresa de Trabajo Temporal (ETT), authorised by the Spanish Ministry of Labour. This authorisation means we can legally employ, supply and manage temporary and outsourced workers in Spain — giving our clients flexible, fully-compliant staffing they can rely on.',
        'Our approach is simple: understand your goals, handle the Spanish complexity, and keep you compliant at every step. Whether you are expanding into Spain, retaining Spanish talent, or scaling a local team up and down, we make it fast, legal and straightforward.',
      ],
      valuesTitle: 'What we stand for',
      values: [
        { title: 'Compliance first', text: 'Every contract, filing and payment is done correctly under Spanish law. No shortcuts, no surprises.' },
        { title: 'Spain expertise', text: 'We know Spanish labour law, collective agreements and Seguridad Social inside out.' },
        { title: 'Flexibility', text: 'As an authorised ETT we scale your workforce up or down as your business needs change.' },
        { title: 'Partnership', text: 'A single, responsive point of contact who understands your business and your goals.' },
      ],
      credentialTitle: 'Authorised & regulated',
      credentialText:
        'Iberia Workforce Solutions ETT SL operates as an authorised Empresa de Trabajo Temporal (ETT) under the supervision of the Spanish Ministry of Labour, ensuring every engagement meets Spain’s legal standards for employment and temporary staffing.',
    },
    contact: {
      metaTitle: 'Contact Iberia Workforce Solutions | Workforce Services in Spain',
      metaDescription:
        'Contact Iberia Workforce Solutions for Employer of Record, payroll, compliance and staff outsourcing in Spain. Get a free, no-obligation consultation.',
      eyebrow: 'Contact us',
      title: 'Let’s talk about your workforce in Spain',
      lead:
        'Tell us what you need — hiring, payroll, compliance or flexible staffing — and we will get back to you quickly with the right solution.',
      infoTitle: 'Contact details',
      emailLabel: 'Email',
      phoneLabel: 'Phone',
      whatsappLabel: 'WhatsApp',
      locationLabel: 'Based in',
      form: {
        name: 'Full name',
        email: 'Email',
        phone: 'Phone',
        company: 'Company',
        service: 'Service of interest',
        servicePlaceholder: 'Select a service',
        serviceGeneral: 'General enquiry',
        message: 'How can we help?',
        submit: 'Send enquiry',
        sending: 'Sending…',
        success: 'Thank you — your enquiry has been sent. We will be in touch shortly.',
        error: 'Sorry, something went wrong. Please try again or email us directly.',
        required: 'Please add your name and an email or phone number.',
        consent: 'By submitting this form you agree to be contacted about your enquiry.',
      },
    },
    services: {
      metaTitle: 'Services — EOR, Payroll, Legal & Compliance in Spain | Iberia Workforce',
      metaDescription:
        'Workforce services in Spain: Employer of Record, payroll, labour & legal advisory, compliance and staff outsourcing. One compliant partner for your Spanish team.',
      eyebrow: 'Our services',
      title: 'Workforce services in Spain',
      lead:
        'Five connected services that cover the entire lifecycle of employing people in Spain — from hiring your first employee to running a flexible, compliant team.',
    },
  },

  es: {
    langName: 'Español',
    dir: 'ltr',
    nav: {
      home: 'Inicio',
      services: 'Servicios',
      about: 'Nosotros',
      contact: 'Contacto',
      cta: 'Solicita presupuesto',
    },
    footer: {
      tagline: 'Soluciones de personal, nóminas y compliance en toda España.',
      servicesTitle: 'Servicios',
      companyTitle: 'Empresa',
      contactTitle: 'Contacto',
      rights: 'Todos los derechos reservados.',
      builtIn: 'Al servicio de empresas que contratan y operan en España.',
      ett: {
        title: 'ETT autorizada oficialmente — verifícanos',
        authLabel: 'Nº de autorización',
        nifLabel: 'NIF',
        authorityLabel: 'Autoridad laboral',
        verify: 'Verificar aquí',
        note: 'En el registro, selecciona “Cataluña” como Autoridad Laboral para encontrarnos — por favor, no busques por nombre.',
      },
    },
    common: {
      learnMore: 'Saber más',
      allServices: 'Todos los servicios',
      talkToUs: 'Hablemos',
      getStarted: 'Empezar',
      spainOnly: 'Especialistas en España',
    },
    home: {
      metaTitle: 'Iberia Workforce Solutions — EOR, Nóminas y Compliance en España',
      metaDescription:
        'Iberia Workforce Solutions: EOR, nóminas, asesoría laboral, compliance y externalización de personal en España. ETT autorizada por el Ministerio de Trabajo.',
      heroEyebrow: 'Soluciones de personal en España',
      heroTitle: 'Contrata, paga y gestiona a tu personal en España, con total conformidad.',
      heroSubtitle:
        'Iberia Workforce Solutions es tu socio único para el empleo en España: Employer of Record, nóminas, asesoría laboral y legal, compliance y externalización de personal. Empresa de Trabajo Temporal (ETT) autorizada por el Ministerio de Trabajo de España.',
      heroPrimary: 'Solicita una consulta gratuita',
      heroSecondary: 'Ver servicios',
      trustTitle: 'Por qué las empresas eligen Iberia Workforce',
      trust: [
        { title: 'ETT autorizada', text: 'Regulada como Empresa de Trabajo Temporal por el Ministerio de Trabajo de España: trabajo temporal y externalizado, bien hecho.' },
        { title: 'Especialistas en España', text: 'Hacemos bien una sola cosa: el empleo en España. Profundo conocimiento del derecho laboral, los convenios y la Seguridad Social.' },
        { title: 'Un único socio responsable', text: 'Contratación, nóminas, asesoría legal y compliance bajo un mismo techo, con un único punto de contacto.' },
        { title: 'Rápido y conforme', text: 'Empleados sobre el terreno en días, no en meses, con plena conformidad desde el primer día.' },
      ],
      servicesEyebrow: 'Qué hacemos',
      servicesTitle: 'Soluciones integrales de personal en España',
      servicesIntro:
        'Todo lo que necesitas para contratar y gestionar personas en España, sin crear tu propia entidad ni un departamento de RR. HH. interno.',
      statsTitle: 'Pensado para crecer en España',
      stats: [
        { value: 'Días', label: 'para una contratación conforme en España' },
        { value: 'ETT', label: 'autorizada por el Ministerio de Trabajo' },
        { value: '100%', label: 'conformidad con el derecho laboral español' },
        { value: '1', label: 'socio para toda tu plantilla' },
      ],
      ctaTitle: '¿Listo para crear tu equipo en España?',
      ctaText: 'Cuéntanos qué necesitas y te mostraremos la forma más rápida y conforme de conseguirlo.',
      verify: {
        eyebrow: 'Autorización oficial y verificable públicamente',
        title: 'El único Employer of Record con licencia oficial de ETT en España',
        text: 'Iberia Workforce Solutions es una Empresa de Trabajo Temporal (ETT) registrada y autorizada por el Ministerio de Trabajo de España. A diferencia de otros proveedores de EOR, nuestra autorización es pública y verificable: ningún otro EOR figura en el registro oficial.',
        authLabel: 'Nº de autorización',
        nifLabel: 'NIF',
        authorityLabel: 'Autoridad laboral',
        howTitle: 'Compruébalo tú mismo',
        howText: 'Entra en el registro público de ETT del Ministerio de Trabajo (SIGETT), selecciona “Cataluña” como Autoridad Laboral —o busca nuestro NIF B23977879— y encontrarás a Iberia Workforce Solutions ETT SL en el listado.',
        button: 'Verificar en el registro oficial del Gobierno',
        sealTitle: 'ETT registrada oficialmente',
        sealAuthority: 'Ministerio de Trabajo de España',
        viewRegistryShort: 'Ver en el registro oficial',
        screenshotAlt: 'Iberia Workforce Solutions ETT SL en el registro de ETT del Ministerio de Trabajo (SIGETT)',
        screenshotCaption: 'Nuestra inscripción en el registro oficial de ETT del Ministerio de Trabajo',
      },
    },
    about: {
      metaTitle: 'Sobre Iberia Workforce Solutions | ETT autorizada en España',
      metaDescription:
        'Iberia Workforce Solutions es una Empresa de Trabajo Temporal (ETT) autorizada por el Ministerio de Trabajo de España, con servicios de EOR, nóminas y compliance.',
      eyebrow: 'Nosotros',
      title: 'Tu socio de personal en España',
      lead:
        'Iberia Workforce Solutions ayuda a las empresas a contratar, pagar y gestionar personas en España, con conformidad, flexibilidad y sin la carga de montar su propia operación local.',
      body: [
        'Somos una empresa española centrada por completo en el empleo en España. Desde Employer of Record y nóminas hasta asesoría laboral y legal, compliance y externalización de personal, ofrecemos a empresas internacionales y nacionales un único socio de confianza para todo lo relacionado con emplear personas en España.',
        'Iberia Workforce Solutions es una Empresa de Trabajo Temporal (ETT) autorizada por el Ministerio de Trabajo de España. Esta autorización nos permite contratar, ceder y gestionar legalmente a trabajadores temporales y externalizados en España, ofreciendo a nuestros clientes un personal flexible y plenamente conforme en el que confiar.',
        'Nuestro enfoque es sencillo: entender tus objetivos, gestionar la complejidad española y mantenerte conforme en cada paso. Tanto si te expandes a España, retienes talento español o amplías y reduces un equipo local, lo hacemos rápido, legal y sencillo.',
      ],
      valuesTitle: 'Lo que defendemos',
      values: [
        { title: 'Compliance primero', text: 'Cada contrato, presentación y pago se realiza correctamente conforme a la ley española. Sin atajos ni sorpresas.' },
        { title: 'Experiencia en España', text: 'Conocemos a fondo el derecho laboral español, los convenios colectivos y la Seguridad Social.' },
        { title: 'Flexibilidad', text: 'Como ETT autorizada, ampliamos o reducimos tu plantilla según cambien las necesidades de tu negocio.' },
        { title: 'Colaboración', text: 'Un único punto de contacto, ágil y cercano, que entiende tu negocio y tus objetivos.' },
      ],
      credentialTitle: 'Autorizada y regulada',
      credentialText:
        'Iberia Workforce Solutions ETT SL opera como Empresa de Trabajo Temporal (ETT) autorizada bajo la supervisión del Ministerio de Trabajo de España, garantizando que cada colaboración cumple los estándares legales españoles de empleo y trabajo temporal.',
    },
    contact: {
      metaTitle: 'Contacto Iberia Workforce Solutions | Servicios de personal en España',
      metaDescription:
        'Contacta con Iberia Workforce Solutions para Employer of Record, nóminas, compliance y externalización de personal en España. Consulta gratuita y sin compromiso.',
      eyebrow: 'Contacto',
      title: 'Hablemos de tu personal en España',
      lead:
        'Cuéntanos qué necesitas —contratación, nóminas, compliance o personal flexible— y te responderemos rápidamente con la solución adecuada.',
      infoTitle: 'Datos de contacto',
      emailLabel: 'Correo',
      phoneLabel: 'Teléfono',
      whatsappLabel: 'WhatsApp',
      locationLabel: 'Ubicación',
      form: {
        name: 'Nombre completo',
        email: 'Correo electrónico',
        phone: 'Teléfono',
        company: 'Empresa',
        service: 'Servicio de interés',
        servicePlaceholder: 'Selecciona un servicio',
        serviceGeneral: 'Consulta general',
        message: '¿Cómo podemos ayudarte?',
        submit: 'Enviar consulta',
        sending: 'Enviando…',
        success: 'Gracias — tu consulta se ha enviado. Nos pondremos en contacto en breve.',
        error: 'Lo sentimos, algo ha fallado. Inténtalo de nuevo o escríbenos directamente.',
        required: 'Añade tu nombre y un correo o teléfono.',
        consent: 'Al enviar este formulario aceptas ser contactado en relación con tu consulta.',
      },
    },
    services: {
      metaTitle: 'Servicios — EOR, Nóminas, Legal y Compliance en España | Iberia Workforce',
      metaDescription:
        'Servicios de personal en España: Employer of Record, nóminas, asesoría laboral y legal, compliance y externalización de personal. Un único socio conforme para tu equipo.',
      eyebrow: 'Nuestros servicios',
      title: 'Servicios de personal en España',
      lead:
        'Cinco servicios conectados que cubren todo el ciclo de emplear personas en España, desde tu primera contratación hasta gestionar un equipo flexible y conforme.',
    },
  },
} as const;

export type Dict = (typeof t)[Lang];
export function dict(lang: Lang): Dict {
  return t[lang];
}
