import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;

    return Scaffold(
      body: Column(
        children: <Widget>[
          const BrandBar(),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('À propos', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 12),
                  Text(
                    'BENIN CYBER SHIELD aide les citoyens à vérifier, documenter et signaler les arnaques Mobile Money.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 22),
                  AppPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('MISSION', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Text(
                          'L application mobile citoyenne permet de vérifier un message suspect en quelques secondes puis de le transformer en signalement exploitable.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('CONFIDENTIALITÉ', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Text(
                          'Aucun compte n est requis. L historique est rattaché à un identifiant d installation et les numéros affichés restent masqués.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('CHAÎNE DE PREUVE', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        Text(
                          'Les signalements critiques peuvent ensuite alimenter les transmissions probatoires vers les autorités et opérateurs concernés.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
