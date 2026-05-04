import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../application/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/verify_result.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

class ReportPage extends ConsumerStatefulWidget {
  const ReportPage({super.key});

  @override
  ConsumerState<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends ConsumerState<ReportPage> {
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _files = <XFile>[];
  bool _initializedFromDraft = false;
  int _interactionSelection = 1;

  void _seedDraftAttachments(VerifyDraft draft) {
    if (_initializedFromDraft) {
      return;
    }
    _initializedFromDraft = true;
    _files.addAll(
      draft.attachments.map(
        (DraftAttachment attachment) => XFile(
          attachment.path,
          name: attachment.name,
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    final XFile? file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file == null) {
      return;
    }
    setState(() {
      _files.add(file);
    });
  }

  Future<List<MultipartFile>> _toMultipartFiles() async {
    final List<MultipartFile> files = <MultipartFile>[];
    for (final XFile file in _files) {
      files.add(
        await MultipartFile.fromFile(
          file.path,
          filename: file.name,
        ),
      );
    }
    return files;
  }

  Future<void> _submit() async {
    final VerifyState verifyState = ref.read(verifyControllerProvider);
    if (verifyState.draft == null || verifyState.result == null) {
      return;
    }
    final List<MultipartFile> files = await _toMultipartFiles();
    await ref.read(reportControllerProvider.notifier).submit(
          draft: verifyState.draft!,
          verification: verifyState.result!,
          screenshots: files,
        );
    final ReportState reportState = ref.read(reportControllerProvider);
    if (!mounted || reportState.result == null) {
      return;
    }
    context.go('/verify/confirmation');
  }

  @override
  Widget build(BuildContext context) {
    final BeninShieldColors colors = context.shieldColors;
    final VerifyState verifyState = ref.watch(verifyControllerProvider);
    final ReportState reportState = ref.watch(reportControllerProvider);
    final VerifyDraft? draft = verifyState.draft;
    final VerifyResult? result = verifyState.result;

    if (draft == null || result == null) {
      return Scaffold(
        body: Column(
          children: <Widget>[
            const BrandBar(),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('Signalement indisponible', style: Theme.of(context).textTheme.headlineLarge),
                    const SizedBox(height: 12),
                    Text(
                      'Aucune vérification mobile active à transformer en signalement.',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => context.go('/verify'),
                      child: const Text('RETOUR'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    _seedDraftAttachments(draft);

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
                  Text('Signaler une menace', style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 12),
                  Text(
                    'Aide-nous à sécuriser l écosystème en rapportant les comportements suspects.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                  ),
                  const SizedBox(height: 20),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Icon(Icons.info_outline_rounded, color: colors.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text('ANALYSE REQUISE', style: Theme.of(context).textTheme.labelMedium),
                              const SizedBox(height: 8),
                              Text(
                                'Les informations soumises seront traitées par la cellule de cyberdéfense.',
                                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: <Widget>[
                            Text('CIBLE DÉTECTÉE', style: Theme.of(context).textTheme.labelMedium),
                            Chip(label: Text(result.riskLevel == 'FORT' ? 'SUSPECT' : 'À VÉRIFIER')),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Divider(color: colors.outlineSoft),
                        const SizedBox(height: 14),
                        Text('Message / URL', style: Theme.of(context).textTheme.bodyMedium),
                        const SizedBox(height: 8),
                        Text(
                          draft.url?.isNotEmpty == true ? draft.url! : draft.message,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                        const SizedBox(height: 18),
                        Text('Catégorie présumée', style: Theme.of(context).textTheme.bodyMedium),
                        const SizedBox(height: 8),
                        Text(
                          result.categoriesDetected.isEmpty
                              ? 'Fraude mobile suspecte'
                              : result.categoriesDetected.first.replaceAll('_', ' '),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('AVEZ-VOUS INTERAGI AVEC LA MENACE ?', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: colors.surfaceHighest.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: colors.outlineSoft),
                    ),
                    child: Row(
                      children: List<Widget>.generate(
                        3,
                        (int index) {
                          final bool selected = _interactionSelection == index;
                          final String label = switch (index) {
                            0 => 'Oui',
                            1 => 'Non',
                            _ => 'Sais pas',
                          };
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _interactionSelection = index),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                decoration: BoxDecoration(
                                  color: selected ? colors.surface : Colors.transparent,
                                  borderRadius: BorderRadius.circular(999),
                                  border: selected ? Border.all(color: colors.outline) : null,
                                ),
                                child: Text(
                                  label,
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context).textTheme.labelLarge,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('PREUVES SUPPLÉMENTAIRES', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: 10),
                  AppPanel(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      children: <Widget>[
                        OutlinedButton.icon(
                          onPressed: _pickImage,
                          icon: const Icon(Icons.cloud_upload_outlined),
                          label: const Text('DÉPOSER UNE CAPTURE'),
                        ),
                        const SizedBox(height: 14),
                        if (_files.isEmpty)
                          Text(
                            'PNG ou JPG. Les captures ajoutées pendant la vérification sont reprises automatiquement ici.',
                            style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                            textAlign: TextAlign.center,
                          )
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: <Widget>[
                              for (final XFile file in _files)
                                Chip(
                                  label: Text(file.name),
                                  onDeleted: () {
                                    setState(() {
                                      _files.remove(file);
                                    });
                                  },
                                ),
                            ],
                          ),
                      ],
                    ),
                  ),
                  if (reportState.errorMessage != null) ...<Widget>[
                    const SizedBox(height: 14),
                    Text(
                      reportState.errorMessage!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ],
                  const SizedBox(height: 26),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: reportState.isSubmitting ? null : _submit,
                      child: Text(reportState.isSubmitting ? 'ENVOI EN COURS...' : 'ENVOYER LE SIGNALEMENT'),
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
