// Global translations cache
const translations = {};

async function loadTranslations(lang){
  const resp = await fetch(`assets/i18n/${lang}.json`);
  return resp.json();
}

const SUPPORTED_LANGS = ["fr", "en", "ru"];

// --- Helper Functions ---

const hideLoader = () => {
  const loader = document.querySelector(".loader");
  if (loader) {
    loader.classList.add("hidden");
  }
};

const setAppTheme = (theme) => {
  document.body.classList.toggle("dark-mode", theme === "dark");
  try {
    localStorage.setItem("theme", theme);
  } catch (e) {
    console.error("Failed to set theme in localStorage:", e);
  }
};

const updateMeta = (dict) => {
  if (dict.metaTitle) document.title = dict.metaTitle;
  if (dict.metaDesc) {
    const metaDescEl =
      document.querySelector(
        'meta[name="description"][data-key="metaDesc"]'
      ) || document.querySelector('meta[name="description"]');
    if (metaDescEl) metaDescEl.setAttribute("content", dict.metaDesc);
  }
};

const setLanguage = async (lang) => {
  const code = SUPPORTED_LANGS.includes(lang) ? lang : "fr";

  if (!translations[code]) {
    try {
      translations[code] = await loadTranslations(code);
    } catch (e) {
      console.error("Failed to load translations:", e);
      if (!translations.fr) {
        translations.fr = await loadTranslations("fr");
      }
    }
  }

  const dict = translations[code] || translations.fr;
  document.documentElement.lang = code;
  updateMeta(dict);

  const allowHtmlKeys = new Set([
    "contactParisP", 
    "contactNiceP",
    "legalPublicationText",
    "legalHostingText",
    "legalMediatorText",
    "expertiseSocietesCompetencesList", // <-- AJOUTEZ CETTE LIGNE
    "expertiseCommercialCompetencesList" // <-- AJOUTEZ CETTE LIGNE
]);

  document.querySelectorAll("[data-key]").forEach((el) => {
    const key = el.dataset.key;
    if (!key || !(key in dict)) return;

    if (allowHtmlKeys.has(key)) {
      el.innerHTML = dict[key];
    } else if (el.tagName === "TITLE") {
      document.title = dict[key];
    } else if (el.tagName === "META") {
      el.setAttribute("content", dict[key]);
    } else if (el.tagName === "INPUT" && el.type === "search") {
      el.placeholder = dict[key];
    } else {
      el.textContent = dict[key];
    }
  });

  const langSwitcher = document.querySelector(".lang");
  if (langSwitcher) {
    langSwitcher.querySelectorAll("button").forEach((btn) => {
      const isActive = btn.dataset.lang === code;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }
  try {
    localStorage.setItem("lang", code);
  } catch (e) {
    console.error("Failed to save language in localStorage:", e);
  }
};

// Global reference for the IntersectionObserver to reuse/re-observe
let animationObserver = null;

const setupAnimations = () => {
  const animateTargets = document.querySelectorAll("[data-animate]");

  if (animationObserver) {
    animationObserver.disconnect(); // Stop observing previous elements
  }

  // Remove 'in' class from all animated elements to allow re-animation on pageshow
  animateTargets.forEach((el) => el.classList.remove("in"));

  if ("IntersectionObserver" in window) {
    animationObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        threshold: 0,
        rootMargin: "0px",
      }
    );
    animateTargets.forEach((el) => animationObserver.observe(el));
  } else {
    animateTargets.forEach((el) => el.classList.add("in"));
  }
};

const setupHeaderShadow = () => {
  const header = document.querySelector("header.site");
  if (header) {
    const handleScroll = () => {
      header.style.boxShadow =
        window.scrollY > 10 ? "0 6px 20px rgba(0,0,0,.08)" : "none";
    };
    // Ensure only one scroll listener is active
    if (!header._scrollHandler) { // Check if handler is already stored
        header._scrollHandler = handleScroll; // Store it
        window.addEventListener("scroll", header._scrollHandler, { passive: true });
    }
    handleScroll(); // Call once on setup
  }
};

