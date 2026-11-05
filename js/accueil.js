/* Accueil : cinématique « on entre dans la voiture ».
   En faisant défiler : on s'approche lentement de la Shelby GT500, la porte
   s'ouvre sur sa charnière, on passe par la portière, on s'installe au poste
   de conduite… et le menu contact apparaît. Le défilement est amorti pour
   que le mouvement reste fluide, même avec une molette crantée. */
(function () {
  "use strict";

  var ride = document.getElementById("ride");
  if (!ride) return;
  var stage = ride.querySelector(".ride-stage");
  var scene = document.getElementById("scene");
  var ext = scene.querySelector(".scene-ext");
  var door = scene.querySelector(".scene-door");
  var aperture = scene.querySelector(".scene-aperture");
  var apImg = aperture.querySelector("img");
  var apShade = aperture.querySelector(".aperture-shade");
  var through = ride.querySelector(".ride-through");
  var int = ride.querySelector(".ride-interior");
  var shade = ride.querySelector(".ride-shade");
  var intro = ride.querySelector(".ride-intro");
  var cabin = ride.querySelector(".ride-cabin");
  var bar = ride.querySelector(".ride-progress span");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------- Géométrie de la photo (en pixels de l'image d'origine) ----------
  var frame = scene.dataset.frame.split(" ").map(Number);           // [1920, 1080]
  var FW = frame[0], FH = frame[1];
  var focus = scene.dataset.focus.split(" ").map(Number);           // point gardé au centre de l'écran
  var pts = scene.dataset.door.trim().split(/\s+/).map(function (pair) { return pair.split(",").map(Number); });
  var hingeX = Number(scene.dataset.hinge);
  var xs = pts.map(function (q) { return q[0]; }), ys = pts.map(function (q) { return q[1]; });
  var box = { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys), y1: Math.max.apply(null, ys) };
  box.cx = (box.x0 + box.x1) / 2; box.cy = (box.y0 + box.y1) / 2;

  // Contour de la porte en pourcentages (pour clip-path)
  var poly = "polygon(" + pts.map(function (q) {
    return (q[0] / FW * 100).toFixed(3) + "% " + (q[1] / FH * 100).toFixed(3) + "%";
  }).join(", ") + ")";
  door.style.clipPath = poly; door.style.webkitClipPath = poly;
  aperture.style.clipPath = poly; aperture.style.webkitClipPath = poly;
  door.style.backgroundImage = "url('" + ext.getAttribute("src") + "')";
  door.style.transformOrigin = (hingeX / FW * 100) + "% " + (box.cy / FH * 100) + "%";
  // L'habitacle visible par la porte occupe la zone de l'ouverture
  apImg.style.left = (box.x0 / FW * 100) + "%";
  apImg.style.top = (box.y0 / FH * 100) + "%";
  apImg.style.width = ((box.x1 - box.x0) / FW * 100) + "%";
  apImg.style.height = ((box.y1 - box.y0) / FH * 100) + "%";
  ["left", "top", "width", "height"].forEach(function (k) { apShade.style[k] = apImg.style[k]; });

  // ---------- Outils ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInSine(t) { return 1 - Math.cos((t * Math.PI) / 2); }

  // ---------- Mise en place de la scène (« cover » calculé à la main) ----------
  var W, H, vw, vh, baseX, baseY;
  function layout() {
    vw = stage.clientWidth;
    vh = reduced.matches ? window.innerHeight : stage.clientHeight;
    // Écran en hauteur (téléphone) : on montre la voiture entière, centrée,
    // bords fondus dans le noir. Écran large : la photo couvre tout l'écran.
    var portrait = vw / vh < 1.1;
    scene.classList.toggle("is-portrait", portrait);
    var sc = portrait ? vw / (FW * 0.62) : Math.max(vw / FW, vh / FH);
    W = FW * sc; H = FH * sc;
    baseX = clamp(vw / 2 - focus[0] * W, vw - W, 0);
    baseY = portrait ? vh * 0.4 - focus[1] * H : clamp(vh / 2 - focus[1] * H, vh - H, 0);
    scene.style.width = W + "px";
    scene.style.height = H + "px";
    scene.style.perspective = (W * 0.75).toFixed(0) + "px";
    scene.style.perspectiveOrigin = (box.cx / FW * 100) + "% " + (box.cy / FH * 100) + "%";
    door.style.backgroundSize = W + "px " + H + "px";
  }

  var cabinActive = null;
  function setCabin(active) {
    if (active === cabinActive) return;
    cabinActive = active;
    cabin.classList.toggle("is-active", active);
    // Tant que la carte n'est pas visible, ses champs ne sont pas atteignables au clavier.
    if (active) cabin.removeAttribute("inert"); else cabin.setAttribute("inert", "");
  }

  function target() {
    var total = ride.offsetHeight - window.innerHeight;
    return total > 0 ? clamp(-ride.getBoundingClientRect().top / total, 0, 1) : 1;
  }

  // ---------- Rendu d'une image de la cinématique ----------
  function draw(p) {
    // 1. Le titre s'efface doucement
    var out = easeInOut(seg(p, 0.02, 0.14));
    intro.style.opacity = (1 - out).toFixed(3);
    intro.style.transform = "translate3d(0," + (-40 * out).toFixed(1) + "px,0)";
    intro.style.visibility = out >= 1 ? "hidden" : "visible";

    // 2. Caméra : approche lente (travelling), puis on plonge dans l'ouverture
    var approach = easeInOut(seg(p, 0.03, 0.34));
    var dive = easeInSine(seg(p, 0.44, 0.7));
    var apW = (box.x1 - box.x0) / FW * W, apH = (box.y1 - box.y0) / FH * H;
    var kFill = Math.max(vw / apW, vh / apH) * 1.12;          // l'ouverture remplit l'écran
    var k = lerp(1, 1.45, approach);
    k = k * Math.pow(kFill / k, dive);                          // zoom exponentiel = vitesse perçue constante
    var ax = box.cx / FW * W, ay = box.cy / FH * H;             // centre de l'ouverture dans la scène
    var m = Math.max(0.45 * approach, dive > 0 ? lerp(0.45, 1, Math.pow(dive, 0.6)) : 0);
    var sx = lerp(baseX + ax, vw / 2, m), sy = lerp(baseY + ay, vh / 2, m);
    var tx = sx - k * ax, ty = sy - k * ay;
    // Pas de bord vide à l'écran quand la photo est plus grande que lui
    if (k * W >= vw) tx = clamp(tx, vw - k * W, 0);
    if (k * H >= vh) ty = clamp(ty, vh - k * H, 0);
    scene.style.transform = "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0) scale(" + k.toFixed(4) + ")";

    // 3. La porte s'ouvre sur sa charnière, vers nous
    var open = easeInOut(seg(p, 0.2, 0.47));
    door.style.transform = "rotateY(" + (-74 * open).toFixed(2) + "deg)";
    door.style.filter = "brightness(" + (1 - 0.5 * open).toFixed(3) + ")";
    door.style.opacity = (1 - seg(p, 0.5, 0.6)).toFixed(3);
    apShade.style.opacity = (1 - 0.7 * dive).toFixed(3);
    ext.style.opacity = (1 - seg(p, 0.6, 0.68)).toFixed(3);

    // 4. On passe la portière : l'habitacle vu de la porte prend tout l'écran…
    var inT = seg(p, 0.62, 0.69);
    through.style.opacity = (inT * (1 - seg(p, 0.76, 0.85))).toFixed(3);
    through.style.transform = "scale(" + lerp(1.1, 1, easeOut(seg(p, 0.62, 0.84))).toFixed(4) + ")";

    // 5. … puis on s'installe au volant
    var seat = seg(p, 0.76, 0.85);
    int.style.opacity = seat.toFixed(3);
    int.style.transform = "scale(" + lerp(1.14, 1, easeOut(seg(p, 0.76, 0.95))).toFixed(4) + ")";

    // Lumière : on passe de l'extérieur à l'ambiance feutrée de l'habitacle
    var pass = Math.sin(Math.PI * seg(p, 0.52, 0.74));
    shade.style.opacity = (0.3 + 0.35 * pass + 0.35 * seg(p, 0.78, 0.9)).toFixed(3);

    // 6. Le menu contact apparaît
    var c = easeOut(seg(p, 0.86, 0.95));
    cabin.style.opacity = c.toFixed(3);
    cabin.style.transform = "translate3d(0," + (36 * (1 - c)).toFixed(1) + "px,0)";
    setCabin(c > 0.5);

    if (bar) bar.style.transform = "scaleY(" + p.toFixed(4) + ")";
  }

  function drawStatic() {
    [door, ext, through, int, shade, intro, cabin].forEach(function (el) { el.style.transform = ""; el.style.opacity = ""; });
    scene.style.transform = "translate3d(" + baseX + "px," + baseY + "px,0)";
    door.style.filter = "";
    intro.style.visibility = "";
    setCabin(true);
  }

  // ---------- Défilement amorti (inertie) ----------
  var current = target(), goal = current, running = false;
  function loop() {
    if (reduced.matches) { running = false; drawStatic(); return; }
    var diff = goal - current;
    current = Math.abs(diff) < 0.0004 ? goal : current + diff * 0.09;
    draw(current);
    if (current !== goal) requestAnimationFrame(loop);
    else running = false;
  }
  function kick() {
    goal = target();
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  layout();
  if (reduced.matches) drawStatic(); else draw(current);
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", function () { layout(); if (reduced.matches) drawStatic(); else draw(current); kick(); });
  reduced.addEventListener("change", function () { layout(); if (reduced.matches) drawStatic(); else draw(current); });

  // Boutons « Nous contacter » : on monte à bord en douceur jusqu'au menu contact.
  document.querySelectorAll("[data-ride-jump]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var dest = reduced.matches
        ? cabin.getBoundingClientRect().top + window.scrollY - 80
        : ride.offsetTop + (ride.offsetHeight - window.innerHeight) * 0.97;
      window.scrollTo({ top: dest, behavior: reduced.matches ? "auto" : "smooth" });
      setTimeout(function () {
        var first = document.getElementById("c-nom");
        if (first) first.focus({ preventScroll: true });
      }, reduced.matches ? 50 : 2200);
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
