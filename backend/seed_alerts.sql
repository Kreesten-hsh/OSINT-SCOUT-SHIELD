-- Insert 4 test alerts for demonstration
INSERT INTO
    alerts (
        uuid,
        url,
        source_type,
        risk_score,
        status,
        created_at,
        updated_at,
        is_confirmed,
        analysis_note
    )
VALUES (
        gen_random_uuid (),
        'https://darkweb-forum.onion/user/suspect001',
        'DARK_WEB',
        92,
        'NEW',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours',
        FALSE,
        NULL
    ),
    (
        gen_random_uuid (),
        'https://twitter.com/suspicious_actor',
        'SOCIAL_MEDIA',
        78,
        'INVESTIGATING',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '5 hours',
        FALSE,
        'Compte suspect détecté, analyse en cours.'
    ),
    (
        gen_random_uuid (),
        'https://pastebin.com/data-leak-2024',
        'PASTE_SITE',
        88,
        'CONFIRMED',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '12 hours',
        TRUE,
        'Fuite de données confirmée, contient des informations sensibles.'
    ),
    (
        gen_random_uuid (),
        'https://forum.hacker-site.net/thread/credentials',
        'FORUM',
        65,
        'ANALYZED',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '1 day',
        FALSE,
        'Menace faible, aucune action requise pour le moment.'
    );