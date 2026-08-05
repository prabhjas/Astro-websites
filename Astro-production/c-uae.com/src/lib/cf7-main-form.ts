/**
 * Shared C-UAE CF7 "main-form" markup — used by footer, Contact Us, and single posts.
 * Keeps all visible fields inside `.main-form` so child-theme purple styles apply.
 */

export type Cf7FormVariant = "footer" | "contact" | "blog";

export type Cf7MainFormOptions = {
  formId: number | string;
  unitTag: string;
  containerPost?: number | string;
  actionPath?: string;
  variant?: Cf7FormVariant;
};

const HELP_OPTIONS_FULL = [
  "Free zone",
  "Mainland",
  "Offshore",
  "Visa Services",
  "PRO Services",
] as const;

const HELP_OPTIONS_BLOG = ["Free zone", "Mainland", "Offshore"] as const;

const CONSENT =
  "I consent to receiving marketing emails from C-UAE and other Connect Group companies.";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function trackingFields(): string {
  const keys = [
    "campaign_id",
    "adgroup_id",
    "creative_id",
    "keyword",
    "matchtype",
    "device",
    "network",
    "placement",
    "target_id",
    "adposition",
    "loc_interest_ms",
    "loc_physical_ms",
  ];
  return keys
    .map(
      (key) => `<div style="display:none;" class="${key}" id="transaction_hide">
	<p><span class="wpcf7-form-control-wrap" data-name="${key}"><textarea cols="40" rows="10" maxlength="2000" class="wpcf7-form-control wpcf7-textarea" id="${key}" aria-invalid="false" placeholder="No Tag" name="${key}"></textarea></span>
	</p>
</div>`,
    )
    .join("\n");
}

/** Canonical CF7 main-form HTML for C-UAE. */
export function renderCf7MainForm(opts: Cf7MainFormOptions): string {
  const variant: Cf7FormVariant = opts.variant || "footer";
  const formId = String(opts.formId || "191");
  const unitTag = opts.unitTag || `wpcf7-f${formId}-o1`;
  const containerPost = String(opts.containerPost ?? "0");
  const actionPath = (opts.actionPath || "/").replace(/\?.*$/, "");
  const action = `${actionPath}${actionPath.includes("?") ? "&" : "?"}nowprocket=1#${unitTag}`;

  const isBlog = variant === "blog";
  const wrapperClass = isBlog ? "main-form blog-form" : "main-form";
  const namePh = isBlog ? "Your full name*" : "Full Name*";
  const emailPh = isBlog ? "Your email ID*" : "Email ID*";
  const msgPh = isBlog
    ? "Tell us your goal, we'll help you acheive it..."
    : "Tell us your goal, and we'll help you achieve it...";
  const submitLabel = isBlog ? "Send Message" : "Submit";
  const helpOptions = isBlog ? HELP_OPTIONS_BLOG : HELP_OPTIONS_FULL;

  const nameBlock = isBlog
    ? `<div>
		<p><span class="wpcf7-form-control-wrap" data-name="your-name"><input size="40" maxlength="400" class="wpcf7-form-control wpcf7-text wpcf7-validates-as-required" aria-required="true" aria-invalid="false" placeholder="${esc(namePh)}" value="" type="text" name="your-name" /></span>
		</p>
	</div>`
    : `<div>
		<p><label>*Full Name</label><br />
<span class="wpcf7-form-control-wrap" data-name="your-name"><input size="40" maxlength="400" class="wpcf7-form-control wpcf7-text wpcf7-validates-as-required" aria-required="true" aria-invalid="false" placeholder="${esc(namePh)}" value="" type="text" name="your-name" /></span>
		</p>
	</div>`;

  const emailBlock = isBlog
    ? `<div>
		<p><span class="wpcf7-form-control-wrap" data-name="your-email"><input size="40" maxlength="400" class="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email" aria-required="true" aria-invalid="false" placeholder="${esc(emailPh)}" value="" type="email" name="your-email" /></span>
		</p>
	</div>`
    : `<div>
		<p><label>*Email ID</label><br />
<span class="wpcf7-form-control-wrap" data-name="your-email"><input size="40" maxlength="400" class="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-email" aria-required="true" aria-invalid="false" placeholder="${esc(emailPh)}" value="" type="email" name="your-email" /></span>
		</p>
	</div>`;

  const helpOptsHtml = helpOptions
    .map((o) => `<option value="${esc(o)}">${esc(o)}</option>`)
    .join("");

  const msgLabel = isBlog ? "" : `<label> *Your Message</label><br />`;

  return `<div class="wpcf7 no-js" id="${esc(unitTag)}" lang="en-US" dir="ltr" data-wpcf7-id="${esc(formId)}">
<div class="screen-reader-response"><p role="status" aria-live="polite" aria-atomic="true"></p> <ul></ul></div>
<form action="${esc(action)}" method="post" class="wpcf7-form init" aria-label="Contact form" novalidate="novalidate" data-status="init">
<fieldset class="hidden-fields-container"><input type="hidden" name="_wpcf7" value="${esc(formId)}" /><input type="hidden" name="_wpcf7_version" value="6.1.6" /><input type="hidden" name="_wpcf7_locale" value="en_US" /><input type="hidden" name="_wpcf7_unit_tag" value="${esc(unitTag)}" /><input type="hidden" name="_wpcf7_container_post" value="${esc(containerPost)}" /><input type="hidden" name="_wpcf7_posted_data_hash" value="" />
</fieldset>
<div class="${wrapperClass}">
	${nameBlock}
	${emailBlock}
	<div>
		<p><label>*Contact number</label><br />
<span class="wpcf7-form-control-wrap" data-name="phonetext-257"><input size="40" class="wpcf7-form-control wpcf7-phonetext wpcf7-validates-as-required wpcf7-text wpcf7-validates-as-phonetext" data-numberonly="true" aria-required="true" aria-invalid="false" value="" type="text" name="phonetext-257" /><input type="hidden" name="phonetext-257-country-code" class="wpcf7-phonetext-country-code" /></span>
		</p>
	</div>
	<div id="transaction_hide">
		<p><span class="wpcf7-form-control-wrap" data-name="countrytext-666"><input size="40" class="wpcf7-form-control wpcf7-countrytext wpcf7-text wpcf7-validates-as-countrytext" aria-invalid="false" value="" type="text" name="countrytext-666" /></span>
		</p>
	</div>
	<div class="opt">
		<p><label>*Get help with</label><br />
<span class="wpcf7-form-control-wrap" data-name="menu-612"><select class="wpcf7-form-control wpcf7-select" aria-invalid="false" name="menu-612">${helpOptsHtml}</select></span>
		</p>
	</div>
	<div>
		<p>${msgLabel}<span class="wpcf7-form-control-wrap" data-name="your-message"><textarea cols="40" rows="10" maxlength="2000" class="wpcf7-form-control wpcf7-textarea" aria-invalid="false" placeholder="${esc(msgPh)}" name="your-message"></textarea></span>
		</p>
	</div>
	<div class="bar">
		<p><span class="wpcf7-form-control-wrap" data-name="checkbox-510"><span class="wpcf7-form-control wpcf7-checkbox"><span class="wpcf7-list-item first last"><label><input type="checkbox" name="checkbox-510[]" value="${esc(CONSENT)}" checked="checked" /><span class="wpcf7-list-item-label">${esc(CONSENT)}</span></label></span></span></span>
		</p>
	</div>
	<p><input class="wpcf7-form-control wpcf7-submit has-spinner" type="submit" value="${esc(submitLabel)}" />
	</p>
</div>
<input class="wpcf7-form-control wpcf7-hidden" id="testgclid" value="" type="hidden" name="gclid" />
<input class="wpcf7-form-control wpcf7-hidden" id="initial_url" value="" type="hidden" name="initial_url" />
${trackingFields()}
<div class="wpcf7-response-output" aria-hidden="true"></div>
</form>
</div>`;
}

