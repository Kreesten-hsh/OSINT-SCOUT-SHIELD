import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  static const List<({String title, String body, IconData icon})> _blocks =
      <({String title, String body, IconData icon})>[
    (
      title: 'Mission mobile',
      body: 'Le téléphone devient un poste de veille local pour repérer les messages suspects avant qu ils ne fassent des dégâts.',
      icon: Icons.shield_outlined,
    ),
    (
      title: 'Portail citoyen',
      body: 'Le formulaire complet de vérification et de signalement reste côté web pour préserver une expérience mobile plus directe.',
      icon: Icons.open_in_browser_rounded,
    ),
    (
      title: 'Chaîne de preuve',
      body: 'Les signaux remontés peuvent nourrir des dossiers probatoires et des transmissions structurées vers les autorités compétentes.',
      icon: Icons.file_present_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;

    return Scaffold(
      body: Column(
        children: <Widget>[
          const BrandBar(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 132),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('À propos', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 12),
                  Text(
                    'BENIN CYBER SHIELD protège les citoyens face aux arnaques Mobile Money en séparant la veille mobile locale et le signalement formel.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 22),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                    glowColor: colors.primary,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Architecture produit', style: Theme.of(context).textTheme.headlineSmall),
                        const SizedBox(height: 10),
                        Text(
                          'Mobile pour la veille et l historique. Web pour la vérification détaillée, les pièces jointes et le signalement citoyen complet.',
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  for (final ({String title, String body, IconData icon}) block in _blocks) ...<Widget>[
                    AppPanel(
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: colors.surfaceHighest.withValues(alpha: 0.72),
                              border: Border.all(color: colors.outlineSoft),
                            ),
                            child: Icon(block.icon, color: colors.primarySoft),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(block.title, style: Theme.of(context).textTheme.labelLarge),
                                const SizedBox(height: 6),
                                Text(
                                  block.body,
                                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (block != _blocks.last) const SizedBox(height: 12),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
