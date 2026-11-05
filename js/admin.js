/* =========================================================
   Espace propriétaire : gestion de l'inventaire.
   Les données (vehicles.json) et les photos sont enregistrées
   directement dans le dépôt GitHub du site via l'API GitHub.
   Chaque enregistrement crée un seul « commit » ; GitHub Pages
   republie ensuite le site automatiquement.
   ========================================================= */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  var DEFAULT_NAME = "Atlantic Motors";
  var API = "https://api.github.com";
  var DATA_PATH = "vehicles.json";
  var PHOTO_DIR = "assets/img/vehicules/";
  var TOKEN_KEY = "am-admin-token";
  var MAX_SIZE = 1600;     // largeur/hauteur max des photos envoyées (px)
  var JPEG_QUALITY = 0.82;
  var DEFAULT_SPECS = ["Moteur", "Boîte", "Carburant", "Transmission", "Couleur", "Immatriculation"];
  var STATUTS = { disponible: "Disponible", reserve: "Réservé", vendu: "Vendu" };

  var repo = resolveRepo();
  var R = "/repos/" + repo.owner + "/" + repo.repo;

  var state = {
    token: null,
    vehicles: [],
    dataSha: null,     // version de vehicles.json chargée (détection des conflits)
    editing: null,     // index du véhicule modifié, ou -1 pour un nouveau
    photos: [],        // photos du formulaire en cours
    busy: false,
  };

  var $ = function (id) { return document.getElementById(id); };
  var views = { login: $("login-view"), list: $("list-view"), edit: $("edit-view") };

  // ---------- Utilitaires ----------
  function resolveRepo() {
    var c = SITE.github || {};
    var owner = c.owner, name = c.repo;
    var host = location.hostname;
    if ((!owner || !name) && /\.github\.io$/i.test(host)) {
      owner = owner || host.split(".")[0];
      var seg = location.pathname.split("/")[1];
      name = name || (seg && !/\.html?$/.test(seg) ? seg : host);
    }
    return { owner: owner || "", repo: name || "", branch: c.branch || "main" };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "vehicule";
  }
  function normStatut(s) {
    return String(s || "disponible").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }
  function prix(n) {
    if (n == null || n === "") return "Prix sur demande";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }
  function km(n) { return new Intl.NumberFormat("fr-FR").format(n || 0) + " km"; }
  function title(v) { return (v.marque || "") + " " + (v.modele || "") + (v.annee ? " " + v.annee : ""); }

  function utf8ToBase64Decode(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  // Aperçu d'une photo déjà publiée : le site, puis le dépôt si la page n'est pas encore à jour.
  function photoSrc(path) { return path; }
  function rawUrl(path) {
    return "https://raw.githubusercontent.com/" + repo.owner + "/" + repo.repo + "/" + repo.branch + "/" + path;
  }
  window.__amImgFallback = function (img) {
    var p = img.getAttribute("data-path");
    if (p && !img.dataset.triedRaw) { img.dataset.triedRaw = "1"; img.src = rawUrl(p); }
    else { img.onerror = null; img.src = "assets/img/placeholder.svg"; }
  };
  function imgTag(path, alt) {
    return '<img src="' + esc(photoSrc(path)) + '" data-path="' + esc(path) + '" alt="' + esc(alt || "") + '" loading="lazy" onerror="__amImgFallback(this)">';
  }

  // ---------- Stockage de la clé ----------
  function storage(remember) {
    try { return remember ? window.localStorage : window.sessionStorage; } catch (e) { return null; }
  }
  function saveToken(token, remember) {
    clearToken();
    var s = storage(remember);
    try { if (s) s.setItem(TOKEN_KEY, token); } catch (e) { /* stockage indisponible */ }
  }
  function loadToken() {
    var t = null;
    try { t = window.sessionStorage.getItem(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    return t;
  }
  function clearToken() {
    try { window.localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    try { window.sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  // ---------- API GitHub ----------
  function gh(path, opts) {
    opts = opts || {};
    var headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + state.token,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return null; }).then(function (data) {
        if (!r.ok) {
          var err = new Error((data && data.message) || "Erreur " + r.status);
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  function explain(err) {
    if (!navigator.onLine) return "Pas de connexion Internet.";
    if (err && err.conflict) return err.message;
    switch (err && err.status) {
      case 401: return "Clé d'accès invalide ou expirée. Reconnectez-vous avec une nouvelle clé.";
      case 403: return "Accès refusé : vérifiez que la clé a la permission « Contents : Read and write » sur ce dépôt.";
      case 404: return "Dépôt introuvable (" + repo.owner + "/" + repo.repo + ") ou clé sans accès à ce dépôt. Vérifiez js/config.js et les réglages de la clé.";
      case 409: case 422: return "Le site a été modifié en même temps ailleurs. Rechargez la page et recommencez.";
      default: return "Erreur : " + ((err && err.message) || "inconnue") + ".";
    }
  }

  function loadData() {
    return gh(R + "/contents/" + DATA_PATH + "?ref=" + encodeURIComponent(repo.branch)).then(function (file) {
      state.dataSha = file.sha;
      var list = JSON.parse(utf8ToBase64Decode(file.content));
      if (!Array.isArray(list)) throw new Error("vehicles.json ne contient pas une liste");
      state.vehicles = list;
    });
  }

  /* Publie en un seul commit : nouvelle liste de véhicules, nouvelles photos,
     et suppression des photos qui ne sont plus utilisées. */
  function publish(message, vehicles, uploads, removedPaths) {
    uploads = uploads || [];
    removedPaths = removedPaths || [];
    var head, baseTree;

    return gh(R + "/git/ref/heads/" + encodeURIComponent(repo.branch))
      .then(function (ref) {
        head = ref.object.sha;
        return gh(R + "/contents/" + DATA_PATH + "?ref=" + head);
      })
      .then(function (current) {
        if (current.sha !== state.dataSha) {
          var e = new Error("L'inventaire a été modifié depuis un autre appareil. La liste a été rechargée : refaites votre modification.");
          e.conflict = true;
          throw e;
        }
        return gh(R + "/git/commits/" + head);
      })
      .then(function (commit) {
        baseTree = commit.tree.sha;
        // Liste des fichiers existants, pour ne supprimer que ce qui existe vraiment.
        return removedPaths.length ? gh(R + "/git/trees/" + baseTree + "?recursive=1") : { tree: [] };
      })
      .then(function (tree) {
        var existing = {};
        (tree.tree || []).forEach(function (t) { existing[t.path] = true; });

        // Envoi des photos une par une (blobs)
        return uploads.reduce(function (p, u) {
          return p.then(function (entries) {
            return gh(R + "/git/blobs", { method: "POST", body: { content: u.base64, encoding: "base64" } })
              .then(function (blob) {
                entries.push({ path: u.path, mode: "100644", type: "blob", sha: blob.sha });
                return entries;
              });
          });
        }, Promise.resolve([])).then(function (entries) {
          entries.push({ path: DATA_PATH, mode: "100644", type: "blob", content: JSON.stringify(vehicles, null, 2) + "\n" });
          removedPaths.forEach(function (p) {
            if (existing[p]) entries.push({ path: p, mode: "100644", type: "blob", sha: null });
          });
          return gh(R + "/git/trees", { method: "POST", body: { base_tree: baseTree, tree: entries } });
        });
      })
      .then(function (newTree) {
        return gh(R + "/git/commits", { method: "POST", body: { message: message, tree: newTree.sha, parents: [head] } });
      })
      .then(function (commit) {
        return gh(R + "/git/refs/heads/" + encodeURIComponent(repo.branch), { method: "PATCH", body: { sha: commit.sha } })
          .then(function () { return gh(R + "/contents/" + DATA_PATH + "?ref=" + commit.sha); });
      })
      .then(function (file) {
        state.dataSha = file.sha;
        state.vehicles = vehicles;
      })
      .catch(function (err) {
        if (err.conflict) return loadData().then(function () { renderList(); throw err; });
        throw err;
      });
  }

  // Photos qui ne sont plus utilisées par aucun véhicule
  function unusedPhotos(candidates, vehicles) {
    var used = {};
    vehicles.forEach(function (v) { (v.photos || []).forEach(function (p) { used[p] = true; }); });
    return candidates.filter(function (p) { return p.indexOf(PHOTO_DIR) === 0 && !used[p]; });
  }

  // ---------- Interface : messages ----------
  var toastTimer;
  function toast(text, type) {
    var t = $("toast");
    t.textContent = text;
    t.className = "toast " + (type || "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, type === "error" ? 9000 : 5000);
  }
  function setBusy(on, label) {
    state.busy = on;
    $("loading").hidden = !on;
    $("loading").lastChild.textContent = label || "Chargement…";
    document.querySelectorAll(".admin-main button, .admin-main select, .admin-main input").forEach(function (el) {
      if (on) { el.dataset.wasDisabled = el.disabled ? "1" : ""; el.disabled = true; }
      else if (el.dataset.wasDisabled !== undefined) { el.disabled = el.dataset.wasDisabled === "1"; delete el.dataset.wasDisabled; }
    });
  }
  // ---------- Rubriques : Inventaire / Demandes ----------
  var currentTab = tabFromHash();
  var invView = "login";
  function tabFromHash() { return location.hash === "#demandes" ? "demandes" : "inventaire"; }

  function show(name) {
    invView = name;
    applyTab();
    window.scrollTo(0, 0);
  }
  function applyTab() {
    var inv = currentTab === "inventaire";
    Object.keys(views).forEach(function (k) { views[k].hidden = !inv || k !== invView; });
    $("demandes-view").hidden = inv;
    document.querySelectorAll("[data-tab]").forEach(function (a) {
      if (a.dataset.tab === currentTab) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    updateLogout();
    if (!inv && window.AdminDemandes) window.AdminDemandes.open();
  }
  function updateLogout() {
    var sb = window.AdminDemandes && window.AdminDemandes.loggedIn();
    $("logout").hidden = !(state.token || sb);
  }
  window.addEventListener("hashchange", function () {
    currentTab = tabFromHash();
    applyTab();
    window.scrollTo(0, 0);
  });

  // Exécute une publication avec indicateur de chargement et message final.
  function run(label, task, success) {
    if (state.busy) return Promise.resolve();
    setBusy(true, label);
    return task()
      .then(function () {
        setBusy(false);
        toast(success || "Publié. Le site en ligne sera à jour d'ici une à deux minutes.", "success");
        return true;
      })
      .catch(function (err) {
        setBusy(false);
        if (err && err.status === 401) { logout(); }
        toast(explain(err), "error");
        return false;
      });
  }

  // ---------- Connexion ----------
  function login(token, remember) {
    state.token = token;
    var errBox = $("login-error");
    errBox.hidden = true;
    if (!repo.owner || !repo.repo) {
      errBox.textContent = "Le dépôt GitHub n'est pas renseigné : complétez la rubrique « github » dans js/config.js.";
      errBox.hidden = false;
      return Promise.resolve();
    }
    setBusy(true, "Connexion…");
    return gh(R)
      .then(function () { return loadData(); })
      .then(function () {
        setBusy(false);
        if (remember !== undefined) saveToken(token, remember);
        renderList();
        show("list");
      })
      .catch(function (err) {
        setBusy(false);
        state.token = null;
        clearToken();
        show("login");
        errBox.textContent = err.status === 404 && !err.conflict
          ? explain(err)
          : (err instanceof SyntaxError ? "Le fichier vehicles.json contient une erreur de format." : explain(err));
        errBox.hidden = false;
      });
  }

  function logout() {
    if (window.AdminDemandes) window.AdminDemandes.logout();
    clearToken();
    state.token = null;
    state.vehicles = [];
    $("token").value = "";
    show("login");
  }

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = $("token").value.trim();
    if (!token) { $("token").focus(); return; }
    login(token, $("remember").checked);
  });
  $("logout").addEventListener("click", logout);

  // ---------- Liste ----------
  function renderList() {
    var list = state.vehicles;
    $("admin-count").textContent = "(" + list.length + ")";
    if (!list.length) {
      $("admin-list").innerHTML = '<li class="admin-empty">Aucun véhicule pour le moment. Cliquez sur « Ajouter un véhicule ».</li>';
      return;
    }
    $("admin-list").innerHTML = list.map(function (v, i) {
      var st = normStatut(v.statut);
      var cover = v.photos && v.photos[0];
      return (
        '<li class="admin-item status-' + st + '" data-index="' + i + '">' +
        '<div class="admin-thumb">' + (cover ? imgTag(cover, "") : '<img src="assets/img/placeholder.svg" alt="">') + "</div>" +
        '<div class="admin-item-info">' +
        '<p class="admin-item-title">' + esc(title(v)) + "</p>" +
        '<p class="admin-item-meta">' + esc((v.id || "").toUpperCase()) + " · " + km(v.kilometrage) + " · " + prix(v.prix) + "</p>" +
        "</div>" +
        '<label class="admin-status"><span class="visually-hidden">Statut</span>' +
        '<select data-action="status">' +
        Object.keys(STATUTS).map(function (k) {
          return '<option value="' + k + '"' + (k === st ? " selected" : "") + ">" + STATUTS[k] + "</option>";
        }).join("") +
        "</select></label>" +
        '<div class="admin-item-actions">' +
        '<button type="button" class="icon-btn" data-action="up" aria-label="Monter"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="icon-btn" data-action="down" aria-label="Descendre"' + (i === list.length - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" class="admin-link" data-action="edit">Modifier</button>' +
        '<button type="button" class="admin-link danger" data-action="delete">Supprimer</button>' +
        "</div></li>"
      );
    }).join("");
  }

  $("admin-list").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn || state.busy) return;
    var i = Number(btn.closest(".admin-item").dataset.index);
    var v = state.vehicles[i];
    var action = btn.dataset.action;

    if (action === "edit") return openEditor(i);

    if (action === "up" || action === "down") {
      var j = action === "up" ? i - 1 : i + 1;
      var next = state.vehicles.slice();
      next[i] = next[j]; next[j] = v;
      return run("Publication…", function () {
        return publish("Inventaire : réorganisation (" + title(v) + ")", next);
      }, "Ordre mis à jour.").then(renderList);
    }

    if (action === "delete") {
      if (!window.confirm("Supprimer définitivement « " + title(v) + " » et ses photos ?")) return;
      var remaining = state.vehicles.filter(function (_, k) { return k !== i; });
      var removed = unusedPhotos(v.photos || [], remaining);
      return run("Suppression…", function () {
        return publish("Inventaire : suppression de " + title(v), remaining, [], removed);
      }, "Véhicule supprimé.").then(renderList);
    }
  });

  $("admin-list").addEventListener("change", function (e) {
    var sel = e.target.closest("select[data-action=status]");
    if (!sel) return;
    var i = Number(sel.closest(".admin-item").dataset.index);
    var v = state.vehicles[i];
    var next = state.vehicles.slice();
    next[i] = Object.assign({}, v, { statut: sel.value });
    run("Publication…", function () {
      return publish("Inventaire : " + title(v) + " → " + STATUTS[sel.value], next);
    }, "Statut mis à jour : " + STATUTS[sel.value] + ".").then(renderList);
  });

  $("add-vehicle").addEventListener("click", function () { openEditor(-1); });

  // ---------- Formulaire d'édition ----------
  var form = $("vehicle-form");

  function nextId() {
    var max = 0, prefix = "am-";
    state.vehicles.forEach(function (v) {
      var m = String(v.id || "").match(/^(.*?)(\d+)$/);
      if (m) { max = Math.max(max, Number(m[2])); prefix = m[1] || prefix; }
    });
    var id;
    do { max += 1; id = prefix + String(max).padStart(3, "0"); }
    while (state.vehicles.some(function (v) { return v.id === id; }));
    return id;
  }

  function specRow(key, value) {
    var row = document.createElement("div");
    row.className = "spec-row";
    row.innerHTML =
      '<input class="spec-key" aria-label="Intitulé" placeholder="Intitulé" value="' + esc(key) + '">' +
      '<input class="spec-value" aria-label="Valeur" placeholder="Valeur" value="' + esc(value) + '">' +
      '<button type="button" class="icon-btn" aria-label="Retirer la ligne">×</button>';
    row.querySelector("button").addEventListener("click", function () { row.remove(); });
    return row;
  }

  function openEditor(index) {
    state.editing = index;
    var v = index >= 0 ? state.vehicles[index] : { statut: "disponible", caracteristiques: {} };
    state.editingId = index >= 0 ? v.id : null;
    form.reset();
    form.classList.remove("was-validated");

    $("edit-eyebrow").textContent = index >= 0 ? "Réf. " + String(v.id || "").toUpperCase() : "Nouveau véhicule";
    $("edit-title").textContent = index >= 0 ? title(v) : "Ajouter un véhicule";
    $("save-btn").textContent = index >= 0 ? "Publier les modifications" : "Publier le véhicule";

    $("f-marque").value = v.marque || "";
    $("f-modele").value = v.modele || "";
    $("f-annee").value = v.annee || "";
    $("f-km").value = v.kilometrage != null ? v.kilometrage : "";
    $("f-prix").value = v.prix != null ? v.prix : "";
    $("f-statut").value = normStatut(v.statut) in STATUTS ? normStatut(v.statut) : "disponible";
    $("f-origine").value = v.origine || "";
    $("f-description").value = v.description || "";

    var specs = $("specs-editor");
    specs.innerHTML = "";
    var entries = Object.keys(v.caracteristiques || {}).map(function (k) { return [k, v.caracteristiques[k]]; });
    if (index < 0) entries = DEFAULT_SPECS.map(function (k) { return [k, ""]; });
    entries.forEach(function (e) { specs.appendChild(specRow(e[0], e[1])); });

    state.photos = (v.photos || []).map(function (p) { return { kind: "existing", path: p }; });
    renderPhotos();
    show("edit");
    $("f-marque").focus();
  }

  function closeEditor() {
    state.photos.forEach(function (p) { if (p.preview) URL.revokeObjectURL(p.preview); });
    state.photos = [];
    state.editing = null;
    renderList();
    show("list");
  }
  $("back-to-list").addEventListener("click", closeEditor);
  $("cancel-edit").addEventListener("click", closeEditor);
  $("add-spec").addEventListener("click", function () {
    var row = specRow("", "");
    $("specs-editor").appendChild(row);
    row.querySelector("input").focus();
  });

  // ---------- Photos ----------
  function renderPhotos() {
    var grid = $("photo-grid");
    grid.innerHTML = state.photos.map(function (p, i) {
      var img = p.kind === "new"
        ? '<img src="' + p.preview + '" alt="">'
        : imgTag(p.path, "");
      return (
        '<li class="photo-item" data-index="' + i + '">' + img +
        (i === 0 ? '<span class="photo-cover">Vignette</span>' : "") +
        '<div class="photo-actions">' +
        '<button type="button" class="icon-btn" data-photo="left" aria-label="Déplacer avant"' + (i === 0 ? " disabled" : "") + ">←</button>" +
        '<button type="button" class="icon-btn" data-photo="right" aria-label="Déplacer après"' + (i === state.photos.length - 1 ? " disabled" : "") + ">→</button>" +
        '<button type="button" class="icon-btn" data-photo="remove" aria-label="Retirer la photo">×</button>' +
        "</div></li>"
      );
    }).join("");
  }

  $("photo-grid").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-photo]");
    if (!btn) return;
    var i = Number(btn.closest(".photo-item").dataset.index);
    var list = state.photos;
    if (btn.dataset.photo === "remove") {
      var removed = list.splice(i, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
    } else {
      var j = btn.dataset.photo === "left" ? i - 1 : i + 1;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    renderPhotos();
  });

  // Redimensionne une image dans le navigateur et la convertit en JPEG.
  function processImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * scale);
        var h = Math.round(img.naturalHeight * scale);
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) return reject(new Error("conversion impossible"));
          var reader = new FileReader();
          reader.onload = function () {
            resolve({ base64: String(reader.result).split(",")[1], preview: URL.createObjectURL(blob) });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }, "image/jpeg", JPEG_QUALITY);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("format non pris en charge"));
      };
      img.src = url;
    });
  }

  function addFiles(files) {
    files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name); });
    if (!files.length) return;
    var failed = [];
    setBusy(true, "Préparation des photos…");
    files.reduce(function (p, f) {
      return p.then(function () {
        return processImage(f)
          .then(function (res) { state.photos.push({ kind: "new", base64: res.base64, preview: res.preview }); })
          .catch(function () { failed.push(f.name); });
      });
    }, Promise.resolve()).then(function () {
      setBusy(false);
      renderPhotos();
      if (failed.length) toast("Photo(s) illisible(s) : " + failed.join(", ") + ". Convertissez-les en JPEG.", "error");
    });
  }

  $("photo-input").addEventListener("change", function (e) {
    addFiles(e.target.files);
    e.target.value = "";
  });
  var dz = $("dropzone");
  ["dragenter", "dragover"].forEach(function (t) {
    dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add("is-over"); });
  });
  ["dragleave", "drop"].forEach(function (t) {
    dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove("is-over"); });
  });
  dz.addEventListener("drop", function (e) { addFiles(e.dataTransfer.files); });

  // ---------- Enregistrement ----------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) return;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      var bad = form.querySelector(":invalid");
      if (bad) bad.focus();
      toast("Complétez les champs obligatoires : marque, modèle, année et kilométrage.", "error");
      return;
    }

    var isNew = state.editing < 0;
    // Retrouve le véhicule par sa référence (la liste a pu être rechargée entre-temps).
    var editIndex = isNew ? -1 : state.vehicles.findIndex(function (x) { return x.id === state.editingId; });
    if (!isNew && editIndex < 0) {
      toast("Ce véhicule n'existe plus dans l'inventaire (supprimé depuis un autre appareil).", "error");
      return;
    }
    var old = isNew ? null : state.vehicles[editIndex];
    var id = isNew ? nextId() : old.id;

    var specs = {};
    $("specs-editor").querySelectorAll(".spec-row").forEach(function (row) {
      var k = row.querySelector(".spec-key").value.trim();
      var val = row.querySelector(".spec-value").value.trim();
      if (k && val) specs[k] = val;
    });

    var prixVal = $("f-prix").value.trim();
    var vehicle = {
      id: id,
      marque: $("f-marque").value.trim(),
      modele: $("f-modele").value.trim(),
      annee: Number($("f-annee").value),
      kilometrage: Number($("f-km").value),
      prix: prixVal === "" ? null : Number(prixVal),
      statut: $("f-statut").value,
      origine: $("f-origine").value.trim(),
      photos: [],
      description: $("f-description").value.trim(),
      caracteristiques: specs,
    };

    // Noms de fichiers des nouvelles photos
    var base = PHOTO_DIR + id + "-" + slug(vehicle.marque + " " + vehicle.modele + " " + vehicle.annee);
    var stamp = Date.now().toString(36);
    var uploads = [];
    state.photos.forEach(function (p, i) {
      if (p.kind === "new") {
        p.path = base + "-" + stamp + "-" + (i + 1) + ".jpg";
        uploads.push({ path: p.path, base64: p.base64 });
      }
      vehicle.photos.push(p.path);
    });

    var next = state.vehicles.slice();
    if (isNew) next.unshift(vehicle); // les nouveaux véhicules apparaissent en premier
    else next[editIndex] = vehicle;

    var removed = old ? unusedPhotos((old.photos || []).filter(function (p) { return vehicle.photos.indexOf(p) < 0; }), next) : [];

    run(uploads.length ? "Envoi des photos et publication…" : "Publication…", function () {
      return publish((isNew ? "Inventaire : ajout de " : "Inventaire : mise à jour de ") + title(vehicle), next, uploads, removed);
    }, isNew ? "Véhicule ajouté. Il apparaîtra en ligne d'ici une à deux minutes." : undefined).then(function (ok) {
      if (ok) closeEditor();
    });
  });

  // ---------- Démarrage ----------
  if (SITE.nom && SITE.nom !== DEFAULT_NAME) document.title = document.title.split(DEFAULT_NAME).join(SITE.nom);
  document.querySelectorAll("[data-site='nom']").forEach(function (el) { el.textContent = SITE.nom || DEFAULT_NAME; });
  if (repo.repo) $("help-repo").textContent = repo.owner + "/" + repo.repo;

  window.addEventListener("beforeunload", function (e) {
    if (state.editing !== null && state.photos.some(function (p) { return p.kind === "new"; })) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // Outils partagés avec js/admin-demandes.js
  window.AdminCore = { toast: toast, setBusy: setBusy, esc: esc, updateLogout: updateLogout, isBusy: function () { return state.busy; } };

  // Démarrage une fois tous les scripts chargés
  document.addEventListener("DOMContentLoaded", function () {
    var saved = loadToken();
    if (saved) login(saved); else show("login");
  });
})();
