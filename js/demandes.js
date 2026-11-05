/* =========================================================
   Envoi des demandes de contact (accueil, inventaire, contact).
   Chaque demande est :
   - enregistrée dans votre dossier « Demandes » (Supabase),
     consultable dans l'espace propriétaire ;
   - et, si Formspree est configuré, envoyée aussi par e-mail.
   Les réglages se trouvent dans js/config.js.
   ========================================================= */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  var FIELDS = ["source", "nom", "email", "telephone", "vehicule_ref", "vehicule", "budget", "message"];
  var MAX = { nom: 120, email: 200, telephone: 40, vehicule_ref: 40, vehicule: 200, budget: 60, message: 5000, source: 20 };

  function supabaseReady() {
    var s = SITE.supabase || {};
    return !!(s.url && s.clePublique && !/VOTRE/.test(s.url + s.clePublique));
  }
  function formspreeReady() {
    return !!(SITE.formspreeId && SITE.formspreeId !== "VOTRE_ID_FORMSPREE");
  }

  function clean(data) {
    var row = {};
    FIELDS.forEach(function (k) {
      var v = data[k] == null ? "" : String(data[k]).trim();
      if (v) row[k] = v.slice(0, MAX[k]);
    });
    return row;
  }

  function toSupabase(row) {
    var s = SITE.supabase;
    return fetch(s.url.replace(/\/+$/, "") + "/rest/v1/demandes", {
      method: "POST",
      headers: {
        apikey: s.clePublique,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    }).then(function (r) {
      if (!r.ok) throw new Error("Supabase " + r.status);
    });
  }

  var SOURCES = { accueil: "page d'accueil", inventaire: "inventaire", contact: "page Contact" };

  function toFormspree(row) {
    var body = Object.assign({}, row);
    body._subject = "Nouvelle demande" + (row.vehicule ? " — " + row.vehicule : "") + " (" + (SOURCES[row.source] || row.source) + ")";
    if (row.email) body._replyto = row.email;
    return fetch("https://formspree.io/f/" + SITE.formspreeId, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      if (!r.ok) throw new Error("Formspree " + r.status);
    });
  }

  /* Envoie une demande. data = { source, nom, email, telephone, vehicule_ref,
     vehicule, budget, message, _gotcha }. Renvoie une promesse. */
  function envoyer(data) {
    // Champ piège anti-robots : rempli = robot, on fait semblant d'avoir envoyé.
    if (data._gotcha) return Promise.resolve();

    var row = clean(data);
    if (!row.nom || (!row.email && !row.telephone)) {
      return Promise.reject(new Error("Nom et moyen de contact obligatoires"));
    }

    var jobs = [];
    if (supabaseReady()) jobs.push(toSupabase(row));
    if (formspreeReady()) jobs.push(toFormspree(row));
    if (!jobs.length) {
      var e = new Error("non configuré");
      e.notConfigured = true;
      return Promise.reject(e);
    }

    // Réussite si au moins une destination a bien reçu la demande.
    return Promise.all(jobs.map(function (p) {
      return p.then(function () { return true; }, function (err) { console.warn(err); return false; });
    })).then(function (results) {
      if (results.indexOf(true) < 0) throw new Error("échec de l'envoi");
    });
  }

  function messageErreur(err) {
    if (err && err.notConfigured) {
      return "La réception des demandes n'est pas encore configurée (Supabase ou Formspree dans js/config.js).";
    }
    return "L'envoi a échoué. Réessayez dans un instant" +
      (SITE.email ? " ou écrivez-nous à " + SITE.email : "") + ".";
  }

  window.Demandes = { envoyer: envoyer, messageErreur: messageErreur };
})();
