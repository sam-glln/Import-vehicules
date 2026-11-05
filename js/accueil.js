/* Accueil : diaporama plein écran (une photo toutes les 4 secondes),
   carrousel « La collection » et formulaire de contact. */
(function () {
  "use strict";

  // ---------- Diaporama ----------
  (function slideshow() {
    var root = document.querySelector(".hero-slides");
    if (!root) return;
    var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
    var barsBox = root.querySelector(".slides-bars");
    var count = root.querySelector(".slides-count");
    var name = root.querySelector(".slides-name");
    var pauseBtn = root.querySelector(".slides-pause");
    var duration = Number(root.dataset.duration) || 4000;
    root.style.setProperty("--slide-duration", duration + "ms");
    var index = 0, paused = false;

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    // Une barre de progression par photo : elle se remplit pendant l'affichage,
    // et la fin de son animation déclenche la photo suivante.
    var bars = slides.map(function (slide, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slides-bar";
      b.setAttribute("aria-label", "Photo " + (i + 1) + " : " + (slide.dataset.caption || ""));
      b.appendChild(document.createElement("span"));
      b.addEventListener("click", function () { go(i); });
      b.querySelector("span").addEventListener("animationend", function () {
        if (i === index) go((index + 1) % slides.length);
      });
      barsBox.appendChild(b);
      return b;
    });

    function go(i) {
      index = i;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === i);
        s.setAttribute("aria-hidden", String(k !== i));
      });
      bars.forEach(function (b, k) {
        b.classList.remove("is-active");
        b.setAttribute("aria-current", String(k === i));
      });
      void barsBox.offsetWidth;                    // relance l'animation de la barre
      bars[i].classList.add("is-active");
      count.textContent = pad(i + 1) + " / " + pad(slides.length);
      name.textContent = slides[i].dataset.caption || "";
    }

    function setPaused(p) {
      paused = p;
      root.classList.toggle("is-paused", p);
      pauseBtn.setAttribute("aria-label", p ? "Relancer le diaporama" : "Mettre le diaporama en pause");
      pauseBtn.innerHTML = p
        ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path fill="currentColor" d="M2 0l7 5-7 5z"/></svg>'
        : '<svg viewBox="0 0 10 10" aria-hidden="true"><path fill="currentColor" d="M1.5 0h2.5v10H1.5zM6 0h2.5v10H6z"/></svg>';
    }
    pauseBtn.addEventListener("click", function () { setPaused(!paused); });

    // Pas de défilement pendant que la page est hors de l'écran (économie de batterie)
    document.addEventListener("visibilitychange", function () {
      root.classList.toggle("is-paused", paused || document.hidden);
    });

    go(0);
  })();

  // Bouton « Nous contacter » : on descend en douceur jusqu'au formulaire.
  document.querySelectorAll('a[href="#a-bord"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.getElementById("a-bord");
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () {
        var first = document.getElementById("c-nom");
        if (first) first.focus({ preventScroll: true });
      }, 900);
    });
  });

  // ---------- La collection : carrousel horizontal ----------
  (function showcase() {
    var track = document.getElementById("showcase-track");
    if (!track) return;
    var prev = document.getElementById("show-prev");
    var next = document.getElementById("show-next");
    var bar = document.getElementById("show-progress");
    var STATUTS = { disponible: "Disponible", reserve: "Réservé", vendu: "Vendu" };
    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function norm(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
    function prix(n) {
      return n == null ? "Sur demande"
        : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
    }

    fetch("vehicles.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        // Les véhicules vendus n'apparaissent pas sur l'accueil.
        var cars = list.filter(function (v) { return norm(v.statut) !== "vendu"; }).slice(0, 10);
        track.innerHTML = cars.map(function (v, i) {
          var st = norm(v.statut);
          var photo = (v.photos && v.photos[0]) || "assets/img/placeholder.svg";
          return '<article class="show-card reveal-img" style="--delay:' + Math.min(i, 3) * 120 + 'ms">' +
            '<a href="inventaire.html#' + encodeURIComponent(v.id) + '" draggable="false">' +
            '<div class="show-media"><img src="' + esc(photo) + '" alt="' + esc(v.marque + " " + v.modele + " " + v.annee) + '" loading="lazy" draggable="false">' +
            (st !== "disponible" ? '<span class="badge badge-' + st + '">' + (STATUTS[st] || "") + "</span>" : "") + "</div>" +
            '<div class="show-body"><div>' +
            '<p class="show-make">' + esc(v.marque) + " · " + esc(v.annee) + "</p>" +
            '<h3 class="show-name">' + esc(v.modele) + "</h3>" +
            '<p class="show-meta">' + new Intl.NumberFormat("fr-FR").format(v.kilometrage || 0) + " km</p></div>" +
            '<div><p class="show-price">' + prix(v.prix) + '</p><span class="link-arrow">Découvrir</span></div>' +
            "</div></a></article>";
        }).join("");
        if (window.observeReveal) window.observeReveal(track);
        update();
      })
      .catch(function () { track.closest(".showcase").hidden = true; });

    function step() {
      var card = track.querySelector(".show-card");
      return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : 300;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var ratio = max > 0 ? track.scrollLeft / max : 1;
      var visible = track.scrollWidth ? track.clientWidth / track.scrollWidth : 1;
      bar.style.width = (visible * 100).toFixed(2) + "%";
      bar.style.transform = "translateX(" + (ratio * (1 / visible - 1) * 100).toFixed(2) + "%)";
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    }
    track.addEventListener("scroll", function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
    next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
    });

    // Glisser à la souris (le tactile défile nativement)
    var down = null, moved = false;
    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = { x: e.clientX, left: track.scrollLeft };
      moved = false;
    });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - down.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add("is-dragging"); }
      if (moved) track.scrollLeft = down.left - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = null;
      if (moved) {
        // Repositionne sur la carte la plus proche
        var s = step();
        var target = Math.round(track.scrollLeft / s) * s;
        track.classList.remove("is-dragging");
        track.scrollTo({ left: target, behavior: "smooth" });
      }
    });
    track.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
  })();

  // ---------- Formulaire à bord ----------
  var form = document.getElementById("cabin-form");
  var status = form.querySelector(".form-status");
  var btn = form.querySelector("button[type=submit]");

  function setStatus(type, text) {
    status.className = "form-status " + type;
    status.textContent = text;
    status.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      var bad = form.querySelector(":invalid");
      if (bad) bad.focus();
      return;
    }
    var fd = new FormData(form);
    btn.disabled = true;
    btn.textContent = "Envoi…";
    window.Demandes.envoyer({
      source: "accueil",
      nom: fd.get("nom"),
      email: fd.get("email"),
      telephone: fd.get("telephone"),
      message: fd.get("message"),
      _gotcha: fd.get("_gotcha"),
    }).then(function () {
      form.reset();
      form.classList.remove("was-validated");
      setStatus("success", "Merci, votre demande est bien arrivée. Nous vous recontactons sous 48 heures.");
    }).catch(function (err) {
      setStatus("error", window.Demandes.messageErreur(err));
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Envoyer";
    });
  });
})();
