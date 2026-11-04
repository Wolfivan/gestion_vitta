<?php
defined('ABSPATH') || exit;
/** @var string $nonce */
/** @var string $app_store_url */
/** @var string $play_store_url */
?><!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Canjear tu bono · Vitta Mind</title>
<style nonce="<?php echo esc_attr($nonce); ?>">
    :root {
        --bg: #f6f8fa;
        --surface: #ffffff;
        --text: #1e293b;
        --muted: #64748b;
        --primary: #2d6182;
        --line: #e2e8f0;
    }
    * { box-sizing: border-box; }
    body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.5;
    }
    main { max-width: 480px; margin: 0 auto; padding: 32px 16px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 0 0 8px; }
    p { margin: 0; }
    .muted { color: var(--muted); font-size: 14px; }
    .card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 20px;
        margin-top: 16px;
    }
    .code {
        display: block;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 1px;
        text-align: center;
        word-break: break-all;
        margin: 8px 0 16px;
    }
    .button {
        display: block;
        width: 100%;
        padding: 12px 16px;
        border: 1px solid var(--primary);
        border-radius: 8px;
        background: var(--surface);
        color: var(--primary);
        font: inherit;
        font-weight: 600;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
    }
    .button + .button { margin-top: 8px; }
    .primary { background: var(--primary); color: #fff; }
    ol { margin: 0; padding-left: 20px; }
    li + li { margin-top: 6px; }
    [hidden] { display: none; }
</style>
</head>
<body>
<main>
    <h1>Vitta Mind</h1>
    <p class="muted">Canjea tu bono de acceso dentro de la app.</p>

    <section class="card" id="code-card" hidden>
        <h2>Tu código</h2>
        <strong class="code" id="code"></strong>
        <button type="button" class="button" id="copy">Copiar código</button>
        <a class="button primary" id="open-app">Abrir en la app</a>
    </section>

    <section class="card">
        <h2>Cómo canjearlo</h2>
        <ol>
            <li>Abre la app e inicia sesión o crea tu cuenta.</li>
            <li>Entra a Cuenta y toca Redimir.</li>
            <li>Escribe el código o escanea el QR.</li>
        </ol>
    </section>

    <?php if ($app_store_url !== '' || $play_store_url !== ''): ?>
    <section class="card">
        <h2>¿Aún no tienes la app?</h2>
        <?php if ($play_store_url !== ''): ?>
            <a class="button" href="<?php echo esc_url($play_store_url); ?>">Descargar en Google Play</a>
        <?php endif; ?>
        <?php if ($app_store_url !== ''): ?>
            <a class="button" href="<?php echo esc_url($app_store_url); ?>">Descargar en App Store</a>
        <?php endif; ?>
    </section>
    <?php endif; ?>
</main>

<script nonce="<?php echo esc_attr($nonce); ?>">
(function () {
    var match = /^#codigo=([A-Za-z0-9-]{4,60})$/.exec(window.location.hash);
    if (!match) return;

    var code = match[1].toUpperCase();
    document.getElementById('code').textContent = code;
    document.getElementById('open-app').href = 'vittalmind://canjear?codigo=' + encodeURIComponent(code);
    document.getElementById('code-card').hidden = false;

    var copy = document.getElementById('copy');

    function confirmCopy() {
        copy.textContent = 'Código copiado';
    }

    function selectCode() {
        var range = document.createRange();
        range.selectNodeContents(document.getElementById('code'));
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = 'Código seleccionado: cópialo';
    }

    copy.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(confirmCopy, selectCode);
        } else {
            selectCode();
        }
    });
})();
</script>
</body>
</html>
