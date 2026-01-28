import spacy
import json
import re
from typing import Dict, List, Any
import os

class FraudAnalyzer:
    """
    Moteur d'analyse NLP et Heuristique.
    Détecte les patterns de fraude Mobile Money et Crypto basés sur rules.json.
    """

    def __init__(self, rules_path: str = "config/rules.json"):
        self.rules_path = rules_path
        self.rules = self._load_rules()
        # Chargement du modèle NLP Français
        print("[*] Chargement du modèle NLP...")
        try:
            self.nlp = spacy.load("fr_core_news_sm")
        except OSError:
            print("[!] Modèle 'fr_core_news_sm' non trouvé. Téléchargement en cours...")
            from spacy.cli import download
            download("fr_core_news_sm")
            self.nlp = spacy.load("fr_core_news_sm")

    def _load_rules(self) -> Dict:
        """Charge les signatures de fraude depuis le fichier JSON."""
        if not os.path.exists(self.rules_path):
            raise FileNotFoundError(f"Fichier de règles introuvable: {self.rules_path}")
        
        with open(self.rules_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyse un texte brut et retourne un scoring de risque.
        """
        doc = self.nlp(text.lower())
        
        detected_categories = []
        total_risk_score = 0
        matches_details = []

        # 1. Analyse par Mots-clés (Keywords)
        # On lemmatise le texte pour matcher "arnaque" avec "arnaques"
        lemmas = [token.lemma_ for token in doc]
        text_normalized = " ".join(lemmas)

        for category in self.rules.get("categories", []):
            category_score = 0
            cat_matches = []

            # A. Match Mots-clés
            for keyword_obj in category.get("keywords", []):
                term = keyword_obj["term"]
                if term in text_normalized or term in text.lower():
                    weight = keyword_obj["weight"]
                    category_score += weight
                    cat_matches.append(term)

            # B. Match Patterns Regex (ex: Numéros Béninois)
            for pattern in category.get("patterns", []):
                if re.search(pattern, text, re.IGNORECASE):
                    # Un pattern regex vaut 40 points (indice fort)
                    category_score += 40
                    cat_matches.append(f"REGEX:{pattern}")

            if category_score > 0:
                detected_categories.append({
                    "id": category["id"],
                    "name": category["name"],
                    "score": min(category_score, 100), # Cap à 100
                    "matches": list(set(cat_matches))
                })
                total_risk_score = max(total_risk_score, category_score)

        # Seuil d'alerte global
        risk_threshold = self.rules.get("risk_threshold", 75)
        is_alert = total_risk_score >= risk_threshold

        return {
            "is_alert": is_alert,
            "risk_score": min(total_risk_score, 100),
            "categories": detected_categories,
            "entities": [(ent.text, ent.label_) for ent in doc.ents if ent.label_ in ["ORG", "LOC", "PER"]]
        }

# --- Test Unitaire Rapide ---
if __name__ == "__main__":
    # Si exécuté depuis la racine /app (Docker defaut)
    analyzer = FraudAnalyzer(rules_path="config/rules.json") 
    
    # Texte fictif d'arnaque
    fake_scam = """
    URGENT: MTN Mobile Money vous informe que vous avez reçu un transfert erroné de 50.000 FCFA.
    Veuillez renvoyer le code de validation au 66000000 pour annuler la transaction.
    Sinon votre compte sera bloqué. Kpayo interdit.
    """
    
    print("\n[+] Analyse du texte suspect :")
    print(fake_scam)
    result = analyzer.analyze_text(fake_scam)
    
    print("\n[=] RÉSULTAT :")
    print(json.dumps(result, indent=2, ensure_ascii=False))
