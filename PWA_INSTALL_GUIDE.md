# Installer BENIN CYBER SHIELD sur téléphone

## Android (Chrome) — Méthode automatique
1. Ouvrir Chrome sur le téléphone
2. Aller sur `http://[IP_de_ton_PC]:4173`
   Remplacer `[IP_de_ton_PC]` par l'IP locale, par exemple `192.168.1.X`
3. Une bannière `Installer BENIN CYBER SHIELD` apparaît
4. Appuyer sur `Installer`
5. L'icône BCS apparaît sur l'écran d'accueil

## Android (Chrome) — Méthode manuelle
1. Ouvrir Chrome puis aller sur l'application
2. Ouvrir le menu `⋮`
3. Choisir `Ajouter à l'écran d'accueil`
4. Confirmer

## iOS (Safari) — Obligatoire Safari uniquement
1. Ouvrir Safari sur l'iPhone
2. Aller sur l'URL de l'application
3. Appuyer sur `Partager`
4. Choisir `Sur l'écran d'accueil`
5. Appuyer sur `Ajouter`

## Trouver l'IP locale de ton PC
- Windows : `ipconfig` puis lire `IPv4 Address`
- Linux/Mac : `ip addr` ou `ifconfig`

## Note soutenance
Pour la démo mobile en soutenance :
- lancer `npm run preview -- --host` dans `frontend/`
- utiliser l'URL affichée, par exemple `http://192.168.x.x:4173`
- ouvrir cette URL sur le téléphone
- installer l'application puis lancer la démonstration
