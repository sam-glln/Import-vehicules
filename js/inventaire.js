/* Inventaire : chargement de vehicles.json, grille, filtres et fiche détaillée. */
(function () {
  "use strict";

  var grid = document.getElementById("vehicle-grid");
  var filters = document.getElementById("filters");
  var countEl = document.getElementById("vehicle-count");
  var dialog = document.getElementById("vehicle-dialog");
  var dialogBody = document.getElementById("dialog-body");
  var PLACEHOLDER = "assets/img/placeholder.svg";

  var STATUTS = {
    disponible: "Disponible",
    reserve: "Réservé",
    vendu: "Vendu",
  };

  var vehicles = [];
  var currentFilter = "tous";

  // ---------- Formatage ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function normStatut(s) {
    // Accepte "réservé", "Reserve", "VENDU"...
    return String(s || "disponible").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }
  function prix(n) {
    if (n == null || n === "") return "Prix sur demande";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }
  function km(n) {
    return new Intl.NumberFormat("fr-FR").format(n) + " km";
  }
  function titre(v) {
    return v.marque + " " + v.modele;
  }
  function photos(v) {
    return v.photos && v.photos.length ? v.photos : [PLACEHOLDER];
  }

  // ---------- Grille ----------
  function card(v, i) {
    var st = normStatut(v.statut);
    return (
      '<article class="vehicle-card reveal status-' + st + '" style="--delay:' + (i % 3) * 80 + 'ms">' +
      '<a href="#' + encodeURIComponent(v.id) + '" class="vehicle-link" aria-label="Voir la fiche : ' + esc(titre(v)) + " " + esc(v.annee) + '">' +
      '<div class="vehicle-media">' +
      '<img src="' + esc(photos(v)[0]) + '" alt="' + esc(titre(v)) + " " + esc(v.annee) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'">' +
      '<span class="badge badge-' + st + '">' + (STATUTS[st] || esc(v.statut)) + "</span>" +
      "</div>" +
      '<div class="vehicle-info">' +
      '<p class="vehicle-make">' + esc(v.marque) + "</p>" +
      '<h2 class="vehicle-model">' + esc(v.modele) + "</h2>" +
      '<p class="vehicle-meta"><span>' + esc(v.annee) + "</span><span>" + km(v.kilometrage) + "</span></p>" +
      '<p class="vehicle-price"><span class="price-label">Prix rendu France</span>' + prix(v.prix) + "</p>" +
      "</div></a></article>"
    );
  }

  function render() {
    var list = vehicles.filter(function (v) {
      return currentFilter === "tous" || normStatut(v.statut) === currentFilter;
    });
    countEl.textContent = list.length + (list.length > 1 ? " véhicules" : " véhicule");
    grid.innerHTML = list.length
      ? list.map(card).join("")
      : '<p class="empty">Aucun véhicule dans cette catégorie pour le moment.</p>';
    if (window.observeReveal) window.observeReveal(grid);
  }

  filters.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    filters.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b === btn));
    });
    render();
  });

  // ---------- Fiche détaillée ----------
  var gallery = { list: [], index: 0 };

  function showPhoto(i) {
    var n = gallery.list.length;
    gallery.index = (i + n) % n;
    var main = dialogBody.querySelector(".gallery-main img");
    main.classList.remove("is-shown");
    main.src = gallery.list[gallery.index];
    var done = function () { main.classList.add("is-shown"); };
    if (main.complete) requestAnimationFrame(done); else main.onload = done;
    dialogBody.querySelectorAll(".thumb").forEach(function (t, k) {
      t.setAttribute("aria-current", String(k === gallery.index));
    });
    var counter = dialogBody.querySelector(".gallery-counter");
    if (counter) counter.textContent = gallery.index + 1 + " / " + n;
  }

  function openVehicle(id) {
    var v = vehicles.find(function (x) { return x.id === id; });
    if (!v) return;
    var st = normStatut(v.statut);
    gallery.list = photos(v);
    var multi = gallery.list.length > 1;

    var specs = [
      ["Année", v.annee],
      ["Kilométrage", km(v.kilometrage)],
      ["Origine", v.origine],
    ];
    Object.keys(v.caracteristiques || {}).forEach(function (k) {
      specs.push([k, v.caracteristiques[k]]);
    });

    var cta = st === "vendu"
      ? '<p class="sold-note">Ce véhicule est vendu. Nous pouvons rechercher un modèle équivalent pour vous.</p>' +
        '<a class="btn" href="contact.html?vehicule=' + encodeURIComponent(v.id) + '&recherche=1">Rechercher un modèle similaire</a>'
      : '<a class="btn btn-solid" href="contact.html?vehicule=' + encodeURIComponent(v.id) + '">Je suis intéressé</a>';

    dialogBody.innerHTML =
      '<div class="detail">' +
      '<div class="gallery">' +
      '<div class="gallery-main">' +
      '<img src="" alt="' + esc(titre(v)) + " " + esc(v.annee) + '" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'">' +
      (multi
        ? '<button class="gallery-nav prev" type="button" aria-label="Photo précédente">‹</button>' +
          '<button class="gallery-nav next" type="button" aria-label="Photo suivante">›</button>' +
          '<span class="gallery-counter"></span>'
        : "") +
      "</div>" +
      (multi
        ? '<div class="thumbs">' +
          gallery.list.map(function (src, k) {
            return '<button class="thumb" type="button" data-index="' + k + '" aria-label="Photo ' + (k + 1) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>';
          }).join("") +
          "</div>"
        : "") +
      "</div>" +
      '<div class="detail-info">' +
      '<span class="badge badge-' + st + '">' + (STATUTS[st] || esc(v.statut)) + "</span>" +
      '<p class="vehicle-make">' + esc(v.marque) + "</p>" +
      '<h2 class="detail-title" id="dialog-title">' + esc(v.modele) + ' <span class="detail-year">' + esc(v.annee) + "</span></h2>" +
      '<p class="detail-price"><span class="price-label">Prix rendu France</span>' + prix(v.prix) + "</p>" +
      (v.description ? '<p class="detail-desc">' + esc(v.description) + "</p>" : "") +
      '<dl class="specs">' +
      specs.map(function (s) { return "<div><dt>" + esc(s[0]) + "</dt><dd>" + esc(s[1]) + "</dd></div>"; }).join("") +
      "</dl>" +
      '<div class="detail-cta">' + cta + "</div>" +
      '<p class="ref">Réf. ' + esc(v.id.toUpperCase()) + "</p>" +
      "</div></div>";

    dialogBody.querySelectorAll(".thumb").forEach(function (t) {
      t.addEventListener("click", function () { showPhoto(Number(t.dataset.index)); });
    });
    var prev = dialogBody.querySelector(".prev");
    var next = dialogBody.querySelector(".next");
    if (prev) prev.addEventListener("click", function () { showPhoto(gallery.index - 1); });
    if (next) next.addEventListener("click", function () { showPhoto(gallery.index + 1); });

    // Balayage tactile sur mobile
    var main = dialogBody.querySelector(".gallery-main");
    var startX = null;
    main.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    main.addEventListener("touchend", function (e) {
      if (startX === null || !multi) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) showPhoto(gallery.index + (dx < 0 ? 1 : -1));
      startX = null;
    });

    showPhoto(0);
    if (!dialog.open) {
      dialog.showModal();
      document.body.classList.add("no-scroll");
    }
    dialog.scrollTop = 0;
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener("close", function () {
    document.body.classList.remove("no-scroll");
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  });
  dialog.querySelector(".dialog-close").addEventListener("click", closeDialog);
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) closeDialog(); // clic sur le fond
  });
  dialog.addEventListener("keydown", function (e) {
    if (gallery.list.length < 2) return;
    if (e.key === "ArrowLeft") showPhoto(gallery.index - 1);
    if (e.key === "ArrowRight") showPhoto(gallery.index + 1);
  });

  function fromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (id) openVehicle(id); else closeDialog();
  }
  window.addEventListener("hashchange", fromHash);

  // ---------- Chargement ----------
  fetch("vehicles.json", { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (data) {
      vehicles = data;
      render();
      fromHash();
    })
    .catch(function () {
      grid.innerHTML =
        '<p class="empty">Impossible de charger l\'inventaire. ' +
        "Si vous ouvrez le fichier directement depuis votre ordinateur, lancez plutôt un serveur local (voir le README).</p>";
      countEl.textContent = "";
    });
})();
