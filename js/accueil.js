/* Accueil : en faisant défiler la page, on « entre » dans la voiture.
   Extérieur → zoom vers l'habitacle → intérieur → informations de contact. */
(function () {
  "use strict";

  var ride = document.getElementById("ride");
  if (!ride) return;
  var ext = ride.querySelector(".ride-exterior");
  var int = ride.querySelector(".ride-interior");
  var shade = ride.querySelector(".ride-shade");
  var intro = ride.querySelector(".ride-intro");
  var cabin = ride.querySelector(".ride-cabin");
  var bar = ride.querySelector(".ride-progress span");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Point de la photo vers lequel on zoome (l'habitacle).
  var focus = ext.getAttribute("data-focus") || "50% 50%";
  ext.style.objectPosition = focus;
  ext.style.transformOrigin = focus;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }               // progression entre a et b
  function easeIn(t) { return t * t * t; }                                  // accélère en approchant
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var cabinActive = null;
  function setCabin(active) {
    if (active === cabinActive) return;
    cabinActive = active;
    cabin.classList.toggle("is-active", active);
    // Tant que la carte n'est pas visible, ses champs ne sont pas atteignables au clavier.
    if (active) cabin.removeAttribute("inert"); else cabin.setAttribute("inert", "");
  }

  function progress() {
    var rect = ride.getBoundingClientRect();
    var total = ride.offsetHeight - window.innerHeight;
    return total > 0 ? clamp(-rect.top / total) : 1;
  }

  function render() {
    ticking = false;
    if (reduced.matches) {
      [ext, int, shade, intro, cabin].forEach(function (el) { el.removeAttribute("style"); });
      ext.style.objectPosition = focus;
      setCabin(true);
      return;
    }
    var p = progress();

    // 1. Zoom vers l'habitacle (accélère à l'approche)
    var zoom = easeIn(seg(p, 0.04, 0.6));
    ext.style.transform = "scale(" + (1 + zoom * 5.5).toFixed(4) + ")";
    ext.style.opacity = (1 - seg(p, 0.46, 0.62)).toFixed(3);

    // 2. L'intérieur apparaît puis se pose
    var inT = seg(p, 0.46, 0.64);
    int.style.opacity = inT.toFixed(3);
    int.style.transform = "scale(" + (1.45 - 0.45 * easeOut(seg(p, 0.46, 0.9))).toFixed(4) + ")";

    // Assombrissement : léger au départ, plus marqué pendant le passage, puis ambiance intérieure
    var pass = Math.sin(Math.PI * seg(p, 0.36, 0.7));
    shade.style.opacity = (0.35 + 0.55 * pass + 0.2 * seg(p, 0.7, 0.85)).toFixed(3);

    // Titre d'accueil : s'efface dès le début du défilement
    var out = easeInOut(seg(p, 0.02, 0.2));
    intro.style.opacity = (1 - out).toFixed(3);
    intro.style.transform = "translateY(" + (-48 * out).toFixed(1) + "px)";
    intro.style.visibility = out >= 1 ? "hidden" : "visible";

    // Carte de contact
    var c = easeOut(seg(p, 0.7, 0.86));
    cabin.style.opacity = c.toFixed(3);
    cabin.style.transform = "translateY(" + (40 * (1 - c)).toFixed(1) + "px)";
    setCabin(c > 0.5);

    if (bar) bar.style.transform = "scaleY(" + p.toFixed(4) + ")";
  }

  var ticking = false;
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  reduced.addEventListener("change", onScroll);
  render();

  // Boutons « Nous contacter » : défilement doux jusqu'à l'intérieur de la voiture.
  document.querySelectorAll("[data-ride-jump]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var target = reduced.matches
        ? cabin.getBoundingClientRect().top + window.scrollY - 80
        : ride.offsetTop + (ride.offsetHeight - window.innerHeight) * 0.9;
      window.scrollTo({ top: target, behavior: reduced.matches ? "auto" : "smooth" });
      setTimeout(function () {
        var first = document.getElementById("c-nom");
        if (first) first.focus({ preventScroll: true });
      }, reduced.matches ? 50 : 1400);
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
