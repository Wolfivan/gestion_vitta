<?php
defined('ABSPATH') || exit;

/**
 * Página pública /canjear, destino del QR de los bonos. Se sirve sin tema ni wp_head():
 * el código va en el fragmento para no llegar al servidor, pero un tema con analítica
 * podría leerlo de location.hash. Aquí no se carga ningún script de terceros.
 */
class VMA_Public {
    const ROUTE = 'canjear';

    public static function init(): void {
        add_action('init', [self::class, 'maybe_render'], 1);
    }

    private static function is_redeem_request(): bool {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($method !== 'GET' && $method !== 'HEAD') {
            return false;
        }

        $uri  = (string) wp_parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
        $home = (string) wp_parse_url(home_url('/'), PHP_URL_PATH);

        return rtrim($uri, '/') === rtrim($home, '/') . '/' . self::ROUTE;
    }

    public static function maybe_render(): void {
        if (!self::is_redeem_request()) {
            return;
        }

        $nonce = base64_encode(random_bytes(16));

        status_header(200);
        nocache_headers();
        header('Content-Type: text/html; charset=utf-8');
        header('Referrer-Policy: no-referrer');
        header('X-Robots-Tag: noindex, nofollow');
        header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: default-src 'none'; style-src 'nonce-{$nonce}'; script-src 'nonce-{$nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");

        $app_store_url  = VMA_Settings::get_app_store_url();
        $play_store_url = VMA_Settings::get_play_store_url();

        include VMA_PLUGIN_DIR . 'public/canjear.php';
        exit;
    }
}
