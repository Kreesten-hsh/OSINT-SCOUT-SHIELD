# Utilisation d'une image Python officielle légère
FROM python:3.12-slim

# Définition du répertoire de travail
WORKDIR /app

# Variables d'environnement pour Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Installation des dépendances système
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copie des fichiers de dépendances
COPY requirements.txt .

# Installation des paquets Python
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . .

# Commande par défaut (sera surchargée par docker-compose si nécessaire)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
