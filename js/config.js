/* =========================================================
   CONFIGURATION DU SITE — modifiez uniquement ce fichier
   pour changer le nom, les coordonnées et le formulaire.
   ========================================================= */
window.SITE = {
  // Nom de l'entreprise : affiché dans le menu, le pied de page,
  // les titres d'onglet et les mentions légales.
  nom: "Atlantic Motors",

  // Coordonnées affichées sur la page Contact et dans le pied de page.
  email: "contact@exemple.fr",
  telephone: "+33 6 00 00 00 00",
  zone: "Basé en France — véhicules livrés partout en France",

  // ▼▼▼ IDENTIFIANT FORMSPREE ▼▼▼
  // 1. Créez un formulaire sur https://formspree.io
  // 2. Copiez l'identifiant de 8 caractères (ex. : "xyzabcde")
  //    visible dans l'adresse https://formspree.io/f/xyzabcde
  // 3. Collez-le ci-dessous à la place de VOTRE_ID_FORMSPREE
  formspreeId: "VOTRE_ID_FORMSPREE",

  // ▼▼▼ RÉSEAUX SOCIAUX ET WHATSAPP (page Contact) ▼▼▼
  // Collez l'adresse complète de chaque page. Laissez "" pour masquer un réseau.
  reseaux: {
    instagram: "https://www.instagram.com/votre_compte",
    facebook: "https://www.facebook.com/votre_page",
    tiktok: "",
    youtube: "",
  },
  // Numéro WhatsApp au format international, chiffres uniquement,
  // sans "+", sans espaces et sans le 0 initial : 06 12 34 56 78 → "33612345678".
  // Laissez "" pour masquer WhatsApp.
  whatsapp: "33600000000",
  // Message pré-rempli quand un visiteur ouvre la conversation WhatsApp.
  whatsappMessage: "Bonjour, je vous contacte depuis votre site au sujet d'un véhicule.",

  // ▼▼▼ ESPACE PROPRIÉTAIRE (admin.html) ▼▼▼
  // Dépôt GitHub où est publié le site : c'est là que l'espace propriétaire
  // enregistre l'inventaire et les photos.
  github: {
    owner: "sam-glln",          // votre nom d'utilisateur GitHub
    repo: "Import-vehicules",   // le nom du dépôt
    branch: "main",             // la branche publiée par GitHub Pages
  },
};
