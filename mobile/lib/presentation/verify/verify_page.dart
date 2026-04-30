import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../application/providers.dart';
import '../../core/constants/benin_departments.dart';
import '../../data/models/bootstrap_data.dart';
import '../shared/app_panel.dart';
import '../shared/page_header.dart';

class VerifyPage extends ConsumerStatefulWidget {
  const VerifyPage({super.key});

  @override
  ConsumerState<VerifyPage> createState() => _VerifyPageState();
}

class _VerifyPageState extends ConsumerState<VerifyPage> {
  final TextEditingController _messageController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _urlController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  final List<XFile> _attachments = <XFile>[];
  String? _department;

  @override
  void dispose() {
    _messageController.dispose();
    _phoneController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final XFile? file = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );
    if (file == null) {
      return;
    }
    setState(() {
      _attachments.add(file);
    });
  }

  Future<void> _submit() async {
    await ref.read(verifyControllerProvider.notifier).submit(
          message: _messageController.text,
          phone: _phoneController.text,
          attachments: _attachments
              .map(
                (XFile file) => DraftAttachment(
                  path: file.path,
                  name: file.name,
                ),
              )
              .toList(growable: false),
          department: _department,
          url: _urlController.text.trim().isEmpty ? null : _urlController.text.trim(),
        );
    final VerifyState state = ref.read(verifyControllerProvider);
    if (!mounted || state.result == null) {
      return;
    }
    context.go('/verify/result');
  }

  @override
  Widget build(BuildContext context) {
    final VerifyState verifyState = ref.watch(verifyControllerProvider);
    final AsyncValue<BootstrapData> bootstrapAsync = ref.watch(bootstrapProvider);
    final List<String> departments = bootstrapAsync.valueOrNull?.departments ?? beninDepartments;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const PageHeader(
                title: 'Verifier un message',
                subtitle: 'Analyse un message suspect, ajoute une URL ou des captures, puis declenche un signalement si necessaire.',
              ),
              const SizedBox(height: 16),
              AppPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text('MESSAGE SUSPECT', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    TextField(
                      key: const Key('message-input'),
                      controller: _messageController,
                      minLines: 5,
                      maxLines: 8,
                      decoration: const InputDecoration(
                        hintText: 'Colle ici le contenu recu.',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('NUMERO SUSPECT', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    TextField(
                      key: const Key('phone-input'),
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        hintText: '0169647090',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('DEPARTEMENT', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _department,
                      items: departments
                          .map(
                            (String item) => DropdownMenuItem<String>(
                              value: item,
                              child: Text(item),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (String? value) {
                        setState(() {
                          _department = value;
                        });
                      },
                      decoration: const InputDecoration(
                        hintText: 'Selectionne un departement',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('URL OPTIONNELLE', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _urlController,
                      decoration: const InputDecoration(
                        hintText: 'https://...',
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('PIECES JOINTES', style: Theme.of(context).textTheme.labelMedium),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: <Widget>[
                        for (final XFile file in _attachments)
                          Chip(
                            label: Text(file.name),
                            onDeleted: () {
                              setState(() {
                                _attachments.remove(file);
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
                    if (verifyState.errorMessage != null) ...<Widget>[
                      const SizedBox(height: 12),
                      Text(
                        verifyState.errorMessage!,
                        style: TextStyle(color: Theme.of(context).colorScheme.error),
                      ),
                    ],
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: verifyState.isSubmitting ? null : _submit,
                        icon: verifyState.isSubmitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.verified_outlined),
                        label: Text(verifyState.isSubmitting ? 'Analyse en cours...' : 'Verifier'),
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
