import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../application/providers.dart';
import '../../data/models/verify_result.dart';
import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class ReportPage extends ConsumerStatefulWidget {
  const ReportPage({super.key});

  @override
  ConsumerState<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends ConsumerState<ReportPage> {
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _files = <XFile>[];
  bool _initializedFromDraft = false;

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
    final VerifyState verifyState = ref.watch(verifyControllerProvider);
    final ReportState reportState = ref.watch(reportControllerProvider);
    final VerifyDraft? draft = verifyState.draft;
    final VerifyResult? result = verifyState.result;

    if (draft == null || result == null) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: <Widget>[
                const PageHeader(
                  title: 'Signalement indisponible',
                  subtitle: 'Aucune verification mobile active a transformer en signalement.',
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => context.go('/verify'),
                  child: const Text('Retour'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    _seedDraftAttachments(draft);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const PageHeader(
                title: 'Signalement formel',
                subtitle: 'Confirme les donnees, joins des captures et envoie le dossier au systeme.',
              ),
              const SizedBox(height: 16),
              AppPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('MESSAGE', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(draft.message, style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 16),
                    Text('NUMERO', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(draft.phone, style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 16),
                    Text('SCORE ACTUEL', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text('${result.riskScore}/100 - ${result.riskLevel}', style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 16),
                    Text('CAPTURES COMPLEMENTAIRES', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Text(
                      'Les captures ajoutees pendant la verification sont deja reprises ici.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
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
                        OutlinedButton.icon(
                          onPressed: _pickImage,
                          icon: const Icon(Icons.add_photo_alternate_outlined),
                          label: const Text('Ajouter'),
                        ),
                      ],
                    ),
                    if (reportState.errorMessage != null) ...<Widget>[
                      const SizedBox(height: 12),
                      Text(
                        reportState.errorMessage!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: reportState.isSubmitting ? null : _submit,
                        child: Text(reportState.isSubmitting ? 'Envoi en cours...' : 'Envoyer le signalement'),
                      ),
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
