/* Formulaire de contact : pré-remplissage depuis l'inventaire et envoi (js/demandes.js). */
(function () {
  "use strict";

  var SITE = window.SITE || {};
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");
  var submitBtn = form.querySelector("button[type=submit]");
  var vehicleInput = form.querySelector("#vehicule");
  var messageInput = form.querySelector("#message");
  var refInput = form.querySelector("#reference");
  var notice = document.getElementById("vehicle-notice");


  // ---------- Pré-remplissage ----------
  var params = new URLSearchParams(location.search);
  var vehicleId = params.get("vehicule");
  var similar = params.get("recherche") === "1";

  function prefill(label) {
    vehicleInput.value = similar ? "Modèle similaire à : " + label : label;
    refInput.value = vehicleId.toUpperCase();
    if (!messageInput.value) {
      messageInput.value = similar
        ? "Bonjour,\n\nJe recherche un véhicule similaire à celui-ci : " + label + ". Pouvez-vous me recontacter ?\n\nMerci."
        : "Bonjour,\n\nJe suis intéressé(e) par ce véhicule de votre inventaire : " + label + ". Pouvez-vous me donner plus d'informations ?\n\nMerci.";
    }
    notice.querySelector("strong").textContent = label;
    notice.hidden = false;
  }

  if (vehicleId) {
    fetch("vehicles.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var v = list.find(function (x) { return x.id === vehicleId; });
        prefill(v ? v.marque + " " + v.modele + " " + v.annee + " (réf. " + v.id.toUpperCase() + ")" : "Réf. " + vehicleId.toUpperCase());
      })
      .catch(function () { prefill("Réf. " + vehicleId.toUpperCase()); });
  }

  // ---------- Envoi ----------
  function setStatus(type, text) {
    status.className = "form-status " + type;
    status.textContent = text;
    status.hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      var firstInvalid = form.querySelector(":invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    var fd = new FormData(form);
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    window.Demandes.envoyer({
      source: "contact",
      nom: fd.get("nom"),
      email: fd.get("email"),
      telephone: fd.get("telephone"),
      vehicule_ref: fd.get("reference"),
      vehicule: fd.get("vehicule"),
      budget: fd.get("budget"),
      message: fd.get("message"),
      _gotcha: fd.get("_gotcha"),
    })
      .then(function () {
        form.reset();
        form.classList.remove("was-validated");
        notice.hidden = true;
        setStatus("success", "Merci, votre message a bien été envoyé. Nous vous répondons sous 48 heures ouvrées.");
      })
      .catch(function (err) {
        setStatus("error", window.Demandes.messageErreur(err));
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Envoyer la demande";
      });
  });
})();
