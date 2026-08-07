(() => {
  const endpoint =
    window.__SP_CONTACT_ENDPOINT__ ||
    document.querySelector('meta[name="sp-contact-endpoint"]')?.getAttribute("content") ||
    "/api/contact/";

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
  /** Letters, spaces, apostrophe, hyphen only — dots blocked */
  const NAME_RE = /^[\p{L}][\p{L}\s'-]{0,99}$/u;
  const LINK_LIKE_RE = /https?:\/\/|www\.|@|\.(com|net|org|ae|io|co|info|biz|me|app|dev)(\b|\/|$)/i;
  const SUCCESS_MSG = "Thank you. Your enquiry has been received.";
  const FAIL_MSG = "We could not submit your enquiry at the moment. Please try again shortly.";

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
    if (/\./.test(v) || LINK_LIKE_RE.test(v)) {
      return `${label} cannot contain links, emails, or domain-like values.`;
    }
    if (!NAME_RE.test(v)) {
      return `Enter a valid ${label.toLowerCase()} (letters, spaces, apostrophe, hyphen only).`;
    }
    return "";
  }

  function getPhoneValue(form) {
    const phone =
      form.querySelector("input.wpcf7-phonetext, input[name='phonetext-597'], input[name='phone'], input[type='tel']");
    if (!phone) return "";

    try {
      if (window.jQuery) {
        const $el = window.jQuery(phone);
        if ($el.data("plugin_intlTelInput") || $el.data("intlTelInput")) {
          const full = $el.intlTelInput("getNumber");
          if (full) return String(full).trim();
          const data = $el.intlTelInput("getSelectedCountryData");
          const national = String(phone.value || "").replace(/\D/g, "");
          if (national && data?.dialCode) return `+${data.dialCode}${national}`;
        }
      }
    } catch {
      /* fall through */
    }
    return String(phone.value || "").trim();
  }

  function detectFormName(form) {
    const heading = (
      form.closest(".elementor-widget-container, .elementor-element, section, .main-form")?.innerText ||
      form.innerText ||
      ""
    ).toLowerCase();
    if (/catalog|pricing|quote/.test(heading)) return "MBS Consultancy Catalog Form";
    if (/rental|rent/.test(heading)) return "MBS Consultancy Rental Form";
    return "MBS Consultancy Contact Form";
  }

  function sanitizeNameInput(el) {
    if (!(el instanceof HTMLInputElement)) return;
    const cleaned = el.value
      .replace(/\./g, "")
      .replace(/\d+/g, "")
      .replace(/https?:\/\/\S*/gi, "")
      .replace(/www\.\S*/gi, "")
      .replace(/[^\p{L}\s'-]/gu, "");
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
      "[name='first-name'], [name='firstName'], [name='last-name'], [name='lastName'], [name='your-name'], [name='name']",
    );
    nameFields.forEach((el) => {
      el.setAttribute("inputmode", "text");
      el.setAttribute("autocomplete", el.getAttribute("autocomplete") || "name");
      el.addEventListener("input", () => sanitizeNameInput(el));
      el.addEventListener("blur", () => sanitizeNameInput(el));
    });

    const phoneFields = form.querySelectorAll(
      "input.wpcf7-phonetext, input[name='phonetext-597'], input[name='phone'], input[type='tel']",
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
      form.querySelector("[name='first-name'], [name='firstName'], [name='your-name']");
    const last = form.querySelector("[name='last-name'], [name='lastName']");
    const email = form.querySelector("[name='your-email'], [name='email']");
    const phoneEl =
      form.querySelector("input.wpcf7-phonetext, input[name='phonetext-597'], input[name='phone'], input[type='tel']");

    if (first) sanitizeNameInput(first);
    if (last) sanitizeNameInput(last);
    if (phoneEl) sanitizePhoneInput(phoneEl);

    const phone = getPhoneValue(form);
    const firstVal = String(first?.value || "").trim();
    const lastVal = String(last?.value || "").trim();
    const emailVal = String(email?.value || "").trim();

    // Only validate fields that exist on this form (newsletter = email only).
    if (first) {
      const nameLabel =
        first.getAttribute("name") === "your-name" || first.getAttribute("name") === "name"
          ? "Name"
          : "First name";
      const firstErr = nameError(firstVal, nameLabel);
      if (firstErr) {
        errors.name = firstErr;
        showFieldError(first, firstErr);
      }
    }
    if (last) {
      const lastErr = nameError(lastVal, "Last name");
      if (lastErr) {
        errors.lastName = lastErr;
        showFieldError(last, lastErr);
      }
    }

    if (!emailVal) {
      errors.email = "A valid email address is required.";
      showFieldError(email, errors.email);
    } else if (!emailVal.includes("@")) {
      errors.email = "Enter a valid email (must include @).";
      showFieldError(email, errors.email);
    } else if (!EMAIL_RE.test(emailVal)) {
      errors.email = "Enter a valid email (e.g. name@domain.com).";
      showFieldError(email, errors.email);
    }

    if (phoneEl) {
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
    const params = new URLSearchParams(window.location.search);
    const pageUrl = window.location.href;
    let initial = "";
    try {
      initial = sessionStorage.getItem("cg_initial_url") || pageUrl;
      if (!sessionStorage.getItem("cg_initial_url")) {
        sessionStorage.setItem("cg_initial_url", pageUrl);
      }
    } catch {
      initial = pageUrl;
    }

    const TRACKING_FIELDS = {
      gclid: ["gclid"],
      gbraid: ["gbraid"],
      wbraid: ["wbraid"],
      fbclid: ["fbclid"],
      msclkid: ["msclkid"],
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
      matchtype: ["matchtype"],
      device: ["device"],
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

    const firstParam = (aliases) => {
      for (const alias of aliases) {
        const v = params.get(alias);
        if (v) return v;
      }
      return "";
    };

    Object.keys(TRACKING_FIELDS).forEach((name) => {
      ensureHiddenField(form, name, firstParam(TRACKING_FIELDS[name]));
    });

    ensureHiddenField(form, "initial_url", initial);
    ensureHiddenField(form, "landing_page_url", initial);
    ensureHiddenField(form, "page_url", pageUrl);
    ensureHiddenField(form, "submission_page_url", pageUrl);
    ensureHiddenField(form, "referrer_url", document.referrer || "");
  }

  function wireForm(form) {
    if (!(form instanceof HTMLFormElement) || form.dataset.spContactWired === "1") return;
    form.dataset.spContactWired = "1";
    wireInputGuards(form);
    captureTrackingFields(form);

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

        captureTrackingFields(form);

        const result = validate(form);
        if (!result.ok) {
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

        const fd = new FormData(form);
        if (result.phone) {
          fd.set("phonetext-597", result.phone);
          fd.set("phonetext-257", result.phone);
          fd.set("phone", result.phone);
          // Keep whatever CF7 phone field name the form already uses
          const phoneInput = form.querySelector("input.wpcf7-phonetext, input[type='tel']");
          if (phoneInput?.name) fd.set(phoneInput.name, result.phone);
        }
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
                phone: "input.wpcf7-phonetext, [name='phonetext-597'], [name='phone']",
              };
              for (const [key, msg] of Object.entries(data.errors)) {
                const sel = map[key];
                if (sel) showFieldError(form.querySelector(sel), String(msg));
              }
            }
            throw new Error(data.message || data.error || FAIL_MSG);
          }

          const successMsg = data.message || SUCCESS_MSG;
          // Preserve selected dial-code country BEFORE clearing (flag was flipping on submit)
          let phoneCountry = window.__MBS_PHONE_COUNTRY__ || window.__SP_PHONE_COUNTRY__ || "";
          const phoneBefore = form.querySelector("input.wpcf7-phonetext, input[type='tel']");
          try {
            if (phoneBefore && window.jQuery?.(phoneBefore).data("plugin_intlTelInput")) {
              const dataC = window.jQuery(phoneBefore).intlTelInput("getSelectedCountryData");
              if (dataC?.iso2) phoneCountry = String(dataC.iso2).toLowerCase();
            }
          } catch {
            /* ignore */
          }

          clearLegacyFormFields(form);
          clearErrors(form);
          try {
            const phone = form.querySelector("input.wpcf7-phonetext, input[type='tel']");
            const country = phoneCountry || window.__MBS_PHONE_COUNTRY__ || window.__SP_PHONE_COUNTRY__ || "ae";
            if (phone && typeof window.__MBS_SET_PHONE_COUNTRY__ === "function") {
              window.__MBS_SET_PHONE_COUNTRY__(phone, country);
            } else if (phone && window.jQuery?.(phone).data("plugin_intlTelInput")) {
              window.jQuery(phone).intlTelInput("setCountry", country);
              if (typeof window.__MBS_SYNC_PHONE_PADDING__ === "function") {
                window.__MBS_SYNC_PHONE_PADDING__(phone);
              }
            }
            window.__MBS_PHONE_COUNTRY__ = country;
            window.__SP_PHONE_COUNTRY__ = country;
          } catch {
            /* ignore */
          }
          captureTrackingFields(form);
          showCf7Message(form, successMsg, false);
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
          form.classList.remove("submitting");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute("aria-busy");
          }
        }
      },
      true,
    );
  }

  function boot() {
    document.querySelectorAll(".wpcf7-response-output, [data-sp-form-status]").forEach((el) => {
      if (!String(el.textContent || "").trim() && !el.getAttribute("data-astro-message")) {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
      }
    });
    document.querySelectorAll("form.wpcf7-form, .wpcf7 form, form[data-sp-contact-form]").forEach(wireForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 800);
})();
