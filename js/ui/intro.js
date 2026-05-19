// Django equivalent: No direct server-side equivalent.
// Django renders templates on page load; this animation plays once on the
// client side before revealing the setup screen.
// The 3.4s delay matches the CSS animation durations defined in main.css:
//   beam (2s) + logo fade (1s @ 1.1s delay) + tagline (0.8s @ 1.9s) + line (1s @ 2.6s)

(function initIntro() {
  setTimeout(() => {
    const intro = document.getElementById('intro');
    intro.style.transition = 'opacity .8s';
    intro.style.opacity    = '0';
    setTimeout(() => {
      intro.style.display = 'none';
      const setup = document.getElementById('setup');
      setup.style.display = 'flex';
      // Small delay so the browser registers the display change before adding
      // the 'vis' class that triggers the CSS opacity transition.
      setTimeout(() => setup.classList.add('vis'), 50);
    }, 800);
  }, 3400);
})();
