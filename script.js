document.addEventListener("DOMContentLoaded", function () {
  // Toggle menu mobile
  const menuToggle = document.querySelector(".mobile-menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // Scroll suave para links de navegação
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (!href || href === "#") return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
      if (navLinks) navLinks.classList.remove("active");
    });
  });

  // Testimonials modal
  const modal = document.getElementById("testimonials-modal");
  const modalBackdrop = document.getElementById("modal-backdrop");
  const modalClose = document.getElementById("modal-close");
  const openBtn = document.getElementById("open-testimonials");
  const openBtn2 = document.getElementById("open-testimonials-cta");
  let lastFocusedElement = null;
  let modalKeyHandler = null;

  function getFocusableElements(container) {
    if (!container) return [];
    const focusable = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(focusable).filter((el) => el.offsetParent !== null);

    modalKeyHandler = function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === "Tab") {
        const focusableNow = getFocusableElements(modal);
        if (focusableNow.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = focusableNow[0];
        const lastEl = focusableNow[focusableNow.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", modalKeyHandler);
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (modalKeyHandler) {
      document.removeEventListener("keydown", modalKeyHandler);
      modalKeyHandler = null;
    }
    try {
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function")
        lastFocusedElement.focus();
    } catch (err) {
      // ignore
    }
  }

  if (openBtn)
    openBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  if (openBtn2)
    openBtn2.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
  if (modalClose) modalClose.addEventListener("click", closeModal);
  // NOTE: Escape key handled by modalKeyHandler when modal is open (see openModal)

  // Form send handlers (Email / WhatsApp)
  const contactForm = document.querySelector(".contact-form");
  // the form will be submitted with a mailto link composed from the fields

  // Hide navbar on scroll down, show on scroll up
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    let lastScroll = window.pageYOffset || document.documentElement.scrollTop;
    let ticking = false;

    function handleScroll() {
      const current = window.pageYOffset || document.documentElement.scrollTop;
      // small deadzone
      if (Math.abs(current - lastScroll) < 5) {
        ticking = false;
        return;
      }

      if (current > lastScroll && current > 100) {
        navbar.classList.add("nav-hidden");
      } else {
        navbar.classList.remove("nav-hidden");
      }
      lastScroll = current <= 0 ? 0 : current;
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    });
  }

  function getFormData() {
    const data = {};
    if (!contactForm) return data;
    const f = new FormData(contactForm);
    for (const [k, v] of f.entries()) data[k] = v;
    return data;
  }

  // envia o formulário ao endpoint do servidor usando fetch (JSON)
  async function sendFormData() {
    if (!contactForm) return;
    const submitBtn = document.getElementById("submit-contact");
    const feedback = document.getElementById("form-feedback");

    const formData = new FormData(contactForm);
    const payload = {};
    for (const [k, v] of formData.entries()) payload[k] = v;

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.original = submitBtn.innerHTML;
        submitBtn.innerHTML = "Enviando...";
      }

      const res = await fetch("/.netlify/functions/send-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({
        success: false,
        message: "Resposta do servidor inválida.",
      }));

      if (res.ok && json.success) {
        if (feedback) {
          feedback.className = "form-feedback success";
          feedback.textContent =
            json.message || "Enviado com sucesso — em breve retornaremos.";
        }
        contactForm.reset();
      } else {
        if (feedback) {
          feedback.className = "form-feedback error";
          feedback.textContent =
            json.message || "Erro ao enviar. Tente novamente.";
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.className = "form-feedback error";
        feedback.textContent =
          "Erro ao conectar ao servidor. Tente novamente mais tarde.";
      }
    } finally {
      if (submitBtn) {
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML =
            submitBtn.dataset.original || "Enviar formulário";
        }, 1200);
      }
    }
  }

  // sendByEmail removed (we now post to server via sendFormData)

  // WhatsApp link helper: detect mobile vs desktop and open the correct scheme
  function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent || ""
    );
  }

  // Attach handlers to any link that has data-wa-phone/data-wa-text or class wa-link
  function setupWhatsAppLinks() {
    const waLinks = document.querySelectorAll("a.wa-link, a[data-wa-phone]");
    waLinks.forEach((a) => {
      a.addEventListener("click", function (ev) {
        const phone = a.getAttribute("data-wa-phone");
        const text = a.getAttribute("data-wa-text") || "";
        const encoded = encodeURIComponent(text);

        // build url depending on device
        let url = "";
        if (isMobileDevice()) {
          // native app attempt
          url = `whatsapp://send?phone=${phone}&text=${encoded}`;
          // try open native, but preserve fallback to web
          window.location.href = url;
          // don't prevent default — but still prevent further action
          ev.preventDefault();
        } else {
          // desktop fallback: use wa.me to preserve the same redirect behavior
          url = `https://wa.me/${phone}?text=${encoded}`;
          // open in new tab/window to ensure web client or app opens
          ev.preventDefault();
          window.open(url, "_blank", "noopener");

          // attempt to copy the plain text to clipboard as a fallback
          // so users who end up in the native app can paste if needed
          if (navigator.clipboard && text) {
            navigator.clipboard
              .writeText(text)
              .then(() => {
                showWaToast(
                  "Mensagem copiada — cole no WhatsApp se necessário"
                );
              })
              .catch(() => {
                // clipboard failed silently
              });
          } else {
            // older browsers: try execCommand fallback
            try {
              const ta = document.createElement("textarea");
              ta.value = text;
              ta.style.position = "fixed";
              ta.style.left = "-9999px";
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
              showWaToast("Mensagem copiada — cole no WhatsApp se necessário");
            } catch (err) {
              // can't copy, ignore
            }
          }
        }
      });
    });
  }

  // run setup for whatsapp links
  setupWhatsAppLinks();

  // small toast helper for WhatsApp copy fallback
  function showWaToast(msg) {
    try {
      const t = document.createElement("div");
      t.className = "wa-toast";
      t.textContent = msg;
      document.body.appendChild(t);
      // small entrance animation
      requestAnimationFrame(() => t.classList.add("visible"));
      setTimeout(() => {
        t.classList.remove("visible");
        setTimeout(() => t.remove(), 300);
      }, 3200);
    } catch (e) {
      // ignore
    }
  }

  function sendByWhatsApp() {
    const d = getFormData();
    const number = "5532987073537";
    const parts = [];
    parts.push(`Nome: ${d.nome || ""}`);
    parts.push(`Telefone: ${d.telefone || ""}`);
    parts.push(`Email: ${d.email || ""}`);
    parts.push(`Empresa: ${d.empresa || ""}`);
    parts.push(`Serviço: ${d.servico || ""}`);
    parts.push(`Faturamento: ${d.faturamento || ""}`);
    parts.push("Mensagem:");
    parts.push(d.mensagem || "");
    const text = encodeURIComponent(parts.join("\n"));
    const wa = `https://wa.me/${number}?text=${text}`;
    window.open(wa, "_blank");
  }


  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // run native validation first
      if (typeof contactForm.checkValidity === "function") {
        if (!contactForm.checkValidity()) {
          contactForm.reportValidity();
          return;
        }
      }

      // send the form data to the server (no mail client)
      await sendFormData();

      // feedback handled inside sendFormData() — nothing else required here
    });
  }

  // Back-to-top button behavior
  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    // show when scrolled down
    let backTick = false;
    function updateBackToTop() {
      if ((window.pageYOffset || document.documentElement.scrollTop) > 300) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
      backTick = false;
    }
    window.addEventListener("scroll", function () {
      if (!backTick) {
        window.requestAnimationFrame(updateBackToTop);
        backTick = true;
      }
    });

    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

try {
  const result = await sendFormData(formData);

  if (result.success) {
    window.location.href = "/obrigado.html";
    return;
  } else {
    alert("Erro ao enviar. Tente novamente.");
  }

} catch (error) {
  alert("Erro inesperado. Tente novamente.");
}
