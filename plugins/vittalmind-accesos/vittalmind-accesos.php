<?php
/**
 * Plugin Name: VittalMind Accesos
 * Plugin URI: https://vittalmind.com
 * Description: Panel de usuarios, solicitudes, planes y matriz de accesos de VittalMind. Consume la API del backend con la misma sesión del plugin de psicoeducación.
 * Version: 1.3.2
 * Requires PHP: 7.4
 * Author: VittalMind
 * Text Domain: vittalmind-accesos
 */

defined('ABSPATH') || exit;

define('VMA_VERSION', '1.3.2');
define('VMA_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VMA_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VMA_PLUGIN_BASENAME', plugin_basename(__FILE__));

require_once VMA_PLUGIN_DIR . 'includes/class-settings.php';
require_once VMA_PLUGIN_DIR . 'includes/class-api-client.php';
require_once VMA_PLUGIN_DIR . 'includes/class-auth.php';
require_once VMA_PLUGIN_DIR . 'includes/class-admin.php';
require_once VMA_PLUGIN_DIR . 'includes/class-public.php';
require_once VMA_PLUGIN_DIR . 'includes/class-notifier.php';

add_action('plugins_loaded', function () {
    VMA_Settings::init();
    VMA_Api_Client::init();
    VMA_Auth::init();
    VMA_Admin::init();
    VMA_Public::init();
    VMA_Notifier::init();
});

register_activation_hook(__FILE__, ['VMA_Settings', 'activate']);
register_deactivation_hook(__FILE__, ['VMA_Notifier', 'deactivate']);

/**
 * Solo se reenvían rutas de administración de accesos. La ruta no admite `%` ni `..`
 * para que nadie salga de /admin/access/ con una ruta codificada; la consulta viaja
 * sin sanitize_text_field porque esa función elimina los %XX de una búsqueda.
 */
function vma_is_allowed_path(string $path): bool {
    $parts = explode('?', $path, 2);
    if (!preg_match('#^/admin/access/[A-Za-z0-9_\-./]+$#', $parts[0]) || strpos($parts[0], '..') !== false) {
        return false;
    }
    return !isset($parts[1]) || preg_match('#^[A-Za-z0-9_\-.~%&=+]*$#', $parts[1]) === 1;
}

// Proxy AJAX: el navegador del administrador nunca ve el JWT del backend.
foreach (['get', 'post', 'put', 'delete'] as $method) {
    add_action("wp_ajax_vma_api_{$method}", function () use ($method) {
        if (!wp_verify_nonce($_SERVER['HTTP_X_VMA_NONCE'] ?? '', 'vma_ajax')) {
            wp_send_json_error('Nonce inválido');
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error('No autorizado');
        }
        if (!VMA_Auth::is_authenticated()) {
            wp_send_json_error('Tu sesión con el backend expiró. Vuelve a iniciar sesión.');
        }

        $path = isset($_POST['path']) ? (string) wp_unslash($_POST['path']) : '';
        if (!vma_is_allowed_path($path)) {
            wp_send_json_error('Ruta no permitida');
        }

        if ($method === 'get') {
            $result = VMA_Api_Client::get($path);
        } else {
            $body = json_decode((string) wp_unslash($_POST['body'] ?? '{}'), true);
            $result = VMA_Api_Client::$method($path, is_array($body) ? $body : []);
        }

        if ($result['success']) {
            wp_send_json_success($result['data']);
        }
        wp_send_json_error($result['error'] ?? 'Error en la petición');
    });
}
