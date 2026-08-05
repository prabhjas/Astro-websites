/**
 * Connect FM /get-amc/ multistep CF7 wizard (live parity).
 * Steps: property → services → frequency → contact → thank-you.
 */
(() => {
  function initForm(root) {
    if (!(root instanceof HTMLElement) || root.dataset.amcWired === "1") return;
    const form = root.closest("form") || root.querySelector("form");
    if (!form) return;
    root.dataset.amcWired = "1";

    const steps = Array.from(root.querySelectorAll(".cf7-step"));
    if (steps.length < 2) return;

    const stepNumber = root.querySelector("#step-number");
    const stepCount = root.querySelector(".step-count");
    const totalLabel = stepCount?.querySelector("p");
    let current = 0;

    if (totalLabel && !totalLabel.textContent.includes("of")) {
      totalLabel.innerHTML = `Step <span id="step-number">1</span> of ${steps.length}`;
    } else if (totalLabel) {
      totalLabel.innerHTML = totalLabel.innerHTML.replace(
        /of\s*\d+/i,
        `of ${steps.length}`,
      );
    }

    function showStep(index) {
      current = Math.max(0, Math.min(index, steps.length - 1));
      steps.forEach((step, i) => {
        step.style.display = i === current ? "block" : "none";
      });
      const numEl = root.querySelector("#step-number") || stepNumber;
      if (numEl) numEl.textContent = String(current + 1);
      if (stepCount) {
        const thankYou = steps[current].querySelector(".text_title");
        stepCount.style.display = thankYou ? "none" : "";
      }
      bindRadioGate();
      // Phone flag was in a hidden panel — init/refresh when contact step opens
      if (isQuoteStep(steps[current]) && typeof window.__SP_INIT_PHONE_FLAGS__ === "function") {
        window.__SP_INIT_PHONE_FLAGS__();
        setTimeout(() => window.__SP_INIT_PHONE_FLAGS__(), 50);
        setTimeout(() => window.__SP_INIT_PHONE_FLAGS__(), 250);
      }
    }

    function isQuoteStep(step) {
      return Boolean(step?.querySelector(".form_btn, .info_field, .info_person"));
    }

    function isThankYouStep(step) {
      return Boolean(step?.querySelector(".text_title"));
    }

    function stepValid(step) {
      if (!step) return true;
      const radios = step.querySelectorAll('input[type="radio"]');
      if (radios.length) {
        return Array.from(radios).some((r) => r.checked);
      }
      const checks = step.querySelectorAll(
        '.multi-service-options input[type="checkbox"], input[type="checkbox"][name="services[]"]',
      );
      if (checks.length) {
        return Array.from(checks).some((c) => c.checked);
      }
      return true;
    }

    function bindRadioGate() {
      const step = steps[current];
      if (!step || isQuoteStep(step) || isThankYouStep(step)) return;
      const radios = step.querySelectorAll('input[type="radio"]');
      const checks = step.querySelectorAll(
        '.multi-service-options input[type="checkbox"], input[type="checkbox"][name="services[]"]',
      );
      const nextBtn = step.querySelector(".next-btn");
      if (!nextBtn) return;

      const sync = () => {
        if (radios.length || checks.length) {
          nextBtn.disabled = !stepValid(step);
        }
      };

      radios.forEach((radio) => {
        radio.addEventListener("change", sync);
      });
      checks.forEach((box) => {
        box.addEventListener("change", sync);
      });
      sync();
    }

    root.querySelectorAll(".next-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const step = btn.closest(".cf7-step");
        if (!stepValid(step)) return;

        if (isQuoteStep(step) && btn.closest(".form_btn")) {
          form.requestSubmit();
          return;
        }

        if (current < steps.length - 1) {
          showStep(current + 1);
        }
      });
    });

    root.querySelectorAll(".prev-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        if (current > 0) showStep(current - 1);
      });
    });

    // Step 1: Mixed-use / Other text field
    form.querySelectorAll('input[name="radio-689"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const wrap = radio.closest(".cf7-step")?.querySelector(".other-text-wrap");
        if (!wrap) return;
        wrap.style.display = radio.checked && radio.value === "Mixed-use / Other" ? "block" : "none";
      });
    });

    // Step 2: Others (specify)
    const checkboxes = root.querySelectorAll('.multi-service-options input[type="checkbox"]');
    const otherWrap = root.querySelector(".other-service-wrap");
    const otherCheckbox = Array.from(checkboxes).find((cb) => cb.value === "Others (specify)");
    if (otherCheckbox && otherWrap) {
      otherCheckbox.addEventListener("change", () => {
        otherWrap.style.display = otherCheckbox.checked ? "block" : "none";
      });
    }

    form.addEventListener("sp-contact-success", () => {
      const thankIdx = steps.findIndex((s) => isThankYouStep(s));
      if (thankIdx >= 0) showStep(thankIdx);
      else if (current < steps.length - 1) showStep(steps.length - 1);
    });

    showStep(0);
  }

  function boot() {
    document.querySelectorAll(".form-main").forEach(initForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 600);
})();
