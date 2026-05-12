# Section 3.2 corrigee - Diagramme de classes, dictionnaire, regles et schema relationnel

## Diagnostic du diagramme actuel

Le diagramme actuel represente correctement les grands objets metier du systeme, mais il ne correspond pas exactement a la base de donnees actuelle du projet. Les corrections principales sont les suivantes :

- `Message` ne porte pas directement `#idNumero`. Dans le modele reel, un message citoyen est analyse, puis il peut donner lieu a un ou plusieurs signalements formels ; le numero suspect est lie au signalement formel.
- `Analyse` est en relation `1..1` avec `Message`, car la table `analyses.message_id` est unique.
- `Signalement` correspond a la table `formal_reports`, pas a une simple table independante. Il reference le message, l'analyse et le numero suspect.
- `DossierForensique` correspond a `forensic_bundles` et depend d'un signalement formel, pas directement d'un numero suspect.
- `Incident` correspond a `impersonation_incidents` et sert de table d'association metier entre une PME et un signalement formel.
- Le modele reel comporte une table de pieces probatoires (`evidence_items`) rattachee aux signalements formels.
- `Utilisateur` possede un `status`, en plus de `role`, car les comptes PME peuvent etre actifs, en attente, rejetes ou desactives.
- `PME` correspond a `business_profiles` et contient des listes JSON pour les mots-cles et les numeros legitimes.

## Classes corrigees

### Utilisateur

Represente un compte authentifie de la plateforme. Il peut etre administrateur ou PME.

Attributs :
- `idUtilisateur : int`
- `email : string`
- `motDePasseHash : string`
- `role : string`
- `statut : string`
- `dateCreation : datetime`
- `dateModification : datetime`

Relations :
- un utilisateur PME possede zero ou un profil PME ;
- un administrateur peut valider plusieurs profils PME ;
- un utilisateur peut etre associe a zero ou plusieurs signalements formels.

### MessageCitoyen

Represente le message suspect soumis par un citoyen ou capture par l'application mobile.

Attributs :
- `idMessage : int`
- `uuid : uuid`
- `contenu : text`
- `canal : string`
- `idInstallationMobile : string`
- `typeHistorique : string`
- `numeroSoumisMasque : string`
- `departement : string`
- `sourceDepartement : string`
- `urlSoumise : string`
- `ipHashSoumetteur : string`
- `dateCreation : datetime`
- `dateModification : datetime`

Relations :
- un message genere une et une seule analyse ;
- un message peut donner lieu a zero ou plusieurs signalements formels.

### AnalyseMessage

Represente le resultat du moteur de detection applique a un message.

Attributs :
- `idAnalyse : int`
- `uuid : uuid`
- `scoreRisque : int`
- `niveauRisque : string`
- `categoriePrincipale : string`
- `reglesDeclenchees : json`
- `categoriesDetectees : json`
- `explication : json`
- `recommandations : json`
- `segmentsSurlignes : json`
- `alerteFon : text`
- `dateCreation : datetime`

Relations :
- une analyse appartient a un seul message ;
- une analyse peut justifier zero ou plusieurs signalements formels.

### NumeroSuspect

Represente un numero de telephone detecte dans des signalements. Le numero n'est pas indexe en clair : un hash sert a la correlation et une version chiffree permet la restitution controlee.

Attributs :
- `idNumero : int`
- `uuid : uuid`
- `phoneHash : string`
- `phoneCiphertext : text`
- `nombreSignalements : int`
- `premiereDetection : datetime`
- `derniereDetection : datetime`
- `dateCreation : datetime`
- `dateModification : datetime`

Relations :
- un numero suspect peut etre concerne par plusieurs signalements formels.

### SignalementFormel

Represente le signalement confirme par le citoyen apres l'analyse du message.

Attributs :
- `idSignalement : int`
- `uuid : uuid`
- `referencePublique : string`
- `statut : string`
- `custodyHash : string`
- `legacyAlertUuid : uuid`
- `dateCreation : datetime`
- `dateModification : datetime`

