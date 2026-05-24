(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function showToast(message) {
    const toast = $("[data-toast-region]");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  function initWaveBackground() {
    const canvas = $(".interactive-wave-bg");
    const gridOverlay = $(".vertical-grid-overlay");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    let width = 0;
    let height = 0;
    let time = 0;
    let lastFrame = 0;
    const targetFrameMs = 1000 / 45;
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const targetMouse = { x: mouse.x, y: mouse.y };
    const colors = ["#A0A0FF", "#FFB0FF", "#B0FFFF"];

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = canvas.width = Math.floor(window.innerWidth * ratio);
      height = canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      width = window.innerWidth;
      height = window.innerHeight;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (event) => {
      targetMouse.x = event.clientX;
      targetMouse.y = event.clientY;
    });
    resize();

    function render(now = 0) {
      if (document.hidden) {
        window.requestAnimationFrame(render);
        return;
      }
      if (now - lastFrame < targetFrameMs) {
        window.requestAnimationFrame(render);
        return;
      }
      lastFrame = now;
      mouse.x += (targetMouse.x - mouse.x) * 0.12;
      mouse.y += (targetMouse.y - mouse.y) * 0.12;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      time += prefersReducedMotion ? 0 : 0.0025;

      if (gridOverlay) {
        const offset = (time * 7.5) % 80;
        gridOverlay.style.backgroundPosition = `${offset}px ${offset}px`;
      }

      const lines = window.innerWidth < 768 ? 7 : 9;
      const points = window.innerWidth < 768 ? 22 : 30;

      for (let i = 0; i < lines; i += 1) {
        ctx.beginPath();
        ctx.lineWidth = 1.1;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = 0.13 + (i / lines) * 0.09;

        for (let j = 0; j <= points; j += 1) {
          const x = (width / points) * j;
          let y = (height / 2) + Math.sin(j * 0.2 + time + i * 0.3) * 60;
          y += Math.sin(j * 0.1 - time * 0.5 + i * 0.1) * 30;
          const dist = Math.hypot(x - mouse.x, y - mouse.y);
          const influence = Math.max(0, 1 - dist / 400);
          y += influence * (mouse.y - y) * 0.4;
          y += (i - lines / 2) * 40;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      window.requestAnimationFrame(render);
    }
    render();
  }

  function initNavigation() {
    const links = $$("[data-section-link]");
    const sections = links.map((link) => document.getElementById(link.dataset.sectionLink)).filter(Boolean);
    const mobileMenu = $("[data-mobile-menu]");
    const mobileToggle = $("[data-toggle-mobile]");

    mobileToggle?.addEventListener("click", () => {
      const isOpen = !mobileMenu.classList.toggle("hidden");
      mobileToggle.setAttribute("aria-expanded", String(isOpen));
    });
    $$("[data-mobile-link]").forEach((link) => link.addEventListener("click", () => mobileMenu?.classList.add("hidden")));

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => link.classList.toggle("active", link.dataset.sectionLink === visible.target.id));
    }, { rootMargin: "-35% 0px -50% 0px", threshold: [0.1, 0.3, 0.6] });
    sections.forEach((section) => observer.observe(section));

    $$("[data-scroll-target]").forEach((button) => {
      button.addEventListener("click", () => scrollToId(button.dataset.scrollTarget));
    });
  }

  function initStats() {
    const stats = $$(".stat-counter");
    const countTo = (element) => {
      const target = Number.parseInt(element.dataset.target, 10);
      const start = performance.now();
      const duration = 1200;
      const update = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - progress) * (1 - progress);
        element.textContent = Math.floor(eased * target);
        if (progress < 1) window.requestAnimationFrame(update);
        else element.textContent = target;
      };
      window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countTo(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    stats.forEach((stat) => observer.observe(stat));
  }

  function initMarquee() {
    const marqueeTrack = $("#scroll-marquee");
    if (!marqueeTrack) return;
    let current = window.scrollY * 0.42;
    let target = current;
    let drift = 0;
    let cycle = 0;

    function measureCycle() {
      cycle = marqueeTrack.scrollWidth / 2;
    }

    window.addEventListener("scroll", () => {
      target = window.scrollY * 0.42;
    }, { passive: true });
    window.addEventListener("resize", measureCycle);
    measureCycle();

    function animate() {
      current += (target - current) * 0.09;
      drift = prefersReducedMotion ? 0 : drift + 0.32;
      const offset = cycle ? (current + drift) % cycle : current + drift;
      marqueeTrack.style.transform = `translate3d(-${offset}px, 0, 0)`;
      window.requestAnimationFrame(animate);
    }

    animate();
  }

  function initDialogs() {
    const terminalDialog = $("[data-terminal-dialog]");
    const deployDialog = $("[data-deploy-dialog]");
    const customToolDialog = $("[data-custom-tool-dialog]");
    $$("[data-open-terminal]").forEach((button) => button.addEventListener("click", () => terminalDialog?.showModal()));
    $$("[data-open-deploy]").forEach((button) => button.addEventListener("click", () => deployDialog?.showModal()));
    $("[data-open-custom-tool]")?.addEventListener("click", () => customToolDialog?.showModal());

    $$("[data-toast]").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = button.closest("dialog");
        if (dialog) dialog.close();
        showToast(button.dataset.toast);
      });
    });

    $("[data-save-custom-tool]")?.addEventListener("click", () => {
      const input = $("#tool-name");
      const value = input?.value.trim() || "custom_tool";
      customToolDialog?.close();
      showToast(`${value} staged for the MCP catalog.`);
      if (input) input.value = "";
    });
  }

  function initInteractiveCards() {
    $$("[data-card-toggle]").forEach((card) => {
      card.addEventListener("click", () => {
        const extra = $("[data-card-extra]", card);
        extra?.classList.toggle("hidden");
      });
    });

    $$("[data-language-picker] button").forEach((button) => {
      button.addEventListener("click", () => {
        $$("[data-language-picker] button").forEach((item) => item.className = "font-code-sm text-code-sm opacity-60 text-white");
        button.className = "font-code-sm text-code-sm text-iridescent-start font-bold";
        showToast(`${button.textContent} language profile selected.`);
      });
    });

    const loopOutput = $("[data-loop-output]");
    $$("[data-loop-detail]").forEach((button) => {
      button.addEventListener("click", () => {
        loopOutput.textContent = `${button.querySelector("strong").textContent}: ${button.dataset.loopDetail}`;
      });
    });
  }

  function initToolFilters() {
    const pills = $$("[data-filter]");
    const cards = $$(".tool-card");
    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        const filter = pill.dataset.filter;
        pills.forEach((item) => item.classList.toggle("active", item === pill));
        cards.forEach((card) => card.classList.toggle("is-hidden", filter !== "all" && card.dataset.category !== filter));
      });
    });
  }

  function initCopyButtons() {
    $$("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const code = $("code", button.parentElement)?.textContent || "";
        const value = code.trim();
        let copied = false;
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch {
          const codeElement = $("code", button.parentElement);
          const textarea = document.createElement("textarea");
          textarea.value = value;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          copied = document.execCommand("copy");
          textarea.remove();
          if (!copied && codeElement) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(codeElement);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        button.textContent = copied ? "Copied" : "Selected";
        showToast(copied ? "Copied to clipboard." : "Code selected. Press Ctrl+C to copy.");
        window.setTimeout(() => { button.textContent = "Copy"; }, 1600);
      });
    });
  }

  function initTerminalLines() {
    const terminal = $("[data-terminal-lines]");
    if (!terminal || prefersReducedMotion) return;
    const lines = $$("p", terminal);
    lines.forEach((line, index) => {
      line.style.opacity = "0";
      line.style.transform = "translateY(6px)";
      window.setTimeout(() => {
        line.style.transition = "opacity 220ms ease, transform 220ms ease";
        line.style.opacity = "";
        line.style.transform = "";
      }, index * 160);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initWaveBackground();
    initNavigation();
    initStats();
    initMarquee();
    initDialogs();
    initInteractiveCards();
    initToolFilters();
    initCopyButtons();
    initTerminalLines();
  });
})();
