# FleetView — Plateforme de pilotage de flotte

Application web complète de pilotage de flotte connectée à Webfleet, Tankyou et Total Energies.

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)
- [Node.js 20+](https://nodejs.org/) (pour le développement local sans Docker)
- Clés API Webfleet (obligatoire), Tankyou et/ou Total (optionnel)
- Token Mapbox gratuit ([mapbox.com](https://mapbox.com)) pour la carte GPS

---

## Démarrage rapide (5 minutes)

### 1. Récupérer le projet

```bash
# Copier le dossier fleetview/ où vous le souhaitez, puis :
cd fleetview
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Ouvrez `.env` et renseignez **au minimum** :

```env
# Sécurité (générez une chaîne aléatoire de 32+ caractères)
JWT_SECRET=remplacez_par_une_chaine_aleatoire_longue
DB_PASSWORD=mot_de_passe_securise

# Webfleet (obligatoire pour les données GPS réelles)
WEBFLEET_ACCOUNT=votre_compte_webfleet
WEBFLEET_USERNAME=votre_email_webfleet
WEBFLEET_PASSWORD=votre_mot_de_passe_webfleet
WEBFLEET_API_KEY=votre_cle_api_webfleet

# Tankyou (optionnel)
TANKYOU_API_KEY=votre_cle_api_tankyou

# Total Energies (optionnel)
TOTAL_CLIENT_ID=votre_client_id
TOTAL_CLIENT_SECRET=votre_client_secret

# Carte GPS (token gratuit sur mapbox.com)
VITE_MAPBOX_TOKEN=votre_token_mapbox
```

### 3. Lancer l'application

```bash
docker compose up -d
```

L'application démarre en arrière-plan. Attendez ~30 secondes le temps que PostgreSQL s'initialise.

### 4. Accéder à l'application

| Service | URL | Description |
|---|---|---|
| **Application** | http://localhost:3000 | Interface web FleetView |
| **API** | http://localhost:3001/api/v1 | API REST backend |
| **Documentation API** | http://localhost:3001/api/docs | Swagger UI |

### 5. Première connexion

| Champ | Valeur |
|---|---|
| Email | `admin@maflotte.fr` |
| Mot de passe | `Admin1234!` |

> ⚠️ **Changez ce mot de passe immédiatement** en base de données après la première connexion.

---

## Obtenir vos clés API

### Webfleet
1. Connectez-vous à votre espace Webfleet : https://www.webfleet.com
2. Allez dans **Administration → Gestion des utilisateurs API**
3. Créez un utilisateur API avec les droits en lecture
4. Notez : compte, nom d'utilisateur, mot de passe, et clé API

> 📖 Documentation : https://www.webfleet.com/en_gb/webfleet/api/

### Tankyou
1. Contactez votre commercial Tankyou pour activer l'accès API
2. Récupérez votre clé API dans l'espace client
3. Documentation disponible sur demande auprès de Tankyou

### Total Energies (cartes carburant)
1. Contactez votre gestionnaire de compte Total Fleet
2. Demandez l'activation de l'API Fleet Management
3. Récupérez client_id et client_secret dans l'espace partenaire

### Mapbox (carte GPS — gratuit)
1. Créez un compte sur https://mapbox.com (gratuit)
2. Dans votre tableau de bord, copiez votre **Default public token**
3. Collez-le dans `.env` : `VITE_MAPBOX_TOKEN=pk.eyJ1...`

---

## Structure du projet

```
fleetview/
├── backend/               # API REST NestJS
│   └── src/
│       ├── modules/
│       │   ├── auth/      # Authentification JWT
│       │   ├── fleet/     # Véhicules & conducteurs
│       │   ├── telemetry/ # Trajets & GPS
│       │   ├── fuel/      # Carburant & fraude
│       │   └── connectors/# Webfleet, Tankyou, Total
│       └── main.ts
├── frontend/              # Interface React + TypeScript
│   └── src/
│       ├── pages/         # Dashboard, Carte, Carburant, Flotte, Alertes
│       ├── components/    # Composants réutilisables
│       ├── services/      # Appels API
│       └── types/         # Types TypeScript
├── database/
│   └── migrations/        # Schéma SQL initial (auto-exécuté au démarrage)
├── docker-compose.yml     # Orchestration des services
├── .env.example           # Template de configuration
└── README.md
```

---

## Comptes utilisateurs et rôles

| Rôle | Droits |
|---|---|
| `admin` | Accès complet : configuration, tous les sites, gestion des utilisateurs |
| `manager` | Tableau de bord, véhicules, carburant, alertes de son site |
| `viewer` | Lecture seule |

Pour créer un nouveau gestionnaire de flotte, exécutez dans PostgreSQL :

```sql
-- Connexion : docker exec -it fleetview_db psql -U fleetview -d fleetview

INSERT INTO users (org_id, email, name, password_hash, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'gestionnaire@maflotte.fr',
  'Gestionnaire Flotte',
  -- Générez le hash avec : node -e "const b=require('bcrypt'); b.hash('MotDePasse123!',12).then(console.log)"
  '$2b$12$VOTRE_HASH_ICI',
  'manager'
);
```

---

## Commandes utiles

```bash
# Voir les logs en temps réel
docker compose logs -f backend
docker compose logs -f frontend

# Redémarrer un service après modification du .env
docker compose restart backend

# Accéder à la base de données
docker exec -it fleetview_db psql -U fleetview -d fleetview

# Forcer une synchronisation Webfleet immédiate
curl -X POST http://localhost:3001/api/v1/connectors/webfleet/sync \
  -H "Authorization: Bearer VOTRE_JWT"

# Arrêter l'application
docker compose down

# Supprimer aussi les données (ATTENTION : irréversible)
docker compose down -v
```

---

## Dépannage

### L'application ne démarre pas
```bash
docker compose ps          # Vérifier l'état des conteneurs
docker compose logs db     # Vérifier que PostgreSQL est prêt
```

### Pas de données GPS
- Vérifiez que vos identifiants Webfleet sont corrects dans `.env`
- Regardez les logs : `docker compose logs -f backend | grep Webfleet`
- La première synchronisation a lieu au démarrage, puis toutes les 2 minutes

### La carte ne s'affiche pas
- Vérifiez que `VITE_MAPBOX_TOKEN` est bien renseigné dans `.env`
- Le token doit commencer par `pk.eyJ1`
- Relancez le frontend : `docker compose restart frontend`

### Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est sain
docker exec fleetview_db pg_isready -U fleetview
# Recréer la base si nécessaire
docker compose down -v && docker compose up -d
```

---

## Mise à jour et sauvegarde

### Sauvegarder la base de données
```bash
docker exec fleetview_db pg_dump -U fleetview fleetview > backup_$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde
```bash
docker exec -i fleetview_db psql -U fleetview -d fleetview < backup_20260101.sql
```

---

## Déploiement en production (Azure)

Pour un déploiement en production sur Azure :

1. **Azure Kubernetes Service (AKS)** : adaptez les fichiers Docker Compose en manifestes Kubernetes
2. **Azure Database for PostgreSQL** : remplacez le conteneur PostgreSQL local par le service managé
3. **Azure Cache for Redis** : remplacez le conteneur Redis par le service managé
4. **Azure Key Vault** : stockez les secrets (JWT, mots de passe API) dans Key Vault
5. **Azure Container Registry** : hébergez vos images Docker
6. **HTTPS** : configurez un certificat SSL via Let's Encrypt ou Azure Front Door

Contactez votre équipe IT pour l'accompagnement au déploiement cloud.

---

*FleetView v1.0 — Architecture & développement Mai 2026*
