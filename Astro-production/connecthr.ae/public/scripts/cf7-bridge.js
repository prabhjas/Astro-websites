(() => {
  const endpoint =
    window.__SP_CONTACT_ENDPOINT__ ||
    document.querySelector('meta[name="sp-contact-endpoint"]')?.getAttribute("content") ||
    "/api/contact/";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
  const NAME_RE = /^[\p{L}][\p{L}\s'.-]{0,99}$/u;
  const LINK_LIKE_RE = /https?:\/\/|www\.|@|\.(com|net|org|ae|io|co|info|biz|me|app|dev)(\b|\/|$)/i;
  const SUCCESS_MSG = "Thank you. Your enquiry has been received.";
  const FAIL_MSG = "We could not submit your enquiry at the moment. Please try again shortly.";


  function getAttrCookie(name) {
    var nameEQ = name + "=";
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        try {
          return decodeURIComponent(c.substring(nameEQ.length));
        } catch (e) {
          return c.substring(nameEQ.length);
        }
      }
    }
    return "";
  }

  function setAttrCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      name +
      "=" +
      encodeURIComponent(String(value == null ? "" : value)) +
      "; expires=" +
      d.toUTCString() +
      "; path=/; SameSite=Lax" +
      secure;
  }

  function resolveInitialLandingUrl() {
    var pageUrl = window.location.href;
    var fromCookie = getAttrCookie("initialUrl") || getAttrCookie("cg_initial_url");
    if (fromCookie) return fromCookie;
    try {
      var fromSession = sessionStorage.getItem("cg_initial_url");
      if (fromSession) {
        setAttrCookie("initialUrl", fromSession, 30);
        return fromSession;
      }
    } catch (e) {}
    setAttrCookie("initialUrl", pageUrl, 30);
    try {
      sessionStorage.setItem("cg_initial_url", pageUrl);
    } catch (e) {}
    return pageUrl;
  }

  function pushLeadToDataLayer(email, phone, submissionId) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "form_submission_lead",
        email: email || "",
        phone_number: phone || "",
        submission_id: submissionId || "",
      });
    } catch (e) {}
  }


  function ensureStatus(form) {
    let status = form.querySelector(".wpcf7-response-output, [data-sp-form-status]");
    if (!status) {
      status = document.createElement("div");
      status.className = "wpcf7-response-output";
      status.setAttribute("aria-live", "polite");
      form.appendChild(status);
    }
    return status;
  }

  /** Match Evolution / CF7: mail-sent-ok / mail-sent-ng + form.sent|failed */
  function showCf7Message(form, message, isError) {
    const output = ensureStatus(form);
    const text = message || "";
    const sr =
      form.closest(".wpcf7")?.querySelector('.screen-reader-response [role="status"]') || null;

    output.textContent = "";
    if (text) output.appendChild(document.createTextNode(text));
    output.setAttribute("aria-hidden", text ? "false" : "true");
    output.setAttribute("data-astro-message", text);

    output.classList.remove(
      "sp-status-visible",
      "sp-status-ok",
      "sp-status-err",
      "wpcf7-validation-errors",
      "wpcf7-mail-sent-ok",
      "wpcf7-mail-sent-ng",
    );

    form.classList.remove("sent", "failed", "invalid", "spam", "aborted", "unaccepted");

    if (text) {
      output.classList.add(isError ? "wpcf7-mail-sent-ng" : "wpcf7-mail-sent-ok");
      output.classList.add("sp-status-visible", isError ? "sp-status-err" : "sp-status-ok");
      form.classList.add(isError ? "failed" : "sent");
      output.style.display = "block";
      output.style.visibility = "visible";
      output.style.opacity = "1";
      try {
        output.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {
        /* ignore */
      }
    } else {
      output.style.display = "none";
    }

    if (sr) sr.textContent = text;
    return output;
  }

  function clearErrors(form) {
    form.querySelectorAll(".sp-field-error").forEach((el) => el.remove());
    form.querySelectorAll(".sp-field-invalid").forEach((el) => el.classList.remove("sp-field-invalid"));
  }

  function showFieldError(input, message) {
    if (!input) return;
    input.classList.add("sp-field-invalid");
    const wrap =
      input.closest(".wpcf7-form-control-wrap") ||
      input.closest("label") ||
      input.parentElement;
    if (!wrap) return;
    const existing = wrap.querySelector(".sp-field-error");
    if (existing) {
      existing.textContent = message;
      return;
    }
    const err = document.createElement("span");
    err.className = "sp-field-error";
    err.textContent = message;
    wrap.appendChild(err);
  }

  function nameError(value, label) {
    const v = String(value || "").trim();
    if (!v) return `${label} is required.`;
    if (/\d/.test(v)) return `${label} cannot contain numbers.`;
    if (LINK_LIKE_RE.test(v)) return `${label} cannot contain links or emails.`;
    if (!NAME_RE.test(v)) return `Enter a valid ${label.toLowerCase()}.`;
    return "";
  }

  function phoneInput(form) {
    return form.querySelector(
      "input.wpcf7-phonetext, input[name^='phonetext-'], input[name='your-phone'], input[name='phone'], input[type='tel']",
    );
  }

  function getPhoneValue(form) {
    const phone = phoneInput(form);
    if (!phone) return "";

    try {
      if (window.jQuery) {
        const $el = window.jQuery(phone);
        if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
          const full = $el.intlTelInput("getNumber");
          const national = String(phone.value || "").replace(/\D/g, "");
          if (full && national) return String(full).trim();
          const data = $el.intlTelInput("getSelectedCountryData");
          if (national && data?.dialCode) return `+${data.dialCode}${national}`;
          return national ? String(full || "").trim() : "";
        }
      }
    } catch {
      /* fall through */
    }
    return String(phone.value || "").trim();
  }

  const ROI_MONTHLY_SUB = 2500;
  const ROI_TIME_SAVED = 0.8;
  const ROI_ERROR_COST = 800;
  const ROI_SIF_PENALTY = 500;

  function isRoiCalculatorForm(form) {
    return !!form.querySelector('[name="roi_percent"], #f_roi');
  }

  function computeRoiFromSliders() {
    const hr = parseInt(document.getElementById("hrCount")?.value || "0", 10) || 0;
    const sal = parseInt(document.getElementById("salary")?.value || "0", 10) || 0;
    const hrs = parseInt(document.getElementById("hours")?.value || "0", 10) || 0;
    const hrly = sal / 176;
    const hrCost = hrly * hrs * hr;
    const errCst = ROI_ERROR_COST * hr;
    const manual = hrCost + errCst + ROI_SIF_PENALTY;
    const withCHR = ROI_MONTHLY_SUB + hrCost * 0.2;
    const netMo = manual - withCHR;
    const netYr = netMo * 12;
    const roi = netYr > 0 ? Math.round((netYr / (ROI_MONTHLY_SUB * 12)) * 100) : 0;
    return { hr, sal, hrs, netMo, netYr, roi };
  }

  function injectRoiCalculatorFields(form) {
    if (!isRoiCalculatorForm(form)) return;
    const d = computeRoiFromSliders();
    const setVal = (selector, value) => {
      const el = form.querySelector(selector);
      if (el) el.value = String(value);
    };
    setVal("#f_hr_count, [name='hr_count']", d.hr);
    setVal("#f_salary, [name='avg_salary_aed']", d.sal);
    setVal("#f_hours, [name='payroll_hours_per_month']", d.hrs);
    setVal("#f_monthly, [name='monthly_savings_aed']", Math.round(d.netMo));
    setVal("#f_annual, [name='annual_savings_aed']", Math.round(d.netYr));
    setVal("#f_roi, [name='roi_percent']", d.roi);
  }

  function dispatchWpcf7MailSent(form) {
    const wpcf7Root = form.closest(".wpcf7");
    document.dispatchEvent(
      new CustomEvent("wpcf7mailsent", {
        bubbles: true,
        detail: {
          contactFormId: form.querySelector('[name="_wpcf7"]')?.value || "",
          unitTag: wpcf7Root?.id || form.querySelector('[name="_wpcf7_unit_tag"]')?.value || "",
        },
      }),
    );
  }

  function isPhoneRequired(form) {
    const phoneEl = phoneInput(form);
    if (!phoneEl) return false;
    if (isRoiCalculatorForm(form)) {
      return (
        phoneEl.getAttribute("aria-required") === "true" ||
        phoneEl.classList.contains("wpcf7-validates-as-required")
      );
    }
    return true;
  }

  function detectFormName(form) {
    if (isRoiCalculatorForm(form) || /\/roi-calculator\/?$/i.test(window.location.pathname)) {
      return "Connect HR ROI Calculator";
    }
    const heading = (
      form.closest(".elementor-widget-container, .elementor-element, section, .main-form")?.innerText ||
      form.innerText ||
      ""
    ).toLowerCase();
    if (/demo|trial|pricing|quote/.test(heading)) return "Connect HR Demo Form";
    if (/payroll|visa|leave|attendance/.test(heading)) return "Connect HR Product Form";
    return "Connect HR Contact Form";
  }

  function ensureHiddenField(form, name, value) {
    let input = form.querySelector(`[name="${name}"]`);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }
    if (value !== undefined) {
      // Prefer existing non-empty values (e.g. server-rendered fields).
      if (!String(input.value || "").trim()) input.value = value || "";
    }
    return input;
  }

  function captureTrackingFields(form) {
    var params = new URLSearchParams(window.location.search || "");
    var hashParams = new URLSearchParams((window.location.hash || "").replace(/^#\??/, ""));
    function paramHas(key) {
      return params.has(key) || hashParams.has(key);
    }
    function paramGet(key) {
      if (params.has(key)) return params.get(key) || "";
      if (hashParams.has(key)) return hashParams.get(key) || "";
      return "";
    }
    var pageUrl = window.location.href;
    var initial = resolveInitialLandingUrl();

    var TRACKING_FIELDS = {
      gclid: ["gclid", "gbraid", "wbraid"],
      gbraid: ["gbraid"],
      wbraid: ["wbraid"],
      fbclid: ["fbclid"],
      msclkid: ["msclkid"],
      twclid: ["twclid"],
      utm_source: ["utm_source"],
      utm_medium: ["utm_medium"],
      utm_campaign: ["utm_campaign"],
      utm_term: ["utm_term"],
      utm_content: ["utm_content"],
      campaign_id: ["campaign_id", "campaignid", "gad_campaignid", "campaign"],
      adgroup_id: ["adgroup_id", "adgroupid"],
      group_id: ["group_id", "groupid"],
      creative_id: ["creative_id", "creativeid", "creative"],
      keyword: ["keyword", "kw", "q", "utm_term"],
      matchtype: ["matchtype", "match_type"],
      device: ["device", "utm_device"],
      network: ["network"],
      placement: ["placement", "displayad"],
      target: ["target", "targetid", "target_id"],
      target_id: ["target_id", "targetid", "target"],
      adposition: ["adposition", "ad_position"],
      loc_physical_ms: ["loc_physical_ms", "locphysicalms"],
      loc_interest_ms: ["loc_interest_ms", "locinterestms"],
      gad_source: ["gad_source", "gadsource"],
      source: ["source", "gad_source", "gadsource"],
    };

    function firstParam(aliases) {
      for (var i = 0; i < aliases.length; i++) {
        var alias = aliases[i];
        if (paramHas(alias)) return String(paramGet(alias) || "").trim();
      }
      return "";
    }

    Object.keys(TRACKING_FIELDS).forEach(function (name) {
      var fromUrl = firstParam(TRACKING_FIELDS[name]);
      var value = fromUrl;
      if (paramHas(TRACKING_FIELDS[name][0]) || fromUrl) {
        // Persist when URL explicitly carried any alias with a value
        if (fromUrl) setAttrCookie(name, fromUrl, 30);
      } else {
        value = getAttrCookie(name) || "";
      }
      // gclid special-case: also accept cookie if URL empty
      if (name === "gclid" && !value) {
        value = getAttrCookie("gclid") || getAttrCookie("gbraid") || getAttrCookie("wbraid") || "";
      }
      ensureHiddenField(form, name, value);
    });

    // Explicit click-id cookies when present on URL
    ["gclid", "gbraid", "wbraid", "gclsrc"].forEach(function (k) {
      var v = String(paramGet(k) || "").trim();
      if (v) setAttrCookie(k === "gclsrc" ? "gclsrc" : k === "gclid" ? "gclid" : k, k === "gclid" ? (paramGet("gclid") || paramGet("gbraid") || paramGet("wbraid") || v) : v, 30);
    });
    var urlGclid = String(paramGet("gclid") || paramGet("gbraid") || paramGet("wbraid") || "").trim();
    if (urlGclid) {
      setAttrCookie("gclid", urlGclid, 30);
      ensureHiddenField(form, "gclid", urlGclid);
    }

    ensureHiddenField(form, "initial_url", initial);
    ensureHiddenField(form, "landing_page_url", initial);
    ensureHiddenField(form, "page_url", pageUrl);
    ensureHiddenField(form, "submission_page_url", pageUrl);
    ensureHiddenField(form, "referrer_url", document.referrer || "");
  }


  function sanitizeNameInput(el) {
    if (!(el instanceof HTMLInputElement)) return;
    const cleaned = el.value
      .replace(/\d+/g, "")
      .replace(/https?:\/\/\S*/gi, "")
      .replace(/www\.\S*/gi, "")
      .replace(/[^\p{L}\s'.-]/gu, "");
    if (cleaned !== el.value) el.value = cleaned;
  }

  function sanitizePhoneInput(el) {
    if (!(el instanceof HTMLInputElement)) return;
    const cleaned = el.value.replace(/[^\d]/g, "");
    if (cleaned !== el.value) el.value = cleaned;
  }

  function wireInputGuards(form) {
    if (form.dataset.spInputGuards === "1") return;
    form.dataset.spInputGuards = "1";

    const nameFields = form.querySelectorAll(
      "[name='first-name'], [name='firstName'], [name='last-name'], [name='lastName'], [name='your-name'], [name='name'], [name='full-name'], [name='full_name']",
    );
    nameFields.forEach((el) => {
      el.setAttribute("inputmode", "text");
      el.setAttribute("autocomplete", el.getAttribute("autocomplete") || "name");
      el.addEventListener("input", () => sanitizeNameInput(el));
      el.addEventListener("blur", () => sanitizeNameInput(el));
    });

    const phoneFields = form.querySelectorAll(
      "input.wpcf7-phonetext, input[name^='phonetext-'], input[name='phone'], input[type='tel']",
    );
    phoneFields.forEach((el) => {
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("pattern", "[0-9]*");
      el.addEventListener("input", () => sanitizePhoneInput(el));
      el.addEventListener("blur", () => sanitizePhoneInput(el));
    });
  }

  function validate(form) {
    clearErrors(form);
    const errors = {};

    const first =
      form.querySelector(
        "[name='first-name'], [name='firstName'], [name='your-name'], [name='full-name'], [name='full_name'], [name='name']",
      );
    const last = form.querySelector("[name='last-name'], [name='lastName']");
    const email = form.querySelector("[name='your-email'], [name='email']");
    const phoneEl = phoneInput(form);
    const company = form.querySelector("[name='company-name']");
    const employeeCount = form.querySelector("[name='select-19']");

    if (first) sanitizeNameInput(first);
    if (last) sanitizeNameInput(last);
    if (phoneEl) sanitizePhoneInput(phoneEl);

    const phone = getPhoneValue(form);
    const firstVal = String(first?.value || "").trim();
    const lastVal = String(last?.value || "").trim();
    const emailVal = String(email?.value || "").trim();
    const isFullNameOnly = first && /full-?name|your-name|^name$/i.test(first.getAttribute("name") || "");

    if (isFullNameOnly || !last) {
      const nameErr = nameError(firstVal, "Name");
      if (nameErr) {
        errors.name = nameErr;
        showFieldError(first, nameErr);
      }
    } else {
      const firstErr = nameError(firstVal, "First name");
      if (firstErr) {
        errors.name = firstErr;
        showFieldError(first, firstErr);
      }
      const lastErr = nameError(lastVal, "Last name");
      if (lastErr) {
        errors.lastName = lastErr;
        showFieldError(last, lastErr);
      }
    }

    if (!emailVal) {
      errors.email = "A valid email address is required.";
      showFieldError(email, errors.email);
    } else if (!EMAIL_RE.test(emailVal)) {
      errors.email = "Enter a valid email (e.g. name@domain.com).";
      showFieldError(email, errors.email);
    }

    if (phoneEl && isPhoneRequired(form)) {
      const digits = phone.replace(/\D/g, "");
      if (!phone) {
        errors.phone = "Phone number is required.";
        showFieldError(phoneEl, errors.phone);
      } else if (/[a-zA-Z]/.test(phone)) {
        errors.phone = "Phone number can only contain digits.";
        showFieldError(phoneEl, errors.phone);
      } else if (!PHONE_RE.test(phone) || digits.length < 7 || digits.length > 15) {
        errors.phone = "Enter a valid phone number.";
        showFieldError(phoneEl, errors.phone);
      }
    }

    if (company && company.classList.contains("wpcf7-validates-as-required")) {
      const companyVal = String(company.value || "").trim();
      if (!companyVal) {
        errors.company = "Company name is required.";
        showFieldError(company, errors.company);
      }
    }

    if (employeeCount && employeeCount.classList.contains("wpcf7-validates-as-required")) {
      const countVal = String(employeeCount.value || "").trim();
      if (!countVal) {
        errors.employees = "Employee count is required.";
        showFieldError(employeeCount, errors.employees);
      }
    }

    return { ok: Object.keys(errors).length === 0, errors, phone };
  }

  /** Avoid form.reset() — CF7 clears .wpcf7-response-output on reset. */
  function clearLegacyFormFields(form) {
    form.querySelectorAll("input, textarea, select").forEach((el) => {
      const type = (el.type || "").toLowerCase();
      if (type === "hidden" || type === "submit" || type === "button") return;
      if (type === "checkbox" || type === "radio") {
        el.checked = false;
        return;
      }
      el.value = "";
    });
  }

  async function submitContactForm(form) {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.__chrSubmitting) return;
    form.__chrSubmitting = true;

    captureTrackingFields(form);
    injectRoiCalculatorFields(form);

    const result = validate(form);
    if (!result.ok) {
      form.__chrSubmitting = false;
      form.classList.add("invalid");
      showCf7Message(
        form,
        Object.values(result.errors)[0] || "Please fill in all required fields.",
        true,
      );
      const firstInvalid = form.querySelector(".sp-field-invalid");
      firstInvalid?.focus?.();
      return;
    }

    captureTrackingFields(form);
    injectRoiCalculatorFields(form);
    const fd = new FormData(form);
    if (result.phone) {
      const phoneEl = phoneInput(form);
      const phoneName = phoneEl?.getAttribute("name");
      if (phoneName) fd.set(phoneName, result.phone);
      fd.set("phonetext-597", result.phone);
      fd.set("phone", result.phone);
      if (!fd.get("your-phone")) fd.set("your-phone", result.phone);
    }
    const fullName = fd.get("full-name") || fd.get("full_name") || fd.get("your-name");
    if (fullName && !fd.get("name")) fd.set("name", String(fullName));
    if (!fd.get("page_url")) fd.set("page_url", window.location.href);
    if (!fd.get("initial_url")) fd.set("initial_url", window.location.href);
    if (!fd.get("form_name")) fd.set("form_name", detectFormName(form));
    if (!fd.get("submission_id")) fd.set("submission_id", crypto.randomUUID());
    if (!fd.get("submitted_at")) fd.set("submitted_at", new Date().toISOString());

    const payload = {};
    const arrays = {};
    fd.forEach((value, key) => {
      if (typeof value !== "string") return;
      if (key.endsWith("[]")) {
        const arrayKey = key.slice(0, -2);
        if (!arrays[arrayKey]) arrays[arrayKey] = [];
        arrays[arrayKey].push(value);
        return;
      }
      payload[key] = value;
    });
    Object.keys(arrays).forEach((k) => {
      payload[k] = arrays[k];
    });

    const submitBtn = form.querySelector('[type="submit"], input[type="submit"], button.wpcf7-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-busy", "true");
    }
    form.classList.add("submitting");
    showCf7Message(form, "Sending…", false);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false || data.ok === false) {
        if (data.errors && typeof data.errors === "object") {
          const map = {
            name: "[name='first-name'], [name='your-name']",
            lastName: "[name='last-name']",
            email: "[name='your-email'], [name='email']",
            phone: "input.wpcf7-phonetext, input[name^='phonetext-'], [name='phone']",
            company: "[name='company-name']",
          };
          for (const [key, msg] of Object.entries(data.errors)) {
            const sel = map[key];
            if (sel) showFieldError(form.querySelector(sel), String(msg));
          }
        }
        throw new Error(data.message || data.error || FAIL_MSG);
      }

      const successMsg = data.message || SUCCESS_MSG;
      try {
        const emailEl = form.querySelector("[name='your-email'], [name='email'], [name='sub2']");
        const phoneEl = phoneInput(form);
        pushLeadToDataLayer(
          emailEl && emailEl.value ? String(emailEl.value).trim() : "",
          result.phone || (phoneEl && phoneEl.value ? String(phoneEl.value).trim() : ""),
          (data && (data.submissionId || data.submission_id)) || form.dataset.submissionId || "",
        );
      } catch (e) {}

      clearLegacyFormFields(form);
      clearErrors(form);
      try {
        const phone = form.querySelector("input.wpcf7-phonetext");
        const country = window.__SP_PHONE_COUNTRY__ || "ae";
        if (phone && window.jQuery?.(phone).data("plugin_intlTelInput")) {
          window.jQuery(phone).intlTelInput("setCountry", country);
        }
      } catch {
        /* ignore */
      }
      showCf7Message(form, successMsg, false);
      if (isRoiCalculatorForm(form)) {
        dispatchWpcf7MailSent(form);
      }
      // Re-assert after CF7/intlTel quirks (same as Evolution)
      setTimeout(() => showCf7Message(form, successMsg, false), 100);
      setTimeout(() => showCf7Message(form, successMsg, false), 300);
    } catch (err) {
      showCf7Message(
        form,
        err instanceof Error ? err.message : FAIL_MSG,
        true,
      );
    } finally {
      form.__chrSubmitting = false;
      form.classList.remove("submitting");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute("aria-busy");
      }
    }
  }

  function prepareForm(form) {
    if (!(form instanceof HTMLFormElement)) return;
    // Neutralize native CF7 hash navigation if JS interception somehow misses a submit.
    if (/#wpcf7-/i.test(form.getAttribute("action") || "") || /javascript:/i.test(form.getAttribute("action") || "")) {
      form.setAttribute("action", "#");
    }
    form.setAttribute("novalidate", "novalidate");
    wireInputGuards(form);
    captureTrackingFields(form);
    form.dataset.spContactPrepared = "1";
  }

  function boot() {
    document.querySelectorAll(".wpcf7-response-output, [data-sp-form-status]").forEach((el) => {
      if (!String(el.textContent || "").trim() && !el.getAttribute("data-astro-message")) {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      }
    });
    document.querySelectorAll("form.wpcf7-form, .wpcf7 form, form[data-sp-contact-form]").forEach(prepareForm);
  }

  if (!window.__CHR_CF7_BRIDGE_BOUND__) {
    window.__CHR_CF7_BRIDGE_BOUND__ = true;
    // Document-level capture — works even if Elementor moves/recreates popup forms.
    document.addEventListener(
      "submit",
      (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (!form.classList.contains("wpcf7-form") && !form.closest(".wpcf7") && !form.hasAttribute("data-sp-contact-form")) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        prepareForm(form);
        submitContactForm(form);
      },
      true,
    );
    window.addEventListener("chr:popup-opened", () => {
      setTimeout(boot, 0);
      setTimeout(boot, 100);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 800);
})();
