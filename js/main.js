/* En-tête, menu, pied de page et animations communes à toutes les pages. */
(function () {
  "use strict";

  var SITE = window.SITE || { nom: "Atlantic Motors" };
  var DEFAULT_NAME = "Atlantic Motors";

  // Structure du menu — ajoutez ou retirez des entrées ici.
  var NAV = [
    { label: "Accueil", href: "index.html" },
    { label: "Inventaire", href: "inventaire.html" },
    {
      label: "Importer un véhicule",
      children: [
        { label: "Du Canada vers la France", href: "import-canada.html" },
        { label: "Des États-Unis vers la France", href: "import-etats-unis.html" },
      ],
    },
    { label: "Contact", href: "contact.html" },
  ];

  var current = location.pathname.split("/").pop() || "index.html";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function link(item) {
    var active = item.href === current ? ' aria-current="page"' : "";
    return '<a href="' + item.href + '"' + active + ">" + esc(item.label) + "</a>";
  }

  function renderHeader() {
    var items = NAV.map(function (item) {
      if (!item.children) return "<li>" + link(item) + "</li>";
      var isActive = item.children.some(function (c) { return c.href === current; });
      return (
        '<li class="has-sub' + (isActive ? " is-active" : "") + '">' +
        '<button class="sub-toggle" type="button" aria-expanded="false">' +
        esc(item.label) +
        '<svg class="chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>' +
        "</button>" +
        '<ul class="submenu">' +
        item.children.map(function (c) { return "<li>" + link(c) + "</li>"; }).join("") +
        "</ul></li>"
      );
    }).join("");

    return (
      '<a class="skip-link" href="#contenu">Aller au contenu</a>' +
      '<header class="site-header" id="site-header">' +
      '<div class="header-inner">' +
      '<a class="brand" href="index.html" aria-label="' + esc(SITE.nom) + ' — accueil">' +
      '<span class="brand-mark" aria-hidden="true"></span><span class="brand-name">' + esc(SITE.nom) + "</span></a>" +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Ouvrir le menu">' +
      "<span></span><span></span></button>" +
      '<nav class="main-nav" id="main-nav" aria-label="Navigation principale">' +
      '<ul class="nav-list">' + items + "</ul></nav>" +
      "</div></header>"
    );
  }

  function renderFooter() {
    var year = new Date().getFullYear();
    return (
      '<footer class="site-footer">' +
      '<div class="container footer-inner">' +
      '<div class="footer-brand">' +
      '<span class="brand"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">' + esc(SITE.nom) + "</span></span>" +
      "<p>Importation de véhicules nord-américains — Canada &amp; États-Unis vers la France.</p>" +
      "</div>" +
      '<ul class="footer-links">' +
      '<li><a href="inventaire.html">Inventaire</a></li>' +
      '<li><a href="contact.html">Contact</a></li>' +
      '<li><a href="mentions-legales.html">Mentions légales</a></li>' +
      "</ul>" +
      '<p class="footer-copy">© ' + year + " " + esc(SITE.nom) + ". Tous droits réservés.</p>" +
      "</div></footer>"
    );
  }

  // Remplace le nom par défaut par celui de config.js (titres, textes marqués).
  function applySiteName() {
    if (SITE.nom && SITE.nom !== DEFAULT_NAME) {
      document.title = document.title.split(DEFAULT_NAME).join(SITE.nom);
    }
    document.querySelectorAll("[data-site='nom']").forEach(function (el) { el.textContent = SITE.nom; });
    document.querySelectorAll("[data-site='email']").forEach(function (el) {
      el.textContent = SITE.email;
      if (el.tagName === "A") el.href = "mailto:" + SITE.email;
    });
    document.querySelectorAll("[data-site='telephone']").forEach(function (el) {
      el.textContent = SITE.telephone;
      if (el.tagName === "A") el.href = "tel:" + SITE.telephone.replace(/\s+/g, "");
    });
    document.querySelectorAll("[data-site='zone']").forEach(function (el) { el.textContent = SITE.zone; });
  }

  // ---------- Réseaux sociaux et WhatsApp (éléments [data-social]) ----------
  var ICONS = {
    whatsapp: '<path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/><path d="M9.2 8.6c.3 2.6 2.4 4.8 5.2 5.4l1.1-1.2-1.8-.9-.8.7c-1-.5-1.9-1.4-2.4-2.4l.7-.8-.9-1.8z"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.6" cy="7.4" r=".6" fill="currentColor"/>',
    facebook: '<path d="M13.5 20v-7h2.4l.4-2.8h-2.8V8.6c0-.8.3-1.4 1.4-1.4h1.5V4.7a19 19 0 0 0-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v1.9H8.2V13h2.4v7"/>',
    tiktok: '<path d="M13 4v10.5a3 3 0 1 1-3-3"/><path d="M13 4c.4 2.2 2 3.8 4.2 4"/>',
    youtube: '<rect x="3.5" y="6" width="17" height="12" rx="3.5"/><path d="M10.5 9.5v5l4-2.5z"/>',
  };
  var LABELS = { whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube" };

  function handleFromUrl(url) {
    var m = String(url).replace(/\/+$/, "").match(/\/([^\/?#]+)(?:[?#].*)?$/);
    return m ? "@" + m[1].replace(/^@/, "") : "";
  }
  function formatWhatsapp(num) {
    var d = String(num).replace(/\D/g, "");
    if (/^33\d{9}$/.test(d)) return "+33 " + d.slice(2, 3) + " " + d.slice(3).replace(/(\d{2})(?=\d)/g, "$1 ");
    return "+" + d;
  }

  function renderSocial() {
    var targets = document.querySelectorAll("[data-social]");
    if (!targets.length) return;
    var items = [];
    var wa = String(SITE.whatsapp || "").replace(/\D/g, "");
    if (wa) {
      items.push({
        key: "whatsapp",
        href: "https://wa.me/" + wa + (SITE.whatsappMessage ? "?text=" + encodeURIComponent(SITE.whatsappMessage) : ""),
        detail: formatWhatsapp(wa),
      });
    }
    var r = SITE.reseaux || {};
    ["instagram", "facebook", "tiktok", "youtube"].forEach(function (k) {
      if (r[k]) items.push({ key: k, href: r[k], detail: k === "facebook" || k === "youtube" ? "" : handleFromUrl(r[k]) });
    });

    var html = items.map(function (it) {
      return (
        '<li><a href="' + esc(it.href) + '" target="_blank" rel="noopener">' +
        '<svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">' + ICONS[it.key] + "</svg>" +
        '<span class="social-name">' + LABELS[it.key] + "</span>" +
        (it.detail ? '<span class="social-detail">' + esc(it.detail) + "</span>" : "") +
        '<span class="social-arrow" aria-hidden="true">↗</span>' +
        "</a></li>"
      );
    }).join("");

    targets.forEach(function (el) {
      el.innerHTML = html;
      var block = el.closest(".social-block");
      if (block) block.hidden = !items.length;
    });
  }

  function setupMenu() {
    var header = document.getElementById("site-header");
    var toggle = header.querySelector(".nav-toggle");
    var subs = header.querySelectorAll(".has-sub");

    function closeSubs(except) {
      subs.forEach(function (li) {
        if (li === except) return;
        li.classList.remove("open");
        li.querySelector(".sub-toggle").setAttribute("aria-expanded", "false");
      });
    }

    function setMenu(open) {
      header.classList.toggle("menu-open", open);
      document.body.classList.toggle("no-scroll", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      if (!open) closeSubs();
    }

    toggle.addEventListener("click", function () {
      setMenu(!header.classList.contains("menu-open"));
    });

    subs.forEach(function (li) {
      var btn = li.querySelector(".sub-toggle");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = !li.classList.contains("open");
        closeSubs(li);
        li.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
    });

    document.addEventListener("click", function (e) {
      if (!header.contains(e.target)) closeSubs();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeSubs();
        if (header.classList.contains("menu-open")) setMenu(false);
      }
    });

    // Fermer le menu mobile si on repasse en affichage large.
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (mq) {
      if (mq.matches) setMenu(false);
    });

    // L'en-tête s'efface quand on descend et revient dès qu'on remonte.
    var lastY = window.scrollY;
    function onScroll() {
      var y = window.scrollY;
      header.classList.toggle("scrolled", y > 24);
      var busy = header.classList.contains("menu-open") || header.querySelector(".has-sub.open");
      if (!busy) {
        if (y > lastY + 6 && y > 160) header.classList.add("is-hidden");
        else if (y < lastY - 6 || y < 160) header.classList.remove("is-hidden");
      }
      lastY = y;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Titres découpés en mots qui montent l'un après l'autre (effet « rideau »).
  var SPLIT_SELECTOR = ".page-hero h1, .section-title, .cta-band h2, .callout h2, .ride-intro h1, [data-split]";
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = "1";
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = document.createElement("span");
            outer.className = "w";
            var inner = document.createElement("span");
            inner.className = "wi";
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(el);
    el.classList.add("reveal-text");
  }

  // Apparition douce des éléments marqués .reveal / .reveal-text / .reveal-img
  function setupReveal() {
    document.querySelectorAll(SPLIT_SELECTOR).forEach(splitWords);
    var els = document.querySelectorAll(".reveal, .reveal-text, .reveal-img");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }
  window.observeReveal = function (root) {
    // Utilisé par l'inventaire après chargement dynamique.
    (root || document).querySelectorAll("[data-split]").forEach(splitWords);
    (root || document).querySelectorAll(".reveal:not(.is-visible), .reveal-text:not(.is-visible), .reveal-img:not(.is-visible)").forEach(function (el) {
      if (!("IntersectionObserver" in window)) return el.classList.add("is-visible");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.disconnect(); }
        });
      }, { threshold: 0.08 });
      io.observe(el);
    });
  };

  document.body.insertAdjacentHTML("afterbegin", renderHeader());
  document.body.insertAdjacentHTML("beforeend", renderFooter());
  applySiteName();
  renderSocial();
  setupMenu();
  setupReveal();
  requestAnimationFrame(function () { document.documentElement.classList.add("is-loaded"); });
})();