const setupDrawer = () => {
  const toggle = document.querySelector(".menu-toggle");
  const drawer = document.querySelector(".drawer");
  if (!toggle || !drawer) return;
  
  const closeButton = drawer.querySelector(".close-menu-btn");
  const focusableElements = 'a[href], button:not([disabled])';
  let focusableContent;
  let firstFocusableElement;
  let lastFocusableElement;
let lastScrollY = 0;

const openDrawer = () => {
    lastFocused = document.activeElement;
    drawer.hidden = false;
    drawer.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    
    // Mémorise la position de défilement actuelle et désactive le défilement du corps de la page
    lastScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lastScrollY}px`;
    document.body.style.width = '100%';
	document.body.classList.add('drawer-open');
    document.querySelectorAll('main, .footer, .topbar').forEach(el => el.classList.add('is-blurred'));
    
    focusableContent = Array.from(drawer.querySelectorAll(focusableElements));
    firstFocusableElement = focusableContent[0];
    lastFocusableElement = focusableContent[focusableContent.length - 1];
    
    setTimeout(() => {
        firstFocusableElement.focus();
    }, 350);
    
    document.addEventListener('keydown', trapTabKey);
};

const closeDrawer = () => {
    drawer.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    
    // Rétablit les styles du corps et restaure la position de défilement sans animation
    const bodyStyle = document.body.style;
    bodyStyle.position = '';
    bodyStyle.top = '';
    bodyStyle.width = '';
    
    // Désactive temporairement le défilement doux pour éviter l'animation
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, lastScrollY);
    document.documentElement.style.scrollBehavior = 'smooth'; // Réactive le défilement doux
	document.body.classList.remove('drawer-open');
    document.querySelectorAll('main, .footer, .topbar').forEach(el => el.classList.remove('is-blurred'));

    setTimeout(() => {
        drawer.hidden = true;
    }, 350); 
    
    if (lastFocused) lastFocused.focus();
    document.removeEventListener('keydown', trapTabKey);
};

  const trapTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstFocusableElement) {
        lastFocusableElement.focus();
        e.preventDefault();
      }
    } else { // Tab
      if (document.activeElement === lastFocusableElement) {
        firstFocusableElement.focus();
        e.preventDefault();
      }
    }
  };

  toggle.addEventListener('click', () => {
    if (drawer.classList.contains('is-open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  closeButton.addEventListener('click', closeDrawer);
  drawer.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
  
  // Fermer le menu en cliquant sur un lien
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
        // Pour la navigation sur la même page, on ferme juste le menu
        if (link.getAttribute('href').startsWith('#')) {
            closeDrawer();
        } 
        // Pour les autres liens, le script de transition de page prendra le relais
    });
  });
};

const setupFooterYear = () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
};

const setupDarkModeToggle = () => {
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    let initialTheme = "light";
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        initialTheme = savedTheme;
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        initialTheme = "dark";
      }
    } catch (e) {
      console.error("Failed to get theme from localStorage:", e);
    }
    setAppTheme(initialTheme);

    // Remove existing listener before re-adding to prevent duplicates
    if (themeToggle._toggleHandler) {
      themeToggle.removeEventListener("click", themeToggle._toggleHandler);
    }
    themeToggle._toggleHandler = () => { // Store handler for removal
      const newTheme = document.body.classList.contains("dark-mode")
        ? "light"
        : "dark";
      setAppTheme(newTheme);
    };
    themeToggle.addEventListener("click", themeToggle._toggleHandler);
  }
};

const setupLanguageSwitcher = async () => {
  const langSwitcher = document.querySelector(".lang");
  // Determine initial language outside of the event listener for global access
  let initialLang = "fr";
  try {
    const saved = localStorage.getItem("lang");
    if (saved && SUPPORTED_LANGS.includes(saved)) initialLang = saved;
    else {
      const nav = (navigator.language || "fr").slice(0, 2).toLowerCase();
      initialLang = SUPPORTED_LANGS.includes(nav) ? nav : "fr";
    }
  } catch (e) {
    console.error("Failed to determine initial language:", e);
  }
  await setLanguage(initialLang); // Initial language setting

  if (langSwitcher) {
    // Remove existing listener before re-adding to prevent duplicates
    if (langSwitcher._clickHandler) {
      langSwitcher.removeEventListener("click", langSwitcher._clickHandler);
    }
    langSwitcher._clickHandler = async (e) => { // Store handler for removal
      const target = e.target;
      if (target && target.tagName === "BUTTON") {
        await setLanguage(target.dataset.lang);
      }
    };
    langSwitcher.addEventListener("click", langSwitcher._clickHandler);
  }
};

// Map to store carousel instances and their auto-scroll intervals/timeouts
const carouselInstances = new Map();

function setupInfiniteCarousel(shell) {
  const track = shell.querySelector(".carousel-track");
  if (!track) return;

  // Nettoyage des instances précédentes pour éviter les bugs
  if (carouselInstances.has(shell)) {
    const instance = carouselInstances.get(shell);
    clearInterval(instance.autoScrollInterval);
    track.removeEventListener("scroll", instance.scrollHandler);
    instance.btnPrev?.removeEventListener("click", instance.prevHandler);
    instance.btnNext?.removeEventListener("click", instance.nextHandler);
    shell.removeEventListener("mouseenter", instance.stopAutoScroll);
    shell.removeEventListener("mouseleave", instance.startAutoScroll);
    // Arrête le drag/swipe précédent
    track.removeEventListener("mousedown", instance.onDown);
    window.removeEventListener("mousemove", instance.onMove);
    window.removeEventListener("mouseup", instance.onUp);
  }

  const slides = Array.from(track.children).filter(
    (child) => !child.dataset.cloned
  );
  if (slides.length <= 1) return;

  track.querySelectorAll("[data-cloned]").forEach((clone) => clone.remove());
  const slideWidth = slides[0].offsetWidth + parseInt(getComputedStyle(track).gap);
  
  const clonesEnd = slides.map((s) => { const c = s.cloneNode(true); c.dataset.cloned = "true"; return c; });
  const clonesStart = slides.map((s) => { const c = s.cloneNode(true); c.dataset.cloned = "true"; return c; });

  track.append(...clonesEnd);
  track.prepend(...clonesStart);
  
  const originalContentWidth = slides.length * slideWidth;
  track.style.scrollBehavior = "auto";
  track.scrollLeft = originalContentWidth;
  
  let autoScrollInterval = null;
  let isScrolling = false;
  let isDown = false, startX, scrollStart;

  const recenter = () => {
    if (isScrolling) return;
    isScrolling = true;
    if (track.scrollLeft < slideWidth) {
      track.style.scrollBehavior = "auto";
      track.scrollLeft += originalContentWidth;
    } else if (track.scrollLeft >= originalContentWidth + (slides.length - 1) * slideWidth) {
      track.style.scrollBehavior = "auto";
      track.scrollLeft -= originalContentWidth;
    }
    setTimeout(() => { isScrolling = false; track.style.scrollBehavior = "smooth"; }, 50);
  };

  const stopAutoScroll = () => clearInterval(autoScrollInterval);

  const startAutoScroll = () => {
    stopAutoScroll();
    autoScrollInterval = setInterval(() => {
      track.scrollBy({ left: slideWidth, behavior: "smooth" });
    }, 4000);
  };

  const prevHandler = () => {
    stopAutoScroll(); // <-- La clé : on arrête le défilement auto
    track.scrollBy({ left: -slideWidth, behavior: "smooth" });
  };
  const nextHandler = () => {
    stopAutoScroll(); // <-- La clé : on arrête le défilement auto
    track.scrollBy({ left: slideWidth, behavior: "smooth" });
  };
  
// Gestion du swipe
  const onDown = (e) => {
    isDown = true;
    startX = e.pageX || (e.touches && e.touches[0] ? e.touches[0].pageX : 0);
    scrollStart = track.scrollLeft;
    stopAutoScroll(); // On arrête le défilement quand on commence à swiper
  };
  const onMove = (e) => {
    if (!isDown) return;
    e.preventDefault(); 
    const x = e.pageX || (e.touches && e.touches[0] ? e.touches[0].pageX : 0);
    const walk = x - startX;
    track.style.scrollBehavior = "auto";
    track.scrollLeft = scrollStart - walk;
  };
  const onUp = () => {
    isDown = false;
    track.style.scrollBehavior = "smooth";
    // Après le swipe, on ne relance PAS l'autoscroll immédiatement, on attend que l'utilisateur quitte la zone.
  };

  // Ajout des écouteurs d'événements
  track.addEventListener("scroll", recenter);
  shell.querySelector(".carousel-arrow.left")?.addEventListener("click", prevHandler);
  shell.querySelector(".carousel-arrow.right")?.addEventListener("click", nextHandler);
  
  // NOUVEAU : Gestion de la souris sur le carrousel
  shell.addEventListener("mouseenter", stopAutoScroll);
  shell.addEventListener("mouseleave", startAutoScroll);

  // Gestion du swipe
  track.addEventListener("mousedown", onDown);
  track.addEventListener("touchstart", onDown); // <-- Suppression de l'option { passive: true }
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove); // <-- Suppression de l'option { passive: true }
  window.addEventListener("mouseup", onUp);
  window.addEventListener("touchend", onUp);
  
  // Sauvegarde des handlers pour nettoyage
  carouselInstances.set(shell, {
    autoScrollInterval, scrollHandler: recenter, prevHandler, nextHandler,
    stopAutoScroll, startAutoScroll, onDown, onMove, onUp
  });

  startAutoScroll();
}

const initializeCarouselsObserver = () => {
    document.querySelectorAll("[data-carousel]").forEach((shell) => {
        // If the carousel instance does not exist for this shell OR it was somehow cleaned up
        // then try to set it up.
        if (!carouselInstances.has(shell)) {
            // Check if element is currently visible (e.g., on index.html main carousel or an active tab)
            if (shell.offsetParent !== null) {
                setupInfiniteCarousel(shell);
            } else {
                // If not visible, set up an IntersectionObserver to initialize when it comes into view
                // This is crucial for carousels inside inactive tabs on expertises.html
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            setupInfiniteCarousel(entry.target);
                            observer.unobserve(entry.target); // Stop observing once initialized
                        }
                    });
                }, { threshold: 0.1 });
                observer.observe(shell);
            }
        } else {
            // If already initialized (e.g., after pageshow or initial load),
            // just ensure it's in a correct state.
            const track = shell.querySelector(".carousel-track");
            if (track) {
                // Recalculate widths and re-center in case of resize or previous bad state
                const slides = Array.from(track.children).filter(child => !child.dataset.cloned);
                if (slides.length > 0) {
                    const computedStyle = getComputedStyle(track);
                    const gapValue = parseFloat(computedStyle.gap || '0');
                    const slideWidth = slides[0].getBoundingClientRect().width + gapValue;
                    const initialScrollPosition = slideWidth * slides.length;

                    track.style.scrollBehavior = "auto";
                    track.scrollLeft = initialScrollPosition;

                    // Restart auto-scroll if it was previously stopped
                    const instance = carouselInstances.get(shell);
                    if (instance && instance.startAutoScroll) {
                        instance.startAutoScroll();
                    }
                }
            }
        }
    });
};


const setupPolesTabs = () => {
  const polesContainer = document.querySelector(".poles");
  if (!polesContainer) return;

  const polesButtons = polesContainer.querySelectorAll(".pole");
  // Cible uniquement les carrousels qui sont dans la même section que les boutons
  const expertiseCarouselsContainer = polesContainer.parentElement;

  const clickHandler = (e) => {
    const clickedButton = e.target.closest(".pole");
    if (!clickedButton) return;

    // Met à jour l'état actif des boutons
    polesButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    clickedButton.classList.add("active");
    clickedButton.setAttribute("aria-selected", "true");

    const targetId = clickedButton.getAttribute("data-target");

    // Cache tous les carrousels de la section "Expertises"
    expertiseCarouselsContainer
      .querySelectorAll(".carousel-shell[data-carousel]")
      .forEach((c) => {
        const instance = carouselInstances.get(c);
        if (instance && instance.stopAutoScroll) instance.stopAutoScroll();
        c.hidden = true;
      });

    // Affiche le carrousel cible et le réinitialise
    const targetCarousel = document.querySelector(targetId);
    if (targetCarousel) {
      targetCarousel.hidden = false;
      setupInfiniteCarousel(targetCarousel);
    }
  };

  // Supprime l'ancien écouteur d'événement pour éviter les doublons
  if (polesContainer._clickHandler) {
    polesContainer.removeEventListener("click", polesContainer._clickHandler);
  }
  // Ajoute le nouvel écouteur
  polesContainer.addEventListener("click", clickHandler);
  polesContainer._clickHandler = clickHandler; // Sauvegarde pour une future suppression

  // Initialise le carrousel actif au chargement de la page
  const activeTab = polesContainer.querySelector(".pole.active");
  if (activeTab) {
    const targetId = activeTab.getAttribute("data-target");
    const targetCarousel = document.querySelector(targetId);
    if (targetCarousel) {
      targetCarousel.hidden = false;
      setupInfiniteCarousel(targetCarousel);
    }
  }
};

const setupBlogFilters = () => {
  const filterContainer = document.querySelector(".blog-filters");
  if (filterContainer) {
    const filterButtons = filterContainer.querySelectorAll(".btn");
    const blogCards = document.querySelectorAll(".blog-card");

    // Remove previous listeners to prevent duplicates on re-initialization
    if (filterContainer._clickHandler) {
      filterContainer.removeEventListener("click", filterContainer._clickHandler);
    }

    filterContainer._clickHandler = (e) => { // Store handler for cleanup
      const target = e.target.closest(".btn");
      if (!target) return;

      filterButtons.forEach((btn) => btn.classList.remove("active"));
      target.classList.add("active");

      const filter = target.dataset.filter;

      blogCards.forEach((card) => {
        if (filter === "all" || card.dataset.category === filter) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    };
    filterContainer.addEventListener("click", filterContainer._clickHandler);

    // Ensure initial filter state is applied on pageshow
    const activeFilterButton = filterContainer.querySelector(".btn.active");
    if (activeFilterButton) {
      const initialFilter = activeFilterButton.dataset.filter;
      blogCards.forEach((card) => {
        if (initialFilter === "all" || card.dataset.category === initialFilter) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    }
  }
};

const setupFormValidation = () => {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    // Remove previous listeners to prevent duplicates
    if (form._submitHandler) {
      form.removeEventListener("submit", form._submitHandler);
      form.querySelectorAll("input, textarea").forEach(field => {
        if (field._blurHandler) {
          field.removeEventListener("blur", field._blurHandler);
        }
      });
    }

    form._submitHandler = (e) => { // Store handler for cleanup
      if (!form.checkValidity()) {
        e.preventDefault();
        form.reportValidity();
      }
    };
    form.addEventListener("submit", form._submitHandler);

    form.querySelectorAll("input, textarea").forEach((field) => {
      field._blurHandler = () => { // Store handler for cleanup
        if (field.required) {
          field.toggleAttribute("aria-invalid", !field.checkValidity());
        }
      };
      field.addEventListener("blur", field._blurHandler);
    });
  });
};

const setupPageFade = () => {
  const DURATION = 300;

  // Ensure body doesn't have fade-out class on initial load/pageshow
  document.body.classList.remove("page-fade-out");

  const fadeAndGo = (url) => {
    document.body.classList.add("page-fade-out");
    setTimeout(() => (window.location.href = url), DURATION);
  };

  // Remove existing click listener for anchors to prevent duplicates
  if (document.body._anchorClickHandler) {
    document.removeEventListener("click", document.body._anchorClickHandler);
  }

  document.body._anchorClickHandler = (e) => { // Store handler for cleanup
    const a = e.target.closest("a[href]");
    if (
      !a ||
      a.target === "_blank" ||
      a.hasAttribute("download") ||
      a.getAttribute("href").startsWith("#") ||
      a.getAttribute("href").startsWith("mailto:")
    )
      return;
    e.preventDefault();
    fadeAndGo(a.href);
  };
  document.addEventListener("click", document.body._anchorClickHandler);

  // Remove existing beforeunload listener to prevent duplicates
  if (window._beforeUnloadHandler) {
    window.removeEventListener("beforeunload", window._beforeUnloadHandler);
  }

  window._beforeUnloadHandler = () => { // Store handler for cleanup
    document.body.classList.add("page-fade-out")
  };
  window.addEventListener("beforeunload", window._beforeUnloadHandler);
};
const setupActiveNavlink = () => {
  const navLinks = document.querySelectorAll("nav.primary a");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach(link => {
    const linkPage = link.getAttribute("href").split("/").pop() || "index.html";

    // On retire la classe 'active' de tous les liens au cas où
    link.classList.remove("active");

    // Si le lien correspond à la page actuelle, on ajoute la classe 'active'
    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });
};

// --- NOUVEAU : Fonction pour la navigation entre les expertises ---
const setupExpertiseNavigation = () => {
    // 1. On définit la liste ordonnée de toutes les expertises
    const expertises = [
        { url: "expertise-droit-immobilier.html", title: "Droit Immobilier" },
        { url: "expertise-droit-de-la-construction.html", title: "Droit de la Construction" },
        { url: "expertise-droit-de-la-copropriete.html", title: "Droit de la Copropriété" },
        { url: "expertise-fiscalite-immobiliere.html", title: "Fiscalité Immobilière" },
        { url: "expertise-droit-de-l-urbanisme.html", title: "Droit de l’Urbanisme" },
        { url: "expertise-droit-des-societes.html", title: "Droit des Sociétés" },
        { url: "expertise-droit-commercial.html", title: "Droit Commercial" },
        { url: "expertise-droit-des-etrangers.html", title: "Droit des Étrangers" },
        { url: "expertise-droit-penal.html", title: "Droit Pénal" },
        { url: "expertise-droit-international-de-la-famille.html", title: "Famille Internationale" },
        { url: "expertise-mediation-et-processus-collaboratif.html", title: "Médiation & Processus Collaboratif" }
    ];

    const mainContent = document.querySelector('main#contenu');
    if (!mainContent) return; 

    // 2. On identifie la page sur laquelle on se trouve
    const currentPageUrl = window.location.pathname.split("/").pop();
    const currentIndex = expertises.findIndex(e => e.url === currentPageUrl);

    if (currentIndex === -1) return;

    // 3. On détermine les pages précédente et suivante
    const prevExpertise = expertises[currentIndex - 1];
    const nextExpertise = expertises[currentIndex + 1];

    let navHTML = '<section class="section expertise-nav"><div class="container">';

    if (prevExpertise) {
        // Nouvelle structure avec un conteneur pour le texte et un span pour la flèche
        navHTML += `<a href="${prevExpertise.url}" class="prev-expertise">
                        <span class="arrow"></span>
                        <div class="text-content">
                            <span class="label">Précédent</span>
                            <span>${prevExpertise.title}</span>
                        </div>
                    </a>`;
    } else {
        navHTML += '<div></div>'; // Espace vide pour l'alignement
    }

    if (nextExpertise) {
        // Nouvelle structure pour le bouton "Suivant"
        navHTML += `<a href="${nextExpertise.url}" class="next-expertise">
                        <span class="arrow"></span>
                        <div class="text-content">
                            <span class="label">Suivant</span>
                            <span>${nextExpertise.title}</span>
                        </div>
                    </a>`;
    }

    navHTML += '</div></section>';

    // 5. On insère ce HTML à la fin de la page
    mainContent.insertAdjacentHTML('beforeend', navHTML);
};

// --- Main Initialization Function ---
const initializeAllFeatures = async () => {
  // Hide loader (initial timeout still applies)
  hideLoader();
  setTimeout(hideLoader, 2500); // safety net

	    applyCookiePreferences();
    setupCookieBanner();
    setupCookieSettingsPage();
	setupExpertiseNavigation();
  // Setup features, ensuring listeners are correctly managed for re-initialization
  setupHeaderShadow();
  setupDrawer();
  setupAnimations(); // Re-initializes IntersectionObserver
  setupFooterYear();
  setupDarkModeToggle();
  await setupLanguageSwitcher(); // Must be called before any data-key elements are processed by carousels/filters
  setupActiveNavlink();

  // Initialize carousels and tabs. They need translations to be ready.
  // This function now handles observing elements and setting up carousels when visible,
  // or re-setting them up if they exist.
  initializeCarouselsObserver();
  setupPolesTabs();
  setupBlogFilters();
  setupFormValidation();
  setupPageFade();
};

// --- Event Listeners for Page Load and Navigation ---

// Initial load: Executes when the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", initializeAllFeatures);

// For back/forward navigation using BFCache:
// 'pageshow' event fires when a session history entry is activated.
// 'event.persisted' is true if the page was retrieved from the BFCache.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    console.log("Page restored from BFCache. Re-initializing features...");
    initializeAllFeatures(); // Re-run all setup logic
  }
});
// =======================================================
// ==   CORRECTION DÉFINITIVE HAUTEUR HERO SUR MOBILE   ==
// =======================================================
const setHeroHeight = () => {
  const hero = document.getElementById('hero');
  const header = document.querySelector('header.site');
  const topbar = document.querySelector('.topbar');

  if (hero && header && topbar) {
    // On ne fait cette correction que sur les écrans mobiles (largeur < 880px)
    if (window.innerWidth <= 880) {
      const headerHeight = header.offsetHeight;
      const topbarHeight = topbar.offsetHeight;
      const totalHeaderHeight = headerHeight + topbarHeight;

      // On applique la hauteur réelle de la fenêtre moins la hauteur réelle du header
      hero.style.minHeight = `calc(${window.innerHeight}px - ${totalHeaderHeight}px)`;
    } else {
      // Sur les grands écrans, on retire le style pour laisser le CSS de base faire le travail
      hero.style.minHeight = ''; 
    }
  }
};

// On exécute la fonction au chargement initial de la page
document.addEventListener('DOMContentLoaded', setHeroHeight);

// Et on la ré-exécute si l'utilisateur change la taille de la fenêtre (ex: rotation du téléphone)
window.addEventListener('resize', setHeroHeight);