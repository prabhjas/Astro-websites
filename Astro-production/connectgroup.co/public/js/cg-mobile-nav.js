/**
 * Connect Group mobile accordion nav (≤991px).
 * Desktop mega menu stays as-is; this replaces Max Mega Menu on mobile.
 */
(function () {
  var BP = 991;
  var STYLE_ID = 'cg-mobile-nav-css';
  var ROOT_ID = 'cg-mnav';

  var SERVICES = [
    {
      label: 'Business Setup',
      overview: { href: '/business-formation-uae/', label: 'BUSINESS SETUP' },
      items: [
        {
          title: 'UAE Free Zone',
          desc: 'Establish your company in a tax-efficient free zone',
          href: '/uae-freezone-company-setup/',
        },
        {
          title: 'UAE Mainland',
          desc: 'Set up your business on the UAE mainland',
          href: '/uae-mainland-company-setup/',
        },
        {
          title: 'UAE Offshore',
          desc: 'Register your offshore company in the UAE',
          href: '/dubai-offshore/',
        },
        {
          title: 'PRO Services',
          desc: 'Government liaison and document processing services',
          href: '/pro-services/',
        },
      ],
    },
    {
      label: 'Global Workforce Solutions',
      overview: { href: '/global-workforce-solutions/', label: 'GLOBAL WORKFORCE SOLUTIONS' },
      items: [
        {
          title: 'EOR (Employer of Record)',
          desc: 'Hire globally without a local entity',
          href: '/employer-of-record/',
        },
        {
          title: 'PEO (Professional Employer Organization)',
          desc: 'Co-employment with full HR support',
          href: '/professional-employer-organization-uae/',
        },
        {
          title: 'Contractor Hire',
          desc: 'Engage contractors compliantly, anywhere',
          href: '/contractor-hire/',
        },
        {
          title: 'Remote Workers',
          desc: 'Build and manage distributed global teams',
          href: '/remote-workers-hire/',
        },
        {
          title: 'Hire Staff Outsourcing',
          desc: 'Delegate staffing and placement to us',
          href: '/staff-outsourcing/',
        },
      ],
    },
    {
      label: 'Visa Services',
      overview: { href: '/visa-services/', label: 'VISA SERVICES' },
      items: [
        {
          title: 'Immigration Service',
          desc: 'End-to-end visa and work permit assistance',
          href: '/immigration-services-in-uae/',
        },
        {
          title: 'Freelance Visa',
          desc: 'Obtain your freelance visa and work independently',
          href: '/freelance-visa/',
        },
      ],
    },
    {
      label: 'HR Services',
      overview: { href: '/hr-services/', label: 'HR SERVICES' },
      items: [
        {
          title: 'HR Services',
          desc: 'Comprehensive HR support for your workforce',
          href: '/hr-services/',
        },
        {
          title: 'HR Software',
          desc: 'Streamline HR operations with smart tools',
          href: '/hr-payroll-software-uae/',
        },
        {
          title: 'HR Outsourcing',
          desc: 'Delegate your HR functions to our experts',
          href: '/hr-outsourcing/',
        },
        {
          title: 'Payroll Outsourcing in Dubai',
          desc: 'Accurate and compliant payroll management',
          href: '/payroll-outsourcing/',
        },
      ],
    },
  ];

  var BRANDS = [
    { title: 'Connect Resources', href: '/connect-resources/' },
    { title: 'Connect Freelance', href: '/connect-freelance/' },
    { title: 'Connect HR', href: '/connect-hr/' },
    { title: 'Connect Staff', href: '/connect-staff/' },
    { title: 'C-UAE', href: '/c-uae/' },
    { title: 'Kinza HR', href: '/kinza-hr/' },
    { title: 'NG Manpower', href: '/ngmanpower/' },
    { title: 'KPM Pro', href: '/kpm-pro/' },
    { title: 'Royal Visa', href: '/royal-visa/' },
    { title: 'Iberia EOR', href: '/iberiaeor/' },
    { title: 'Connect Resources Saudi', href: '/connect-resources-ksa/' },
    { title: 'Connect Legal', href: '/connect-legal/' },
  ];

  function ensureCss() {
    if (document.getElementById(STYLE_ID)) return;
    var link = document.createElement('link');
    link.id = STYLE_ID;
    link.rel = 'stylesheet';
    link.href = '/chrome/mobile-nav.css';
    document.head.appendChild(link);
  }

  function pathNorm(pathname) {
    var p = String(pathname || '/').replace(/\/+$/, '') || '/';
    return p.toLowerCase();
  }

  function isActiveHref(href) {
    return pathNorm(window.location.pathname) === pathNorm(href);
  }

  function cardHtml(item) {
    var active = isActiveHref(item.href) ? ' is-active' : '';
    return (
      '<a class="cg-mnav__card' +
      active +
      '" href="' +
      item.href +
      '">' +
      '<span class="cg-mnav__card-title">' +
      item.title +
      '</span>' +
      '<span class="cg-mnav__card-desc">' +
      item.desc +
      '</span>' +
      '</a>'
    );
  }

  function serviceGroupHtml(group) {
    var cards = group.items.map(cardHtml).join('');
    return (
      '<li class="cg-mnav__item cg-mnav__item--nested">' +
      '<button type="button" class="cg-mnav__toggle" aria-expanded="false">' +
      group.label +
      '</button>' +
      '<div class="cg-mnav__leaf">' +
      '<div class="cg-mnav__section-head">' +
      '<span class="cg-mnav__section-label">' +
      group.overview.label +
      '</span>' +
      '<a class="cg-mnav__overview" href="' +
      group.overview.href +
      '">Explore Overview →</a>' +
      '</div>' +
      cards +
      '</div>' +
      '</li>'
    );
  }

  function brandsHtml() {
    return BRANDS.map(function (b) {
      return '<a class="cg-mnav__brand-link" href="' + b.href + '">' + b.title + '</a>';
    }).join('');
  }

  function buildHtml() {
    var servicesInner = SERVICES.map(serviceGroupHtml).join('');
    return (
      '<nav class="cg-mnav" id="' +
      ROOT_ID +
      '" hidden aria-hidden="true">' +
      '<div class="cg-mnav__backdrop"></div>' +
      '<div class="cg-mnav__shell" role="dialog" aria-modal="true" aria-label="Site menu">' +
      '<div class="cg-mnav__header">' +
      '<a class="cg-mnav__logo" href="/" aria-label="Connect Group home">' +
      '<img src="/wp-content/uploads/2025/09/Connect-Group-White.svg" width="118" height="36" alt="Connect Group" />' +
      '</a>' +
      '<div class="cg-mnav__header-actions">' +
      '<a class="cg-mnav__cta" href="/contact-us/">Let’s Talk</a>' +
      '<button type="button" class="cg-mnav__burger" data-cg-mnav-close="1" aria-label="Close menu">' +
      '<span></span><span></span><span></span>' +
      '</button>' +
      '</div>' +
      '</div>' +
      '<div class="cg-mnav__panel">' +
      '<ul class="cg-mnav__list">' +
      '<li class="cg-mnav__item"><a class="cg-mnav__link" href="/">Home</a></li>' +
      '<li class="cg-mnav__item cg-mnav__item--has">' +
      '<button type="button" class="cg-mnav__toggle" aria-expanded="false">Services</button>' +
      '<ul class="cg-mnav__sub">' +
      servicesInner +
      '</ul>' +
      '</li>' +
      '<li class="cg-mnav__item cg-mnav__item--has">' +
      '<button type="button" class="cg-mnav__toggle" aria-expanded="false">Our Brands</button>' +
      '<div class="cg-mnav__leaf">' +
      brandsHtml() +
      '</div>' +
      '</li>' +
      '<li class="cg-mnav__item"><a class="cg-mnav__link" href="/insights/">Insights</a></li>' +
      '<li class="cg-mnav__item"><a class="cg-mnav__link" href="/about-us/">About Us</a></li>' +
      '<li class="cg-mnav__item"><a class="cg-mnav__link" href="/contact-us/">Contact Us</a></li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '</nav>'
    );
  }

  function isMobile() {
    return window.matchMedia('(max-width: ' + BP + 'px)').matches;
  }

  function setOpen(root, open) {
    if (!root) return;
    root.classList.toggle('is-open', open);
    root.hidden = !open;
    root.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('cg-mnav-open', open);

    var toggleBtn = document.querySelector(
      '#mega-menu-wrap-max_mega_menu_1 .mega-toggle-block button, #mega-menu-wrap-max_mega_menu_1 .mega-menu-toggle',
    );
    if (toggleBtn && toggleBtn.setAttribute) {
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // Keep Max Mega Menu from fighting us
    var wrap = document.getElementById('mega-menu-wrap-max_mega_menu_1');
    if (wrap) {
      wrap.classList.toggle('mega-menu-open', false);
    }
  }

  function closeSiblingItems(item) {
    var parent = item.parentElement;
    if (!parent) return;
    parent.querySelectorAll(':scope > .cg-mnav__item.is-open').forEach(function (sib) {
      if (sib !== item) {
        sib.classList.remove('is-open');
        var btn = sib.querySelector(':scope > .cg-mnav__toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function bindAccordion(root) {
    root.addEventListener('click', function (e) {
      var closeEl = e.target.closest('[data-cg-mnav-close]');
      if (closeEl) {
        setOpen(root, false);
        return;
      }

      var toggle = e.target.closest('.cg-mnav__toggle');
      if (!toggle || !root.contains(toggle)) return;
      e.preventDefault();
      var item = toggle.closest('.cg-mnav__item');
      if (!item) return;
      var willOpen = !item.classList.contains('is-open');
      closeSiblingItems(item);
      item.classList.toggle('is-open', willOpen);
      toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  }

  function bindHeaderToggle(root) {
    var wrap = document.getElementById('mega-menu-wrap-max_mega_menu_1');
    if (!wrap || wrap.dataset.cgMnavBound === '1') return;
    wrap.dataset.cgMnavBound = '1';

    wrap.addEventListener(
      'click',
      function (e) {
        if (!isMobile()) return;
        var t = e.target.closest('.mega-menu-toggle, .mega-toggle-block, .mega-toggle-block button');
        if (!t) return;
        e.preventDefault();
        e.stopPropagation();
        setOpen(root, !root.classList.contains('is-open'));
      },
      true,
    );
  }

  function ensureClosedHeaderCta() {
    var header =
      document.querySelector('header.elementor-location-header') ||
      document.querySelector('.elementor-27130.elementor-location-header') ||
      document.querySelector('.header-new');
    if (!header) return;

    var existing =
      header.querySelector('a.cg-header-cta') ||
      header.querySelector('.elementor-element-1f0a7d0 a.elementor-button') ||
      header.querySelector('.elementor-element-6e85cb3 a.elementor-button');

    var toggleWrap =
      header.querySelector('#mega-nav1') ||
      header.querySelector('#mega-menu-wrap-max_mega_menu_1') ||
      header.querySelector('.mega-menu-toggle');

    if (existing) {
      existing.classList.add('cg-header-cta');
      existing.setAttribute('href', '/contact-us/');
      var wrap = existing.closest('.elementor-element');
      if (wrap) {
        wrap.classList.remove('elementor-hidden-mobile', 'elementor-hidden-phone');
        wrap.classList.add('elementor-hidden-tablet', 'elementor-hidden-desktop');
        // Keep Let’s Talk before the hamburger in the DOM (logo | CTA | burger)
        if (toggleWrap && toggleWrap.parentNode && wrap.parentNode === toggleWrap.parentNode) {
          toggleWrap.parentNode.insertBefore(wrap, toggleWrap);
        }
      }
      return;
    }

    if (!toggleWrap || !toggleWrap.parentNode) return;

    var holder = document.createElement('div');
    holder.className =
      'elementor-element elementor-widget elementor-widget-button elementor-hidden-tablet elementor-hidden-desktop cg-header-cta-wrap';
    holder.innerHTML =
      '<a class="elementor-button elementor-button-link elementor-size-sm cg-header-cta" href="/contact-us/">' +
      '<span class="elementor-button-content-wrapper"><span class="elementor-button-text">Let’s Talk</span></span>' +
      '</a>';
    toggleWrap.parentNode.insertBefore(holder, toggleWrap);
  }

  function mount() {
    ensureCss();
    document.body.classList.add('cg-mnav-ready');
    ensureClosedHeaderCta();

    var existing = document.getElementById(ROOT_ID);
    if (existing) existing.remove();

    var holder = document.createElement('div');
    holder.innerHTML = buildHtml();
    var root = holder.firstChild;
    document.body.appendChild(root);

    bindAccordion(root);
    bindHeaderToggle(root);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('is-open')) {
        setOpen(root, false);
      }
    });

    window.addEventListener('resize', function () {
      if (!isMobile() && root.classList.contains('is-open')) {
        setOpen(root, false);
      }
    });
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {
    // Header may load async via fetch in Header.astro — retry briefly
    var tries = 0;
    function attempt() {
      tries += 1;
      if (document.getElementById('mega-menu-wrap-max_mega_menu_1') || tries > 40) {
        mount();
        return;
      }
      setTimeout(attempt, 100);
    }
    attempt();
  });
})();
