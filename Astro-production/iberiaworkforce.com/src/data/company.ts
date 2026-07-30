// Central company details. Update contact fields when confirmed.
export const company = {
  legalName: 'Iberia Workforce Solutions ETT SL', // full legal entity, as in the ETT register
  brandName: 'Iberia Workforce Solutions',        // brand name used in display/marketing copy
  shortName: 'Iberia Workforce',
  domain: 'iberiaworkforce.com',
  url: 'https://iberiaworkforce.com',

  // TODO: confirm final contact details before launch.
  email: 'info@iberiaworkforce.com',
  phone: '+34 638 572 250',
  phoneHref: '+34638572250',
  whatsapp: '34638572250',
  addressCity: 'Madrid',
  addressCountry: 'Spain',

  // Regulatory credential — surfaced across the site.
  ettAuthority: {
    en: 'Authorised Empresa de Trabajo Temporal (ETT) by the Spanish Ministry of Labour',
    es: 'Empresa de Trabajo Temporal (ETT) autorizada por el Ministerio de Trabajo de España',
  },

  // Official ETT authorisation — publicly verifiable in the Ministry of Labour's SIGETT registry.
  ett: {
    registryName: 'Iberia Workforce Solutions ETT SL', // exact name as listed in the registry
    authNumber: '69/0049/26',
    nif: 'B23977879',
    authority: {
      en: 'Cataluña — Dirección General de Relaciones Laborales y Calidad en el Trabajo',
      es: 'Cataluña — Dirección General de Relaciones Laborales y Calidad en el Trabajo',
    },
    region: 'Cataluña',
    registryUrl: 'https://expinterweb.mites.gob.es/sigett/consultaPublicaETT',
  },
} as const;
