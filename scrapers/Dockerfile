# Utilisation de l'image officielle Playwright
FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

WORKDIR /app

# Copie des dépendances
COPY requirements.txt .

# Installation des dépendances Python (inclut spacy)
RUN pip install --no-cache-dir -r requirements.txt

# Téléchargement du modèle de langue Spacy (Français - léger)
RUN python -m spacy download fr_core_news_sm

# Copie du code source
COPY . .

# Commande par défaut
CMD ["tail", "-f", "/dev/null"]
