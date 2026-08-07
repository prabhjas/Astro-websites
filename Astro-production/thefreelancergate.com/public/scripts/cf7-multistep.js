/**
 * The Freelancer Gate CF7 multistep wizard (e.g. /business-setup-dubai/).
 * Preserves native .cf7-step markup; advances steps and shows thank-you after submit.
 */
(() => {
  function initRoot(root) {
    if (!(root instanceof HTMLElement) || root.dataset.thefreelancergateMultistep === "1") return;
    const form = root.closest("form") || root.querySelector("form");
    if (!form) return;
    root.dataset.thefreelancergateMultistep = "1";

    const steps = Array.from(root.querySelectorAll(".cf7-step"));
    if (steps.length < 2) return;

    const stepNumber = root.querySelector("#step-number");
    const stepCount = root.querySelector(".step-count");
    let current = 0;

    function showStep(index) {
      current = Math.max(0, Math.min(index, steps.length - 1));
      steps.forEach((step, i) => {
        step.style.display = i === current ? "block" : "none";
      });
      if (stepNumber) stepNumber.textContent = String(current + 1);
      if (stepCount) {
        const thankYou = steps[current].classList.contains("step-6") ||
          steps[current].querySelector(".call-btn, .text_title");
        stepCount.style.display = thankYou ? "none" : "";
      }
      bindRadioGate();
      if (typeof window.__SP_INIT_PHONE_FLAGS__ === "function") {
        window.__SP_INIT_PHONE_FLAGS__();
      }
    }

    function stepValid(step) {
      if (!step) return true;
      const radios = step.querySelectorAll('input[type="radio"]');
      if (radios.length) return Array.from(radios).some((r) => r.checked);
      return true;
    }

    function bindRadioGate() {
      const step = steps[current];
      if (!step) return;
      const radios = step.querySelectorAll('input[type="radio"]');
      const nextBtn = step.querySelector(".next-btn");
      if (!radios.length || !nextBtn) return;
      const sync = () => {
        nextBtn.disabled = !stepValid(step);
      };
      radios.forEach((radio) => radio.addEventListener("change", sync));
      sync();
    }

    root.querySelectorAll(".next-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const step = btn.closest(".cf7-step");
        if (!stepValid(step)) return;
        if (current < steps.length - 1) showStep(current + 1);
      });
    });

    root.querySelectorAll(".prev-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        if (current > 0) showStep(current - 1);
      });
    });

    // Optional "Other" free-text on industry step
    form.querySelectorAll('input[name="radio-689"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const otherField =
          document.getElementById("other-text-wrap") ||
          radio.closest(".cf7-step")?.querySelector(".other-text-wrap");
        if (!otherField) return;
        const selected = form.querySelector('input[name="radio-689"]:checked');
        otherField.style.display =
          selected && /other/i.test(selected.value) ? "block" : "none";
      });
    });

    // Live WP custom: toggle .selected on radio labels (CF7 nests input in label)
    root.querySelectorAll('.wpcf7-form-control.wpcf7-radio input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const group = radio.closest(".wpcf7-form-control.wpcf7-radio");
        if (!group) return;
        group.querySelectorAll("label").forEach((lab) => lab.classList.remove("selected"));
        radio.closest("label")?.classList.add("selected");
      });
      if (radio.checked) radio.closest("label")?.classList.add("selected");
    });

    form.addEventListener("sp-contact-success", () => {
      const thankIdx = steps.findIndex(
        (s) => s.classList.contains("step-6") || s.querySelector(".call-btn"),
      );
      if (thankIdx >= 0) showStep(thankIdx);
    });

    // Also honor legacy CF7 event if ever dispatched
    document.addEventListener("wpcf7mailsent", () => {
      const thankIdx = steps.findIndex((s) => s.classList.contains("step-6"));
      if (thankIdx >= 0) showStep(thankIdx);
    });

    showStep(0);
  }

  function boot() {
    document.querySelectorAll(".form-main").forEach((root) => {
      if (root.querySelector(".cf7-step")) initRoot(root);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  setTimeout(boot, 600);
})();
