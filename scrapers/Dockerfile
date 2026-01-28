# Utilisation de l'image officielle Playwright (contient déjà les navigateurs Chromium/Firefox/WebKit)
FROM mcr.microsoft.com/playwright/python:v1.57.0-jammy

WORKDIR /app

# Copie des dépendances
COPY requirements.txt .

# Installation des dépendances Python supplémentaires
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . .

# Installation des navigateurs (au cas où, mais normalement inclus dans l'image de base)
# RUN playwright install chromium

# Commande par défaut : maintient le conteneur en vie pour exécuter des tâches
CMD ["tail", "-f", "/dev/null"]
