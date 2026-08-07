/**
 * APB Post View Tracker
 * Tracks post views via AJAX.
 *
 * @package APB
 */
(function () {
	if (window.apbViewTracked) {
		return;
	}
	window.apbViewTracked = true;

	const { ajaxUrl, nonce, postId } = apbPostViewTracker;

	document.addEventListener('DOMContentLoaded', function () {
		fetch(ajaxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `action=apb_post_view&post_id=${postId}&nonce=${nonce}`
		});
	});
})();
