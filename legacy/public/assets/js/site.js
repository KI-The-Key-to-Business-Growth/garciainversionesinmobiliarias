(function () {

  // ── Turnstile Invisible ──────────────────────────────────────────────────────
  // Motor compartido expuesto como window.GarciaTurnstile
  // property-detail.js lo consume para el formulario de ficha.
  // ────────────────────────────────────────────────────────────────────────────
  const TURNSTILE_SITEKEY = '0x4AAAAAADhZ9AUzLRzsy14F';

  // form element → { widgetId, pendingResolve }
  const _tsMap = new WeakMap();

  /**
   * Ejecuta cb cuando window.turnstile esté disponible.
   * Funciona tanto si Turnstile ya cargó como si aún no.
   */
  function whenTurnstileReady(cb) {
    if (window._tsReady || window.turnstile) { cb(); return; }
    document.addEventListener('ts:ready', cb, { once: true });
  }

  /**
   * Registra un widget invisible en el contenedor indicado y lo asocia al form.
   * Llama a whenTurnstileReady internamente para manejar carga async.
   */
  function initTurnstileForForm(form, containerId) {
    whenTurnstileReady(function () {
      const container = document.getElementById(containerId);
      if (!container || !window.turnstile) return;
      if (_tsMap.has(form)) return; // ya registrado

      const entry = { widgetId: null, pendingResolve: null };
      _tsMap.set(form, entry);

      entry.widgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITEKEY,
        execution: 'execute',          // no auto-ejecutar; dispara en submit
        appearance: 'interaction-only',// completamente invisible salvo captcha humano
        callback: function (token) {
          if (entry.pendingResolve) {
            entry.pendingResolve(token);
            entry.pendingResolve = null;
          }
        },
        'error-callback': function () {
          console.warn('[Turnstile] Error en verificación — fail-open');
          if (entry.pendingResolve) { entry.pendingResolve(''); entry.pendingResolve = null; }
        },
        'expired-callback': function () {
          if (entry.pendingResolve) { entry.pendingResolve(''); entry.pendingResolve = null; }
          if (entry.widgetId !== null) window.turnstile.reset(entry.widgetId);
        }
      });
    });
  }

  /**
   * Ejecuta el widget asociado al form y devuelve una Promise con el token.
   * Si Turnstile no está disponible, resuelve '' (el backend valida server-side).
   */
  function getTurnstileToken(form) {
    return new Promise(function (resolve) {
      if (!window.turnstile) { resolve(''); return; }
      const entry = _tsMap.get(form);
      if (!entry || entry.widgetId === null || entry.widgetId === undefined) {
        resolve(''); return;
      }
      entry.pendingResolve = resolve;
      window.turnstile.execute(entry.widgetId);
    });
  }

  function resetTurnstileForForm(form) {
    if (!window.turnstile) return;
    const entry = _tsMap.get(form);
    if (entry && entry.widgetId !== null && entry.widgetId !== undefined) {
      window.turnstile.reset(entry.widgetId);
    }
  }

  // API pública para property-detail.js y cualquier otro módulo
  window.GarciaTurnstile = {
    init: initTurnstileForForm,
    getToken: getTurnstileToken,
    reset: resetTurnstileForForm,
    whenReady: whenTurnstileReady
  };

  // ── Menú mobile ────────────────────────────────────────────────────────────
  const menuToggle     = document.getElementById("menuToggle");
  const menuClose      = document.getElementById("menuClose");
  const mobileMenu     = document.getElementById("mobileMenu");
  const mobileBackdrop = document.getElementById("mobileBackdrop");
  const mobileLinks    = document.querySelectorAll(".mobile-links a");
  const mobileLogoLink = document.getElementById("mobileLogoLink");

  function openMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.add("active");
    mobileMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("active");
    mobileMenu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
  }

  menuToggle?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  mobileBackdrop?.addEventListener("click", closeMenu);
  mobileLinks.forEach(link => link.addEventListener("click", closeMenu));
  mobileLogoLink?.addEventListener("click", closeMenu);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && mobileMenu?.classList.contains("active")) {
      closeMenu();
    }
  });

  // ── Header home: oscurece al scrollear ─────────────────────────────────────
  const siteHeader = document.getElementById("siteHeader");

  if (siteHeader) {
    function onScroll() {
      siteHeader.classList.toggle("is-scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ── Slideshow hero ──────────────────────────────────────────────────────────
  const slides = document.querySelectorAll(".hero-slide");
  let currentSlide = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
  }

  if (slides.length > 1) {
    setInterval(() => {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    }, 15000);
  }

  // ── Animaciones reveal ──────────────────────────────────────────────────────
  const revealElements = document.querySelectorAll(".reveal");
  let revealObserver;

  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealElements.forEach(el => revealObserver.observe(el));
    window._revealObserver = revealObserver;
  } else {
    revealElements.forEach(el => el.classList.add("visible"));
  }

  // ── Propiedades destacadas en home ─────────────────────────────────────────
  const featuredGrid = document.getElementById("featuredPropertiesGrid");
  if (featuredGrid) {
    (async function loadFeatured() {
      try {
        const res = await fetch("/api/properties");
        if (!res.ok) throw new Error("Error al cargar propiedades");
        const all = await res.json();
        const featured = all.slice(0, 3);

        if (!featured.length) {
          featuredGrid.innerHTML = '<p class="properties-empty">Próximamente nuevas oportunidades.</p>';
          return;
        }

        featuredGrid.innerHTML = featured.map(p => {
          const meta = [p.ambientes, p.banos, p.superficie].filter(Boolean);
          return `
            <article class="property-card reveal">
              <a href="/propiedad?id=${encodeURIComponent(p.id)}" class="property-card-link">
                <div class="property-image">
                  <img src="${p.imagen}" alt="${p.titulo}" loading="lazy" decoding="async" />
                  <span class="property-tag">${p.tag || p.operacion || "Propiedad"}</span>
                </div>
                <div class="property-body">
                  <p class="property-location">${p.ubicacion || ""}</p>
                  <h3 class="property-title">${p.titulo}</h3>
                  <p class="property-price">${p.precio || "Consultar"}</p>
                  ${p.descripcion ? `<p class="property-text">${p.descripcion.slice(0, 110)}${p.descripcion.length > 110 ? "…" : ""}</p>` : ""}
                  ${meta.length ? `<div class="property-meta">${meta.map(m => `<span>${m}</span>`).join("")}</div>` : ""}
                </div>
              </a>
            </article>`;
        }).join("");

        if (window._revealObserver) {
          featuredGrid.querySelectorAll(".reveal").forEach(el => window._revealObserver.observe(el));
        } else {
          featuredGrid.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
        }
      } catch (_) {
        featuredGrid.innerHTML = '<p class="properties-empty">No se pudieron cargar las propiedades.</p>';
      }
    })();
  }

  // ── Timestamps anti-bot ─────────────────────────────────────────────────────
  document.querySelectorAll('.js-form-loaded-at').forEach(el => {
    el.value = Date.now();
    const form = el.closest('form');
    if (form) {
      form.addEventListener('focusin', function setOnFocus() {
        el.value = Date.now();
      }, { once: true });
    }
  });

  // ── Formularios ─────────────────────────────────────────────────────────────
  function getFormName(form) {
    if (form.dataset.newsletter !== undefined) return "Newsletter";
    if (form.classList.contains("detail-contact-form")) return "Consulta de propiedad";
    if (form.classList.contains("property-contact-form")) return "Consulta de propiedad";
    return "Formulario principal";
  }

  function getLeadType(form) {
    if (form.dataset.newsletter !== undefined) return "newsletter";
    if (form.classList.contains("detail-contact-form")) return "consulta_propiedad";
    if (form.classList.contains("property-contact-form")) return "consulta_propiedad";
    return "consulta_general";
  }

  function pushTrackingEvent(eventName, payload = {}) {
    window.GarciaTracking?.pushEvent?.(eventName, payload);
  }

  function createEventId(eventName) {
    return (
      window.GarciaTracking?.eventId?.(eventName) ||
      `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    );
  }

  function enrichPayload(payload) {
    if (window.GarciaTracking?.enrichPayload) {
      return window.GarciaTracking.enrichPayload(payload);
    }
    return {
      ...payload,
      page_location: window.location.href,
      page_title: document.title,
      referrer: document.referrer || ""
    };
  }

  function showNewsletterSuccess(form) {
    const successMessage =
      document.getElementById("newsletterSuccess") ||
      form.parentElement?.querySelector(".newsletter-success") ||
      form.querySelector(".newsletter-success");

    if (!successMessage) return;
    successMessage.classList.add("show");
    setTimeout(() => successMessage.classList.remove("show"), 7000);
  }

  async function postForm(form, endpoint) {
    window.GarciaTracking?.addHiddenFields?.(form);

    const button = form.querySelector('button[type="submit"]');
    const originalText = button ? button.textContent : "";

    const formName = getFormName(form);
    const leadType = getLeadType(form);
    const eventId  = createEventId("form_submit");

    // Paso 1: bloquear botón mientras obtenemos token
    if (button) { button.disabled = true; button.textContent = "Verificando..."; }

    // Paso 2: obtener token Turnstile invisible (espera la respuesta de Cloudflare)
    let tsToken = '';
    try {
      tsToken = await getTurnstileToken(form);
    } catch (e) {
      console.warn('[Turnstile] Excepción al obtener token:', e.message);
    }

    // Paso 3: armar payload YA con el token disponible
    const rawData = Object.fromEntries(new FormData(form).entries());
    const data    = enrichPayload(rawData);

    // Inyectar token manualmente (garantía aunque FormData no lo capture)
    data['cf-turnstile-response'] = tsToken || rawData['cf-turnstile-response'] || '';

    data.form_name     = formName;
    data.lead_type     = leadType;
    data.event_id      = eventId;
    data.page_location = data.page_location || window.location.href;

    // Paso 4: evento form_submit (solo tras superar Turnstile)
    pushTrackingEvent("form_submit", {
      event_id:      eventId,
      form_name:     formName,
      lead_type:     leadType,
      property_id:   data.property_app_id || data.property_id || "",
      property_name: data.property_title  || "",
      page_location: window.location.href
    });

    if (button) button.textContent = "Enviando...";

    try {
      const response = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "No se pudo enviar.");
      }

      // Conversión confirmada: disparar generate_lead y eventos específicos
      pushTrackingEvent("generate_lead", {
        event_id:      result.event_id || eventId,
        form_name:     formName,
        lead_type:     leadType,
        property_id:   data.property_app_id || data.property_id || "",
        property_name: data.property_title  || "",
        crm_status:    result.crmStatus || "",
        crm_ok:        result.crmOk === true,
        page_location: window.location.href
      });

      if (leadType === "newsletter") {
        pushTrackingEvent("newsletter_signup", {
          event_id:      result.event_id || eventId,
          form_name:     formName,
          page_location: window.location.href
        });
      }

      form.reset();
      resetTurnstileForForm(form); // listo para siguiente envío

      if (leadType === "newsletter") {
        showNewsletterSuccess(form);
      } else {
        window.location.href = "/gracias-consulta";
      }

    } catch (error) {
      alert(error.message || "Hubo un error. Intentá nuevamente.");
      resetTurnstileForForm(form); // regenerar token en caso de error
    } finally {
      if (button) { button.disabled = false; button.textContent = originalText; }
    }
  }

  // ── Inicializar Turnstile invisible para cada formulario ────────────────────
  // Los contenedores ya están en el HTML con IDs predecibles.
  // Buscamos primero un hijo directo del form; si no, el id del HTML fijo.
  document.querySelectorAll("[data-crm-contact]").forEach((form, i) => {
    const containerId = `ts-contact-${i}`;
    // El contenedor puede estar dentro del form (index.html) o con id ya asignado
    let container = document.getElementById(containerId);
    if (!container) {
      // Fallback: buscar cualquier div[aria-hidden] hijo del form
      container = form.querySelector('div[aria-hidden="true"]');
      if (container) container.id = containerId;
    }
    if (container) initTurnstileForForm(form, containerId);
  });

  document.querySelectorAll("[data-newsletter]").forEach((form, i) => {
    const containerId = `ts-newsletter-${i}`;
    let container = document.getElementById(containerId);
    if (!container) {
      container = form.querySelector('div[aria-hidden="true"]');
      if (container) container.id = containerId;
    }
    if (container) initTurnstileForForm(form, containerId);
  });

  // ── Listeners de submit ─────────────────────────────────────────────────────
  document.querySelectorAll("[data-crm-contact]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      postForm(form, "/api/contact");
    });
  });

  document.querySelectorAll("[data-newsletter]").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      postForm(form, "/api/newsletter");
    });
  });

})();
