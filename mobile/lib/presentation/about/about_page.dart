import 'package:flutter/material.dart';

import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const PageHeader(
                title: 'A propos',
                subtitle: 'BENIN CYBER SHIELD aide les citoyens a verifier, documenter et signaler les arnaques Mobile Money.',
              ),
              const SizedBox(height: 16),
              AppPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('MISSION', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(
                      'L application mobile citoyenne permet de verifier un message suspect en quelques secondes, puis de le transformer en signalement exploitable.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 16),
                    Text('CONFIDENTIALITE', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(
                      'Aucun compte n est requis. L historique est rattache a un identifiant d installation et les numeros affiches restent masques.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 16),
                    Text('AUTORITES', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(
                      'Les signalements critiques peuvent ensuite alimenter les transmissions probatoires vers les autorites et operateurs concernes.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