/**
 * Replace every CF7 block in Elementor HTML with the canonical main-form.
 * Detects form id / unit tag / container post from existing markup.
 */
export function injectCanonicalCf7Forms(
  html: string,
  defaults?: { path?: string; variant?: Cf7FormVariant },
): string {
  if (!html || !/class="wpcf7\b/.test(html)) return html;

  return html.replace(
    /<div class="wpcf7\b[^>]*>[\s\S]*?<\/form>\s*<\/div>/gi,
    (block) => {
      // Keep multistep wizards (business-setup etc.) — do not replace with simple main-form
      if (
        /cf7-step|step-count|class="form-main"/.test(block) &&
        /cf7-step/.test(block)
      ) {
        return block;
      }

      const formId =
        block.match(/data-wpcf7-id=["'](\d+)["']/)?.[1] ||
        block.match(/name="_wpcf7"\s+value=["'](\d+)["']/)?.[1] ||
        "191";
      const unitTag =
        block.match(/id=["'](wpcf7-f[^"']+)["']/)?.[1] ||
        block.match(/name="_wpcf7_unit_tag"\s+value=["']([^"']+)["']/)?.[1] ||
        `wpcf7-f${formId}-o1`;
      const containerPost =
        block.match(/name="_wpcf7_container_post"\s+value=["']([^"']*)["']/)?.[1] ||
        "0";

      let variant: Cf7FormVariant =
        defaults?.variant ||
        (formId === "4735" || /blog-form/.test(block) ? "blog" : "contact");

      // Footer band uses form 191 without blog-form
      if (/footer_raj/.test(html) && formId === "191" && !defaults?.variant) {
        // only if this block sits in footer context — caller should pass variant
      }

      const path =
        defaults?.path ||
        block.match(/action=["']([^"'?#]+)/)?.[1] ||
        "/";

      return renderCf7MainForm({
        formId,
        unitTag,
        containerPost,
        actionPath: path,
        variant,
      });
    },
  );
}
