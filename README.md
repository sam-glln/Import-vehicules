# Atlantic Motors — site vitrine

Site statique (HTML, CSS, JavaScript, sans framework) pour une activité d'import de véhicules nord-américains vers la France. Il se publie gratuitement sur GitHub Pages.

## Organisation des fichiers

```
index.html               Accueil
inventaire.html          Inventaire (grille + fiche détaillée)
import-canada.html       Import Canada → France
import-etats-unis.html   Import États-Unis → France
contact.html             Formulaire de contact (Formspree)
mentions-legales.html    Mentions légales (modèle à compléter)
admin.html               ← espace propriétaire (gestion de l'inventaire)
vehicles.json            ← la liste des véhicules à vendre
js/config.js             ← nom du site, coordonnées, Formspree, réseaux sociaux, dépôt GitHub
js/admin.js              Espace propriétaire
js/main.js               Menu, pied de page, animations
js/inventaire.js         Affichage de l'inventaire
js/contact.js            Envoi du formulaire
css/style.css            Styles (couleurs en haut du fichier)
css/admin.css            Styles de l'espace propriétaire
assets/img/              Photos (hero.jpg = photo d'accueil)
assets/img/vehicules/    Photos des véhicules
```

## Premiers réglages : `js/config.js`

Ouvrez `js/config.js` et modifiez :

- `nom` : le nom de l'entreprise. Il est mis à jour automatiquement dans le menu, le pied de page, les titres d'onglet et les mentions légales.
- `email`, `telephone`, `zone` : vos coordonnées.
- `formspreeId` : votre identifiant Formspree (voir ci-dessous).
- `reseaux` et `whatsapp` : vos réseaux sociaux et votre numéro WhatsApp (voir ci-dessous).
- `github` : le dépôt GitHub du site, utilisé par l'espace propriétaire (déjà réglé sur `sam-glln/Import-vehicules`).