Relations :
- un signalement formel concerne un message, une analyse et un numero suspect ;
- un signalement peut contenir plusieurs pieces probatoires ;
- un signalement peut declencher zero ou plusieurs incidents d'usurpation ;
- un signalement peut produire zero ou plusieurs dossiers forensiques.

### PieceJointeProbatoire

Represente une preuve rattachee a un signalement : capture, fichier, extrait de contenu ou metadonnees.

Attributs :
- `idPiece : int`
- `uuid : uuid`
- `type : string`
- `cheminFichier : string`
- `hashFichier : string`
- `apercuTexte : text`
- `metadonnees : json`
- `dateCreation : datetime`

Relations :
- une piece probatoire appartient a un seul signalement formel.

### ProfilPME

Represente l'identite surveillee d'une PME inscrite.

Attributs :
- `idPME : int`
- `uuid : uuid`
- `nomOfficiel : string`
- `motsCles : json`
- `numerosLegitimes : json`
- `emailContact : string`
- `telephoneContact : string`
- `statutValidation : string`
- `dateValidation : datetime`
- `dateCreation : datetime`
- `dateModification : datetime`

Relations :
- un profil PME appartient a un seul utilisateur ;
- un profil PME peut recevoir plusieurs incidents d'usurpation ;
- un profil PME peut etre valide par un administrateur.

### IncidentUsurpation

Represente la detection d'un signalement qui correspond aux mots-cles d'une PME.

Attributs :
- `idIncident : int`
- `uuid : uuid`
- `statut : string`
- `raisonDetection : text`
- `custodyHash : string`
- `dateCreation : datetime`

Relations :
- un incident appartient a une seule PME ;
- un incident est toujours rattache a un signalement formel.

### DossierForensique

Represente le dossier probatoire genere a partir d'un signalement formel.

Attributs :
- `idDossier : int`
- `uuid : uuid`
- `hashGlobal : string`
- `manifest : json`
- `cheminZip : string`
- `cheminPdf : string`
- `cheminJson : string`
- `statut : string`
- `dateCreation : datetime`
- `dateTransmission : datetime`

Relations :
- un dossier appartient a un seul signalement formel ;
- un dossier peut donner lieu a plusieurs transmissions externes.

### TransmissionExterne

Represente l'envoi d'un dossier vers un connecteur externe simule : ASIN/CNIN ou operateur mobile.

Attributs :
- `idTransmission : int`
- `uuid : uuid`
- `typeDestinataire : string`
- `endpointDestinataire : string`
- `payload : json`
- `statut : string`
- `nombreTentatives : int`
- `referenceAccuse : string`
- `prochaineTentative : datetime`
- `derniereErreur : text`
- `dateCreation : datetime`
- `dateModification : datetime`
- `dateLivraison : datetime`

Relations :
- une transmission externe appartient a un seul dossier forensique.

## Relations UML corrigees

- `Utilisateur 1 -- 0..1 ProfilPME` : un compte de role PME possede au plus un profil PME.
- `Utilisateur 1 -- 0..* SignalementFormel` : un signalement peut etre anonyme ou rattache a un utilisateur.
- `Utilisateur 1 -- 0..* ProfilPME` : un administrateur peut valider plusieurs profils PME.
- `MessageCitoyen 1 -- 1 AnalyseMessage` : chaque message analyse possede une analyse unique.
- `MessageCitoyen 1 -- 0..* SignalementFormel` : un message peut etre simplement verifie ou formellement signale.
- `AnalyseMessage 1 -- 0..* SignalementFormel` : un signalement s'appuie sur l'analyse existante.
- `NumeroSuspect 1 -- 0..* SignalementFormel` : un meme numero peut etre associe a plusieurs signalements.
- `SignalementFormel 1 -- 0..* PieceJointeProbatoire` : un signalement peut contenir plusieurs preuves.
- `SignalementFormel 1 -- 0..* IncidentUsurpation` : un signalement peut declencher des incidents PME.
- `ProfilPME 1 -- 0..* IncidentUsurpation` : une PME peut recevoir plusieurs incidents.
- `SignalementFormel 1 -- 0..* DossierForensique` : un signalement peut produire plusieurs versions ou formats de dossier.
- `DossierForensique 1 -- 0..* TransmissionExterne` : un dossier peut etre transmis a plusieurs destinataires.

