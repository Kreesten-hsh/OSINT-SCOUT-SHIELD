import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../application/providers.dart';
import '../../core/constants/benin_departments.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/bootstrap_data.dart';
import '../shared/app_panel.dart';
import '../shared/brand_bar.dart';

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

  static const List<({IconData icon, String title, String body})> _tips =
      <({IconData icon, String title, String body})>[
    (
      icon: Icons.wallet_giftcard_outlined,
      title: 'Gains inattendus',
      body: 'Ignore les messages qui annoncent un gain ou un remboursement non attendu.',
    ),
    (
      icon: Icons.timer_outlined,
      title: 'Pression temporelle',
      body: 'Les fraudeurs imposent souvent une urgence artificielle pour te faire agir vite.',
    ),
    (
      icon: Icons.link_off_rounded,
      title: 'Liens inconnus',
      body: 'N ouvre jamais un lien douteux qui te demande de verifier un compte ou un paiement.',
    ),
  ];

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
    final BeninShieldColors colors = context.shieldColors;
    final VerifyState verifyState = ref.watch(verifyControllerProvider);
    final AsyncValue<BootstrapData> bootstrapAsync = ref.watch(bootstrapProvider);
    final List<String> departments = bootstrapAsync.valueOrNull?.departments ?? beninDepartments;

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
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      decoration: BoxDecoration(
                        color: colors.surfaceLow,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: colors.outlineSoft),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: colors.success,
                              shape: BoxShape.circle,
                              boxShadow: <BoxShadow>[
                                BoxShadow(
                                  color: colors.success.withValues(alpha: 0.45),
                                  blurRadius: 10,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'PROTECTION ACTIVE',
                            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                  color: colors.onSurface,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  AppPanel(
                    padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                    glowColor: colors.primary,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          'Vous avez reçu un message suspect ?',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Colle le texte, le numéro, un département et des preuves facultatives pour déclencher une analyse immédiate.',
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted),
                        ),
                        const SizedBox(height: 24),
                        Text('CONTENU DU MESSAGE', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        TextField(
                          key: const Key('message-input'),
                          controller: _messageController,
                          minLines: 5,
                          maxLines: 8,
                          decoration: const InputDecoration(
                            hintText: 'Ex: Cliquez ici pour réclamer votre gain MTN de 50 000 FCFA...',
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text('NUMÉRO DE L EXPÉDITEUR', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        TextField(
                          key: const Key('phone-input'),
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            hintText: '+229 00 00 00 00',
                            prefixIcon: Padding(
                              padding: const EdgeInsets.only(left: 18, right: 10),
                              child: Center(
                                widthFactor: 1,
                                child: Text(
                                  '🇧🇯',
                                  style: Theme.of(context).textTheme.bodyLarge,
                                ),
                              ),
                            ),
                            suffixIcon: Icon(Icons.contact_phone_outlined, color: colors.muted),
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text('DÉPARTEMENT', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          initialValue: _department,
                          dropdownColor: colors.surfaceHighest,
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
                            hintText: 'Sélectionne un département',
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text('URL SUSPECTE', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _urlController,
                          decoration: const InputDecoration(
                            hintText: 'https://...',
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text('PREUVES COMPLÉMENTAIRES', style: Theme.of(context).textTheme.labelMedium),
                        const SizedBox(height: 10),
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
                              label: const Text('Ajouter une capture'),
                            ),
                          ],
                        ),
                        if (verifyState.errorMessage != null) ...<Widget>[
                          const SizedBox(height: 14),
                          Text(
                            verifyState.errorMessage!,
                            style: TextStyle(color: Theme.of(context).colorScheme.error),
                          ),
                        ],
                        const SizedBox(height: 24),
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
                                : const Icon(Icons.arrow_forward_rounded),
                            label: Text(
                              verifyState.isSubmitting
                                  ? 'ANALYSE EN COURS...'
                                  : 'ANALYSER LE MESSAGE',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    children: <Widget>[
                      Icon(Icons.lightbulb_outline_rounded, color: colors.primarySoft),
                      const SizedBox(width: 10),
                      Text('Conseils anti-fraude', style: Theme.of(context).textTheme.headlineSmall),
                    ],
                  ),
                  const SizedBox(height: 16),
                  for (final ({IconData icon, String title, String body}) tip in _tips) ...<Widget>[
                    AppPanel(
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: colors.surfaceHighest.withValues(alpha: 0.65),
                              shape: BoxShape.circle,
                              border: Border.all(color: colors.outlineSoft),
                            ),
                            child: Icon(tip.icon, color: colors.muted),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(tip.title, style: Theme.of(context).textTheme.labelLarge),
                                const SizedBox(height: 8),
                                Text(tip.body, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: colors.muted)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
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
