document.addEventListener("DOMContentLoaded", function () {
	const links = document.querySelectorAll(".nav-links a");
	const currentPath = window.location.pathname;

	links.forEach((link) => {
		const href = link.getAttribute("href");
		if (currentPath.startsWith(href)) {
			link.classList.add("active");
		}
	});
});