> Astuce : le nom « Atlantic Motors » figure aussi en dur dans la balise `<title>` de chaque page (il y est remplacé à l'affichage). Pour le référencement, faites un « Rechercher / Remplacer » de `Atlantic Motors` dans tout le dossier avec votre éditeur (VS Code : `Cmd + Maj + H`).

## Configurer le formulaire (Formspree)

1. Créez un compte gratuit sur [formspree.io](https://formspree.io).
2. Créez un nouveau formulaire (« New Form ») et indiquez l'adresse e-mail qui recevra les messages.
3. Formspree vous donne une adresse du type `https://formspree.io/f/xyzabcde`. Copiez la fin, `xyzabcde`.
4. Collez-la dans `js/config.js` à la place de `VOTRE_ID_FORMSPREE`.

Tant que l'identifiant n'est pas renseigné, le formulaire affiche un message « non configuré » au lieu d'envoyer.

## Réseaux sociaux et WhatsApp

La page Contact affiche une rubrique « Retrouvez-nous » avec vos liens. Réglez-les dans `js/config.js` :

```js
reseaux: {
  instagram: "https://www.instagram.com/votre_compte",
  facebook: "https://www.facebook.com/votre_page",
  tiktok: "",      // "" = non affiché
  youtube: "",
},
whatsapp: "33612345678",   // 06 12 34 56 78 → 33612345678 (sans +, sans espaces, sans le 0)
whatsappMessage: "Bonjour, je vous contacte depuis votre site au sujet d'un véhicule.",
```

Le bouton WhatsApp ouvre directement une conversation avec vous, avec le message pré-rempli. Un réseau laissé vide (`""`) n'apparaît pas. Les valeurs fournies sont des exemples : **remplacez-les avant la mise en ligne**.

## Espace propriétaire : gérer l'inventaire en ligne

Le plus simple pour gérer vos véhicules est l'espace propriétaire, à l'adresse :

```
https://VOTRE-COMPTE.github.io/Import-vehicules/admin.html
```

Il permet, depuis un ordinateur ou un téléphone, de :

- ajouter un véhicule avec ses photos (redimensionnées automatiquement) ;
- modifier un véhicule, réordonner ou retirer ses photos ;
- changer le statut (disponible, réservé, vendu) en un clic ;
- changer l'ordre d'affichage et supprimer un véhicule (ses photos inutilisées sont supprimées aussi).

Chaque action est publiée immédiatement. Le site en ligne se met à jour en une à deux minutes (parfois un peu plus, le temps que le cache du navigateur expire).

L'adresse `admin.html` n'est liée nulle part sur le site et n'est pas indexée par les moteurs de recherche. Ce n'est cependant pas ce qui la protège : **sans clé d'accès, personne ne peut rien modifier**.

### Pourquoi une « clé d'accès GitHub » et pas un mot de passe ?

Le site est statique : il n'a pas de serveur pour vérifier un mot de passe. Un mot de passe écrit dans le code JavaScript serait lisible par n'importe quel visiteur. La connexion utilise donc une clé personnelle délivrée par GitHub, que vous seul possédez et qui n'autorise que la modification de ce dépôt.

### Créer votre clé d'accès (une seule fois)

1. Connectez-vous sur [github.com](https://github.com), puis ouvrez [Fine-grained tokens → Generate new token](https://github.com/settings/personal-access-tokens/new).
2. **Token name** : par exemple « Site — espace propriétaire ». **Expiration** : choisissez une durée (par exemple 1 an).
3. **Repository access** : « Only select repositories », puis le dépôt `Import-vehicules` uniquement.
4. **Permissions → Repository permissions → Contents** : « Read and write ».
5. **Generate token**, puis copiez la clé (`github_pat_…`). Rangez-la dans votre gestionnaire de mots de passe : GitHub ne l'affiche qu'une fois.

Collez-la ensuite sur la page `admin.html`. Avec « Rester connecté », elle est mémorisée dans ce navigateur. Sinon, elle est oubliée à la fermeture de l'onglet. Le bouton « Se déconnecter » l'efface.

**En cas de perte ou de vol d'un appareil**, supprimez la clé sur GitHub (Settings → Developer settings → Personal access tokens) et créez-en une nouvelle. **À l'expiration**, faites de même.

### Bon à savoir

- L'espace propriétaire modifie directement les fichiers sur GitHub. Si vous travaillez aussi sur les fichiers de votre ordinateur, récupérez d'abord les changements avec `git pull` (ou « Fetch / Pull » dans GitHub Desktop) avant de modifier et d'envoyer, pour éviter les conflits.
- En local (`http://localhost:8000/admin.html`), l'espace propriétaire fonctionne aussi, mais il enregistre sur GitHub, pas dans vos fichiers locaux.
- Le site doit d'abord avoir été mis en ligne une première fois (voir plus bas).

## Ajouter, modifier ou retirer un véhicule à la main

Vous pouvez aussi modifier directement le fichier `vehicles.json`, si vous préférez ou pour des changements en masse. Tout s'y trouve. Chaque véhicule est un bloc entre accolades `{ … }`, séparé du suivant par une virgule.

### 1. Ajouter les photos

Déposez les photos dans `assets/img/vehicules/` en nommant les fichiers simplement, sans espaces ni accents, par exemple `chevrolet-c10-1972-1.jpg`, `chevrolet-c10-1972-2.jpg`…

Conseils : format paysage (4:3 idéalement), environ 1600 px de large, moins de 500 Ko par photo (compressez-les avec [squoosh.app](https://squoosh.app) si besoin). La première photo de la liste sert de vignette.

### 2. Ajouter le bloc dans `vehicles.json`

Copiez un bloc existant, collez-le à la fin de la liste (avant le `]` final), ajoutez une virgule après le bloc précédent, puis modifiez les valeurs :

```json
{
  "id": "am-007",
  "marque": "Chevrolet",
  "modele": "C10 Pick-up",
  "annee": 1972,
  "kilometrage": 98000,
  "prix": 38500,
  "statut": "disponible",
  "origine": "États-Unis (Arizona)",
  "photos": [
    "assets/img/vehicules/chevrolet-c10-1972-1.jpg",
    "assets/img/vehicules/chevrolet-c10-1972-2.jpg"
  ],
  "description": "Quelques phrases de présentation du véhicule.",
  "caracteristiques": {
    "Moteur": "V8 350 ci (5,7 L)",
    "Boîte": "Automatique 3 rapports",
    "Carburant": "Essence",
    "Transmission": "Propulsion",
    "Couleur": "Bleu / blanc",
    "Immatriculation": "Carte grise de collection"
  }
}
```

| Champ | Explication |
|---|---|
| `id` | Référence unique (ex. `am-007`). Sert à pré-remplir le formulaire et au lien direct `inventaire.html#am-007`. |
| `marque`, `modele` | Texte libre. |
| `annee` | Nombre, sans guillemets. |
| `kilometrage` | En km, nombre sans espaces ni guillemets (`98000`). L'affichage « 98 000 km » est automatique. |
| `prix` | Prix rendu France en euros, nombre sans espaces (`38500`). Mettez `null` pour afficher « Prix sur demande ». |
| `statut` | `disponible`, `reserve` ou `vendu`. |
| `origine` | Texte libre, affiché dans la fiche. |
| `photos` | Liste des chemins des photos. Si la liste est vide `[]`, une image « Photo à venir » s'affiche. |
| `description` | Texte de présentation (facultatif). |
| `caracteristiques` | Liste libre « intitulé : valeur ». Ajoutez ou retirez des lignes à volonté. |

**Changer un statut** : remplacez simplement `"disponible"` par `"reserve"` ou `"vendu"`.
**Retirer un véhicule** : supprimez son bloc (et la virgule qui le précède ou le suit).

> ⚠️ Le format JSON est strict : guillemets droits `"`, une virgule entre chaque élément, **pas** de virgule après le dernier. En cas de doute, collez le contenu du fichier sur [jsonlint.com](https://jsonlint.com) pour le vérifier. Si l'inventaire n'apparaît plus, c'est presque toujours une virgule en trop ou manquante.

## Mettre à jour les montants des pages d'import

Dans `import-canada.html` et `import-etats-unis.html`, cherchez le bloc commenté `REPÈRES CHIFFRÉS`. Chaque ligne du tableau ressemble à :

```html
<tr><td>TVA à l'importation</td><td class="value">20 %</td><td>Sur la valeur + transport + droits</td></tr>
```

Modifiez le texte entre les balises, puis mettez à jour la phrase « Informations mises à jour : … » juste en dessous.

## Remplacer les photos

- **Photo d'accueil** : remplacez `assets/img/hero.jpg` par votre photo (même nom), format paysage.
- **Photos des pages d'import** : dans `import-canada.html` / `import-etats-unis.html`, modifiez le chemin dans `<div class="page-hero-media" style="background-image: url('…')">`.
- **Photos des véhicules** : voir plus haut.

Les photos fournies sont des photos de démonstration du domaine public (CC0, Wikimedia Commons). Remplacez-les par les vôtres.

## Changer la couleur d'accent

En haut de `css/style.css`, modifiez `--accent` (doré par défaut `#c4a46b`). Pour un rouge sombre, essayez `#8e2b2b` et adaptez `--accent-soft` en conséquence.

## Voir le site sur votre ordinateur

L'inventaire charge `vehicles.json`, ce que les navigateurs bloquent quand on ouvre un fichier en double-cliquant. Lancez plutôt un petit serveur local depuis le dossier du site :

```bash
python3 -m http.server 8000
```

puis ouvrez [http://localhost:8000](http://localhost:8000). Arrêtez le serveur avec `Ctrl + C`.

## Mettre le site en ligne avec GitHub Pages

1. **Créer le dépôt** : sur [github.com](https://github.com), créez un dépôt (ex. `atlantic-motors`), public. GitHub Pages gratuit nécessite un dépôt public, sauf abonnement payant.
2. **Envoyer les fichiers** : depuis ce dossier,
   ```bash
   git add .
   git commit -m "Mise en ligne du site"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/atlantic-motors.git   # si ce n'est pas déjà fait
   git push -u origin main
   ```
   (Vous pouvez aussi utiliser GitHub Desktop, ou glisser-déposer les fichiers via « Add file → Upload files » sur github.com.)
3. **Activer Pages** : dans le dépôt, **Settings → Pages**. Sous « Build and deployment », choisissez **Source : Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
4. Après une à deux minutes, le site est en ligne à l'adresse `https://VOTRE-COMPTE.github.io/atlantic-motors/` (affichée en haut de la page Settings → Pages).
5. **Mises à jour** : chaque modification envoyée sur la branche `main` (par exemple un nouveau véhicule dans `vehicles.json`) est publiée automatiquement en une à deux minutes. Pour un changement rapide, vous pouvez éditer `vehicles.json` directement sur github.com (icône crayon), puis « Commit changes ».

### Utiliser votre propre nom de domaine (facultatif)

Dans **Settings → Pages → Custom domain**, saisissez votre domaine (ex. `www.atlantic-motors.fr`), puis chez votre registraire de domaine créez un enregistrement `CNAME` pointant `www` vers `VOTRE-COMPTE.github.io`. Cochez ensuite **Enforce HTTPS**.

Pensez à ajouter votre domaine dans les réglages de votre formulaire Formspree si vous y avez restreint les domaines autorisés.