## Dictionnaire des donnees essentiel

Le dictionnaire suivant ne reprend que les donnees metier indispensables a la comprehension du systeme. Les champs purement techniques comme `uuid`, `created_at` ou `updated_at` existent dans la base, mais ne sont pas repetes ici afin de garder le modele lisible.

| Propriete | Designation | Type logique | Classe |
| --- | --- | --- | --- |
| idUtilisateur | Identifiant du compte | Numerique | Utilisateur |
| email | Adresse email de connexion | Alphanumerique | Utilisateur |
| motDePasseHash | Mot de passe stocke sous forme hashee | Alphanumerique | Utilisateur |
| role | Role du compte : ADMIN ou SME | Alphanumerique | Utilisateur |
| statut | Etat du compte | Alphanumerique | Utilisateur |
| idMessage | Identifiant du message soumis | Numerique | MessageCitoyen |
| contenu | Texte du message suspect | Texte | MessageCitoyen |
| canal | Origine du message : portail web ou application mobile | Alphanumerique | MessageCitoyen |
| departement | Departement associe au signalement | Alphanumerique | MessageCitoyen |
| urlSoumise | URL suspecte eventuellement detectee | Alphanumerique | MessageCitoyen |
| ipHashSoumetteur | Hash de l'adresse IP du soumetteur | Alphanumerique | MessageCitoyen |
| idAnalyse | Identifiant de l'analyse | Numerique | AnalyseMessage |
| scoreRisque | Score de risque calcule sur 100 | Numerique | AnalyseMessage |
| niveauRisque | Niveau de risque : FAIBLE, MOYEN ou FORT | Alphanumerique | AnalyseMessage |
| categoriePrincipale | Categorie dominante de fraude | Alphanumerique | AnalyseMessage |
| recommandations | Conseils affiches a l'utilisateur | JSON | AnalyseMessage |
| idNumero | Identifiant du numero suspect | Numerique | NumeroSuspect |
| phoneHash | Hash SHA-256 du numero suspect | Alphanumerique | NumeroSuspect |
| nombreSignalements | Nombre de signalements lies au numero | Numerique | NumeroSuspect |
| idSignalement | Identifiant du signalement formel | Numerique | SignalementFormel |
| referencePublique | Reference publique communiquee au citoyen | Alphanumerique | SignalementFormel |
| custodyHash | Empreinte SHA-256 de la chaine de conservation | Alphanumerique | SignalementFormel |
| statutSignalement | Etat de traitement du signalement | Alphanumerique | SignalementFormel |
| idPiece | Identifiant de la piece probatoire | Numerique | PieceJointeProbatoire |
| typePiece | Type de preuve conservee | Alphanumerique | PieceJointeProbatoire |
| hashFichier | Empreinte SHA-256 du fichier probatoire | Alphanumerique | PieceJointeProbatoire |
| idPME | Identifiant du profil PME | Numerique | ProfilPME |
| nomOfficiel | Nom officiel de la PME | Alphanumerique | ProfilPME |
| motsCles | Mots-cles servant a detecter l'usurpation | JSON | ProfilPME |
| numerosLegitimes | Numeros officiels declares par la PME | JSON | ProfilPME |
| statutValidation | Etat de validation du profil PME | Alphanumerique | ProfilPME |
| idIncident | Identifiant de l'incident d'usurpation | Numerique | IncidentUsurpation |
| raisonDetection | Motif du rattachement a la PME | Texte | IncidentUsurpation |
| statutIncident | Etat de traitement de l'incident | Alphanumerique | IncidentUsurpation |
| idDossier | Identifiant du dossier forensique | Numerique | DossierForensique |
| hashGlobal | Empreinte SHA-256 globale du dossier | Alphanumerique | DossierForensique |
| statutDossier | Etat du dossier probatoire | Alphanumerique | DossierForensique |
| idTransmission | Identifiant de la transmission externe | Numerique | TransmissionExterne |
| typeDestinataire | ASIN/CNIN ou operateur mobile | Alphanumerique | TransmissionExterne |
| statutTransmission | Etat de la transmission | Alphanumerique | TransmissionExterne |
| nombreTentatives | Nombre d'essais effectues | Numerique | TransmissionExterne |
| referenceAccuse | Reference de reception externe | Alphanumerique | TransmissionExterne |

