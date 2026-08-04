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

  const NAME_SEL = "[name='sub'], [name='first-name'], [name='firstName'], [name='your-name'], [name='name']";
  const EMAIL_SEL = "[name='sub2'], [name='your-email'], [name='email']";
  const PHONE_SEL =
    "input.wpcf7-phonetext, input[name^='phonetext-'], input[name='phone'], input[type='tel']";
  const MSG_SEL = "[name='sub5'], [name='your-message'], [name='message'], textarea";
  const COUNTRY_SEL = "input.wpcf7-countrytext, input[name^='countrytext-']";

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
      input.closest(".form-group") ||
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

  function getPhoneValue(form) {
    const phone = form.querySelector(PHONE_SEL);
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
    return (
      form.querySelector("[name='form_name']")?.value ||
      form.getAttribute("aria-label") ||
      "Connect UAE Contact Form"
    );
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

    form.querySelectorAll(NAME_SEL).forEach((el) => {
      el.setAttribute("inputmode", "text");
      el.setAttribute("autocomplete", el.getAttribute("autocomplete") || "name");
      el.addEventListener("input", () => sanitizeNameInput(el));
      el.addEventListener("blur", () => sanitizeNameInput(el));
    });

    form.querySelectorAll(PHONE_SEL).forEach((el) => {
      el.setAttribute("inputmode", "numeric");
      el.setAttribute("pattern", "[0-9]*");
      el.addEventListener("input", () => sanitizePhoneInput(el));
      el.addEventListener("blur", () => sanitizePhoneInput(el));
    });
  }

  function validate(form) {
    clearErrors(form);
    const errors = {};

    const nameEl = form.querySelector(NAME_SEL);
    const email = form.querySelector(EMAIL_SEL);
    const phoneEl = form.querySelector(PHONE_SEL);
    const msgEl = form.querySelector(MSG_SEL);

    if (nameEl) sanitizeNameInput(nameEl);
    if (phoneEl) sanitizePhoneInput(phoneEl);

    const phone = getPhoneValue(form);
    const nameVal = String(nameEl?.value || "").trim();
    const emailVal = String(email?.value || "").trim();
    const msgVal = String(msgEl?.value || "").trim();

    const nameErr = nameError(nameVal, "Name");
    if (nameErr) {
      errors.name = nameErr;
      showFieldError(nameEl, nameErr);
    }

    if (!emailVal) {
      errors.email = "A valid email address is required.";
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

    if (msgEl && msgEl.hasAttribute("aria-required")) {
      if (!msgVal) {
        errors.message = "Message is required.";
        showFieldError(msgEl, errors.message);
      }
    }

    return { ok: Object.keys(errors).length === 0, errors, phone };
  }

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

  function wireForm(form) {
    if (!(form instanceof HTMLFormElement) || form.dataset.spContactWired === "1") return;
    form.dataset.spContactWired = "1";
    wireInputGuards(form);

    form.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

        const result = validate(form);
        if (!result.ok) {
          form.classList.add("invalid");
          showCf7Message(
            form,
            Object.values(result.errors)[0] || "Please fill in all required fields.",
            true,
          );
          form.querySelector(".sp-field-invalid")?.focus?.();
          return;
        }

        const fd = new FormData(form);
        if (result.phone) {
          const phoneName = form.querySelector(PHONE_SEL)?.getAttribute("name") || "phone";
          fd.set(phoneName, result.phone);
          fd.set("phone", result.phone);
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
                name: NAME_SEL,
                email: EMAIL_SEL,
                phone: PHONE_SEL,
                message: MSG_SEL,
              };
              for (const [key, msg] of Object.entries(data.errors)) {
                const sel = map[key];
                if (sel) showFieldError(form.querySelector(sel), String(msg));
              }
            }
            throw new Error(data.message || data.error || FAIL_MSG);
          }

          const successMsg = data.message || SUCCESS_MSG;
          clearLegacyFormFields(form);
          clearErrors(form);
          try {
            const phone = form.querySelector(PHONE_SEL);
            const country = window.__SP_PHONE_COUNTRY__ || "ae";
            if (phone && window.jQuery?.(phone).data("plugin_intlTelInput")) {
              window.jQuery(phone).intlTelInput("setCountry", country);
            }
            const countryEl = form.querySelector(COUNTRY_SEL);
            if (countryEl && window.jQuery?.(countryEl).data("countrySelect")) {
              window.jQuery(countryEl).countrySelect("selectCountry", country);
            }
          } catch {
            /* ignore */
          }
          showCf7Message(form, successMsg, false);
          setTimeout(() => showCf7Message(form, successMsg, false), 100);
          setTimeout(() => showCf7Message(form, successMsg, false), 300);
        } catch (err) {
          showCf7Message(form, err instanceof Error ? err.message : FAIL_MSG, true);
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
