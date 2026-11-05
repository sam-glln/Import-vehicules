/* =========================================================
   Espace propriétaire — dossier « Demandes ».
   Lit et gère les demandes des visiteurs stockées dans Supabase.
   Seul le compte propriétaire (voir supabase/installation.sql)
   peut les lire.
   ========================================================= */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  var core = window.AdminCore;
  var esc = core.esc;
  var cfg = SITE.supabase || {};
  var configured = !!(cfg.url && cfg.clePublique && !/VOTRE/.test(cfg.url + cfg.clePublique));
  var base = configured ? cfg.url.replace(/\/+$/, "") : "";
  var KEY = "am-admin-sb";

  var STATUTS = { nouvelle: "Nouvelle", en_cours: "En cours", traitee: "Traitée", archivee: "Archivée" };
  var FILTRES = { nouvelle: "Nouvelles", en_cours: "En cours", traitee: "Traitées", archivee: "Archivées", toutes: "Toutes" };
  var SOURCES = { accueil: "Accueil", inventaire: "Inventaire", contact: "Page Contact" };

  var $ = function (id) { return document.getElementById(id); };
  var session = loadSession();
  var items = [];
  var filter = "nouvelle";

  // ---------- Session ----------
  function loadSession() {
    try {
      var raw = window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveSession(data, remember) {
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      email: data.user && data.user.email,
      remember: remember,
    };
    clearSession(true);
    try { (remember ? window.localStorage : window.sessionStorage).setItem(KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
  }
  function clearSession(keepMemory) {
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    try { window.sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    if (!keepMemory) session = null;
  }

  // ---------- API Supabase ----------
  function authError(r) {
    return r.json().catch(function () { return {}; }).then(function (d) {
      var e = new Error(d.error_description || d.msg || d.message || "Erreur " + r.status);
      e.status = r.status;
      throw e;
    });
  }

  function refreshIfNeeded() {
    if (!session) return Promise.reject(Object.assign(new Error("non connecté"), { status: 401 }));
    if (session.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
    return fetch(base + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: cfg.clePublique, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }).then(function (r) {
      if (!r.ok) return authError(r);
      return r.json().then(function (d) { saveSession(d, session.remember); });
    });
  }

  function api(path, opts) {
    opts = opts || {};
    return refreshIfNeeded().then(function () {
      var headers = {
        apikey: cfg.clePublique,
        Authorization: "Bearer " + session.access_token,
      };
      if (opts.body) headers["Content-Type"] = "application/json";
      if (opts.prefer) headers.Prefer = opts.prefer;
      return fetch(base + "/rest/v1/" + path, {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
    }).then(function (r) {
      if (!r.ok) return authError(r);
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    }).catch(function (err) {
      if (err.status === 401) { logout(); showView(); }
      throw err;
    });
  }

  function explain(err) {
    if (!navigator.onLine) return "Pas de connexion Internet.";
    if (err.status === 400 || err.status === 401) return "Session expirée : reconnectez-vous.";
    if (err.status === 404) return "Table « demandes » introuvable : exécutez supabase/installation.sql dans Supabase.";
    return "Erreur : " + err.message;
  }

  // ---------- Affichage ----------
  function showView() {
    $("sb-missing").hidden = configured;
    $("sb-login").hidden = !configured || !!session;
    $("sb-list").hidden = !configured || !session;
    core.updateLogout();
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    var abs = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
      " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    var min = Math.round((Date.now() - d.getTime()) / 60000);
    var rel = min < 1 ? "à l'instant" : min < 60 ? "il y a " + min + " min"
      : min < 1440 ? "il y a " + Math.round(min / 60) + " h"
      : min < 2880 ? "hier" : "il y a " + Math.round(min / 1440) + " jours";
    return abs + " · " + rel;
  }

  function whatsappLink(tel) {
    var d = String(tel || "").replace(/[^\d+]/g, "");
    if (/^0\d{9}$/.test(d)) d = "33" + d.slice(1);           // numéro français 06…
    d = d.replace(/^\+/, "").replace(/^00/, "");
    return d.length >= 8 ? "https://wa.me/" + d : "";
  }

  function counts() {
    var c = { toutes: items.length };
    Object.keys(STATUTS).forEach(function (k) { c[k] = 0; });
    items.forEach(function (it) { c[it.statut] = (c[it.statut] || 0) + 1; });
    return c;
  }

  function render() {
    var c = counts();
    $("req-count").textContent = "(" + items.length + ")";
    var badge = $("tab-count");
    badge.textContent = c.nouvelle;
    badge.hidden = !c.nouvelle;

    $("req-filters").querySelectorAll("button").forEach(function (b) {
      var f = b.dataset.filter;
      b.textContent = FILTRES[f] + (c[f] ? " (" + c[f] + ")" : "");
      b.setAttribute("aria-pressed", String(f === filter));
    });

    var list = items.filter(function (it) { return filter === "toutes" || it.statut === filter; });
    if (!list.length) {
      $("req-list").innerHTML = '<li class="admin-empty">' +
        (items.length ? "Aucune demande dans cette catégorie."
          : "Aucune demande pour le moment. Si vous en attendiez, vérifiez que l'e-mail indiqué dans supabase/installation.sql est bien celui de votre compte.") +
        "</li>";
      return;
    }

    $("req-list").innerHTML = list.map(function (it) {
      var subject = "Votre demande" + (it.vehicule ? " — " + it.vehicule : "") + " · " + (SITE.nom || "");
      var mail = it.email ? '<a href="mailto:' + esc(it.email) + "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent("Bonjour " + it.nom + ",\n\n") + '">' + esc(it.email) + "</a>" : "";
      var tel = it.telephone ? '<a href="tel:' + esc(it.telephone.replace(/\s+/g, "")) + '">' + esc(it.telephone) + "</a>" : "";
      var wa = whatsappLink(it.telephone);
      var waLink = wa ? '<a href="' + wa + '" target="_blank" rel="noopener">WhatsApp ↗</a>' : "";
      var vehicle = it.vehicule || it.vehicule_ref
        ? '<p class="req-vehicle"><span class="lbl">Véhicule</span>' +
          (it.vehicule_ref && /^[A-Za-z0-9-]+$/.test(it.vehicule_ref)
            ? '<a href="inventaire.html#' + esc(it.vehicule_ref.toLowerCase()) + '" target="_blank" rel="noopener">' + esc(it.vehicule || it.vehicule_ref) + " · " + esc(it.vehicule_ref) + " ↗</a>"
            : esc(it.vehicule || "")) +
          "</p>"
        : "";
      return (
        '<li class="req-item statut-' + esc(it.statut) + '" data-id="' + esc(it.id) + '">' +
        '<div class="req-head">' +
        '<span class="req-date">' + fmtDate(it.created_at) + "</span>" +
        '<span class="req-source">' + esc(SOURCES[it.source] || it.source) + "</span>" +
        '<label class="admin-status req-status"><span class="visually-hidden">Statut</span><select data-act="statut">' +
        Object.keys(STATUTS).map(function (k) {
          return '<option value="' + k + '"' + (k === it.statut ? " selected" : "") + ">" + STATUTS[k] + "</option>";
        }).join("") +
        "</select></label></div>" +
        '<p class="req-name">' + esc(it.nom) + "</p>" +
        '<div class="req-contact">' + [mail, tel, waLink].filter(Boolean).join("") + "</div>" +
        vehicle +
        (it.budget ? '<p class="req-vehicle"><span class="lbl">Budget</span>' + esc(it.budget) + "</p>" : "") +
        (it.message ? '<p class="req-message">' + esc(it.message) + "</p>" : "") +
        '<details class="req-notes"' + (it.notes ? " open" : "") + "><summary>Notes internes</summary>" +
        '<textarea rows="3" placeholder="Visibles uniquement par vous : suivi, relances, prix proposé…">' + esc(it.notes || "") + "</textarea>" +
        '<button type="button" class="admin-link" data-act="note">Enregistrer la note</button></details>' +
        '<div class="req-actions"><button type="button" class="admin-link danger" data-act="delete">Supprimer</button></div>' +
        "</li>"
      );
    }).join("");
  }

  // ---------- Actions ----------
  function load(silent) {
    if (!configured || !session) return Promise.resolve();
    if (!silent) core.setBusy(true, "Chargement des demandes…");
    return api("demandes?select=*&order=created_at.desc&limit=1000")
      .then(function (data) { items = data || []; render(); })
      .catch(function (err) { if (!silent) core.toast(explain(err), "error"); })
      .then(function () { if (!silent) core.setBusy(false); });
  }

  function update(id, patch, okMsg) {
    core.setBusy(true, "Enregistrement…");
    return api("demandes?id=eq." + encodeURIComponent(id), { method: "PATCH", body: patch, prefer: "return=representation" })
      .then(function (rows) {
        if (!rows || !rows.length) throw new Error("modification refusée (vérifiez l'e-mail propriétaire dans installation.sql)");
        var it = items.find(function (x) { return x.id === id; });
        if (it) Object.assign(it, rows[0]);
        core.setBusy(false);
        render();
        core.toast(okMsg, "success");
      })
      .catch(function (err) {
        core.setBusy(false);
        render();
        core.toast(explain(err), "error");
      });
  }

  $("req-list").addEventListener("change", function (e) {
    var sel = e.target.closest("select[data-act=statut]");
    if (!sel) return;
    var id = sel.closest(".req-item").dataset.id;
    update(id, { statut: sel.value }, "Demande classée : " + STATUTS[sel.value] + ".");
  });

  $("req-list").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn || core.isBusy()) return;
    var li = btn.closest(".req-item");
    var id = li.dataset.id;
    if (btn.dataset.act === "note") {
      update(id, { notes: li.querySelector("textarea").value.trim() || null }, "Note enregistrée.");
    }
    if (btn.dataset.act === "delete") {
      var it = items.find(function (x) { return x.id === id; });
      if (!window.confirm("Supprimer définitivement la demande de " + (it ? it.nom : "ce contact") + " ?")) return;
      core.setBusy(true, "Suppression…");
      api("demandes?id=eq." + encodeURIComponent(id), { method: "DELETE", prefer: "return=representation" })
        .then(function (rows) {
          if (!rows || !rows.length) throw new Error("suppression refusée");
          items = items.filter(function (x) { return x.id !== id; });
          core.toast("Demande supprimée.", "success");
        })
        .catch(function (err) { core.toast(explain(err), "error"); })
        .then(function () { core.setBusy(false); render(); });
    }
  });

  $("req-filters").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-filter]");
    if (!b) return;
    filter = b.dataset.filter;
    render();
  });
  $("req-refresh").addEventListener("click", function () { load(); });

  $("sb-login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("sb-email").value.trim();
    var pw = $("sb-password").value;
    var errBox = $("sb-error");
    errBox.hidden = true;
    if (!email || !pw) return;
    core.setBusy(true, "Connexion…");
    fetch(base + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: cfg.clePublique, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: pw }),
    })
      .then(function (r) { return r.ok ? r.json() : authError(r); })
      .then(function (d) {
        saveSession(d, $("sb-remember").checked);
        $("sb-password").value = "";
        core.setBusy(false);
        showView();
        return load();
      })
      .catch(function (err) {
        core.setBusy(false);
        errBox.textContent = err.status === 400 ? "E-mail ou mot de passe incorrect." : explain(err);
        errBox.hidden = false;
      });
  });

  function logout() {
    clearSession();
    items = [];
    $("tab-count").hidden = true;
  }

  window.AdminDemandes = {
    open: function () { showView(); if (session) load(); },
    loggedIn: function () { return !!session; },
    logout: function () { logout(); showView(); },
  };

  // Pastille « nouvelles demandes » visible dès l'ouverture de l'espace propriétaire.
  if (configured && session) load(true);
})();
