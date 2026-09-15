/* ==========================================================================
   THE COFFEE SHOP — script.js
   Vanilla JS. No dependencies. Organized into small, independent modules
   that each init() once the DOM is ready.
   ========================================================================== */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     0. PRELOADER
     Hides once window fully loads (fonts + images), with a safety timeout
     so a slow asset never traps the user behind the loader.
     ------------------------------------------------------------------------ */
  function initPreloader() {
    const el = document.getElementById("preloader");
    if (!el) return;
    const hide = () => el.classList.add("is-hidden");
    window.addEventListener("load", hide, { once: true });
    setTimeout(hide, 2500); // safety fallback
  }

  /* ------------------------------------------------------------------------
     1. HEADER — scroll state + mobile nav toggle
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("is-open");
        toggle.classList.toggle("is-open", isOpen);
        toggle.setAttribute("aria-expanded", String(isOpen));
      });

      // Close mobile nav after tapping a link
      nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          nav.classList.remove("is-open");
          toggle.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ------------------------------------------------------------------------
     2. PARALLAX ENGINE
     Single requestAnimationFrame loop drives every [data-speed] element.
     translate3d + will-change keep it on the compositor thread so it
     stays smooth on mobile. Disabled entirely for prefers-reduced-motion.
     ------------------------------------------------------------------------ */
  function initParallax() {
    if (prefersReducedMotion) return;

    const layers = Array.from(document.querySelectorAll("[data-speed]"));
    if (!layers.length) return;

    layers.forEach((el) => { el.style.willChange = "transform"; });

    let ticking = false;
    let lastScroll = window.scrollY;

    function update() {
      const viewportH = window.innerHeight;

      layers.forEach((el) => {
        const speed = parseFloat(el.dataset.speed) || 0.2;
        const rect = el.getBoundingClientRect();

        // Only bother animating elements anywhere near the viewport
        if (rect.bottom < -viewportH || rect.top > viewportH * 2) return;

        // Distance of the element's center from the viewport center,
        // scaled by its speed — this is what creates the differential
        // (multi-layer) parallax effect between background and foreground.
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportH / 2;
        const delta = (elementCenter - viewportCenter) * speed * -0.15;

        el.style.transform = `translate3d(0, ${delta.toFixed(2)}px, 0)`;
      });

      ticking = false;
    }

    function onScroll() {
      lastScroll = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update(); // run once on load
  }

  /* ------------------------------------------------------------------------
     3. SCROLL REVEALS
     IntersectionObserver fades/slides elements in once, then unobserves
     — cheap, and avoids re-triggering on every scroll direction change.
     ------------------------------------------------------------------------ */
  function initReveals() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Small stagger for groups of cards revealing together
            const delay = (entry.target.dataset.revealIndex || 0) * 60;
            setTimeout(() => entry.target.classList.add("is-visible"), delay);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    items.forEach((el, i) => {
      el.dataset.revealIndex = i % 6; // cap stagger so late items don't lag
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------------
     4. MENU FILTER
     Filters .menu-card elements by data-category without re-rendering
     the DOM — just toggles a class, so it stays instant.
     ------------------------------------------------------------------------ */
  function initMenuFilter() {
    const chips = document.querySelectorAll(".filter-chip");
    const cards = document.querySelectorAll(".menu-card");
    if (!chips.length || !cards.length) return;

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => {
          c.classList.remove("is-active");
          c.setAttribute("aria-selected", "false");
        });
        chip.classList.add("is-active");
        chip.setAttribute("aria-selected", "true");

        const filter = chip.dataset.filter;
        cards.forEach((card) => {
          const match = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-hidden", !match);
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. STATS COUNTER
     Animates each [data-count] number from 0 to its target once the
     stats section scrolls into view. Uses an eased rAF loop, not
     setInterval, so it stays smooth.
     ------------------------------------------------------------------------ */
  function initCounters() {
    const nums = document.querySelectorAll(".stat-item__number");
    if (!nums.length) return;

    const animateCount = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      const suffix = el.dataset.suffix || "";
      const duration = 1600;
      const start = performance.now();

      if (prefersReducedMotion) {
        el.textContent = `${target}${suffix}`;
        return;
      }

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        // easeOutExpo for a satisfying "settle" at the end
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const value = Math.round(eased * target);
        el.textContent = `${value}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      nums.forEach(animateCount);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    nums.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     6. TESTIMONIAL CAROUSEL
     Lightweight scroll-snap-free carousel: translates the track by
     100% per slide, wraps at both ends, supports arrows, dots,
     keyboard arrows, swipe, and autoplay that pauses on interaction.
     ------------------------------------------------------------------------ */
  function initReviewsCarousel() {
    const track = document.getElementById("reviewsTrack");
    const dotsWrap = document.getElementById("reviewDots");
    const prevBtn = document.getElementById("reviewPrev");
    const nextBtn = document.getElementById("reviewNext");
    if (!track || !dotsWrap) return;

    const slides = Array.from(track.children);
    let index = 0;
    let autoplayTimer = null;

    // Build dots
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.setAttribute("aria-label", `Go to review ${i + 1}`);
      if (i === 0) dot.classList.add("is-active");
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function render() {
      track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
      dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
      restartAutoplay();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    if (nextBtn) nextBtn.addEventListener("click", next);
    if (prevBtn) prevBtn.addEventListener("click", prev);

    // Track needs to behave like a flex row of full-width slides
    track.style.display = "flex";
    track.style.transition = prefersReducedMotion ? "none" : "transform 0.6s cubic-bezier(0.16,1,0.3,1)";
    slides.forEach((s) => { s.style.flex = "0 0 100%"; });

    // Keyboard support
    track.closest(".reviews__carousel").addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });

    // Touch swipe support
    let touchStartX = 0;
    track.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
      stopAutoplay();
    }, { passive: true });
    track.addEventListener("touchend", (e) => {
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(delta) > 40) (delta < 0 ? next() : prev());
      else restartAutoplay();
    }, { passive: true });

    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }
    function restartAutoplay() {
      stopAutoplay();
      if (!prefersReducedMotion) autoplayTimer = setInterval(next, 6500);
    }

    render();
    restartAutoplay();
  }

  /* ------------------------------------------------------------------------
     7. CONTACT FORM
     Lightweight inline validation + a friendly success state.
     No backend here — swap the submit handler for a real fetch() call.
     ------------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.getElementById("contactForm");
    const success = document.getElementById("formSuccess");
    if (!form) return;

    const validators = {
      fullName: (v) => v.trim().length >= 2 || "Please enter your name.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address.",
    };

    function showError(field, message) {
      const span = form.querySelector(`[data-error-for="${field}"]`);
      if (span) span.textContent = message || "";
    }

    function validateField(input) {
      const rule = validators[input.name];
      if (!rule) return true;
      const result = rule(input.value);
      if (result === true) {
        showError(input.name, "");
        return true;
      }
      showError(input.name, result);
      return false;
    }

    Object.keys(validators).forEach((name) => {
      const input = form.elements[name];
      if (input) input.addEventListener("blur", () => validateField(input));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valid = true;
      Object.keys(validators).forEach((name) => {
        const input = form.elements[name];
        if (input && !validateField(input)) valid = false;
      });
      if (!valid) return;

      // Simulate a successful submission (replace with a real request).
      if (success) {
        success.classList.add("is-visible");
        setTimeout(() => success.classList.remove("is-visible"), 5000);
      }
      form.reset();
    });
  }

  /* ------------------------------------------------------------------------
     8. BACK TO TOP
     ------------------------------------------------------------------------ */
  function initBackToTop() {
    const btn = document.getElementById("backToTop");
    if (!btn) return;
    window.addEventListener("scroll", () => {
      btn.classList.toggle("is-visible", window.scrollY > 700);
    }, { passive: true });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------------------
     9. CUSTOM CURSOR (desktop micro-interaction, purely decorative)
     ------------------------------------------------------------------------ */
  function initCursor() {
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
    const dot = document.getElementById("cursorDot");
    if (!dot) return;

    let x = 0, y = 0;
    document.addEventListener("mousemove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      dot.classList.add("is-active");
    });

    const hoverTargets = "a, button, .menu-card, input, textarea, select";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverTargets)) dot.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverTargets)) dot.classList.remove("is-hover");
    });
  }

  /* ------------------------------------------------------------------------
     10. SMOOTH ANCHOR SCROLL (for browsers/edge-cases where CSS
     scroll-behavior alone doesn't account for the fixed header)
     ------------------------------------------------------------------------ */
  function initAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (id.length <= 1) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const headerOffset = document.getElementById("siteHeader")?.offsetHeight || 80;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset + 1;
        window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    initPreloader();
    initHeader();
    initParallax();
    initReveals();
    initMenuFilter();
    initCounters();
    initReviewsCarousel();
    initContactForm();
    initBackToTop();
    initCursor();
    initAnchorScroll();
  });
})();