## Regles de gestion essentielles

- RG1 : Un citoyen peut soumettre un message suspect sans creer de compte.
- RG2 : Chaque message soumis genere une analyse unique.
- RG3 : Une analyse produit un score de risque, un niveau de risque, une categorie principale et des recommandations.
- RG4 : Un message analyse peut etre simplement consulte ou transforme en signalement formel.
- RG5 : Un signalement formel est toujours rattache a un message, a son analyse et a un numero suspect.
- RG6 : Un numero suspect est identifie par un hash SHA-256 unique afin de permettre la correlation sans exposer le numero en clair.
- RG7 : Chaque signalement formel possede une reference publique unique et une empreinte de custody.
- RG8 : Un signalement formel peut contenir plusieurs pieces probatoires.
- RG9 : Un profil PME appartient a un seul utilisateur de role PME.
- RG10 : Une PME active peut recevoir plusieurs incidents d'usurpation lorsqu'un signalement correspond a ses mots-cles.
- RG11 : Un dossier forensique est produit a partir d'un signalement formel et contient les preuves, le manifeste et les empreintes d'integrite.
- RG12 : Un dossier forensique peut etre transmis a plusieurs destinataires externes avec suivi du statut et des tentatives.

## Schema logique relationnel essentiel

Notation : les cles primaires sont indiquees par `(PK)` et les cles etrangeres par `(FK)`. Les champs techniques secondaires ne sont pas affiches.

- `users` (`id` PK, `email`, `password_hash`, `role`, `status`)
- `messages` (`id` PK, `content`, `channel`, `department`, `submitted_url`, `ip_hash_submitter`)
- `analyses` (`id` PK, `message_id` FK -> `messages.id`, `risk_score`, `risk_level`, `primary_category`, `recommendations`)
- `suspect_numbers` (`id` PK, `phone_hash`, `phone_ciphertext`, `report_count`, `first_seen`, `last_seen`)
- `formal_reports` (`id` PK, `public_reference`, `message_id` FK -> `messages.id`, `analysis_id` FK -> `analyses.id`, `suspect_number_id` FK -> `suspect_numbers.id`, `reporter_user_id` FK -> `users.id`, `status`, `custody_hash`)
- `evidence_items` (`id` PK, `report_id` FK -> `formal_reports.id`, `type`, `file_path`, `file_hash`)
- `business_profiles` (`id` PK, `user_id` FK -> `users.id`, `official_name`, `keywords_json`, `legit_numbers_json`, `validation_status`, `validated_by_user_id` FK -> `users.id`)
- `impersonation_incidents` (`id` PK, `business_profile_id` FK -> `business_profiles.id`, `formal_report_id` FK -> `formal_reports.id`, `status`, `detection_reason`, `custody_hash`)
- `forensic_bundles` (`id` PK, `report_id` FK -> `formal_reports.id`, `global_hash`, `manifest_json`, `zip_path`, `pdf_path`, `json_path`, `status`)
- `external_transmissions` (`id` PK, `bundle_id` FK -> `forensic_bundles.id`, `target_type`, `status`, `attempts`, `ack_reference`)

## Cardinalites principales

- `users 1 -- 0..1 business_profiles`
- `users 1 -- 0..* formal_reports`
- `users 1 -- 0..* business_profiles` via `validated_by_user_id`
- `messages 1 -- 1 analyses`
- `messages 1 -- 0..* formal_reports`
- `analyses 1 -- 0..* formal_reports`
- `suspect_numbers 1 -- 0..* formal_reports`
- `formal_reports 1 -- 0..* evidence_items`
- `formal_reports 1 -- 0..* impersonation_incidents`
- `business_profiles 1 -- 0..* impersonation_incidents`
- `formal_reports 1 -- 0..* forensic_bundles`
- `forensic_bundles 1 -- 0..* external_transmissions`
