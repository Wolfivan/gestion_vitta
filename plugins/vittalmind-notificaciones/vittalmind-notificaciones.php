<?php
/**
 * Plugin Name: VittalMind Notificaciones
 * Plugin URI: https://vittalmind.com
 * Description: Panel para revisar y ajustar los copys de las notificaciones push de VittalMind. Consume la API del backend con la sesión del psicólogo.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * Author: VittalMind
 * Text Domain: vittalmind-notificaciones
 */

defined('ABSPATH') || exit;

define('VMPN_VERSION', '1.0.0');
define('VMPN_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VMPN_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VMPN_PLUGIN_BASENAME', plugin_basename(__FILE__));

require_once VMPN_PLUGIN_DIR . 'includes/class-settings.php';
require_once VMPN_PLUGIN_DIR . 'includes/class-api-client.php';
require_once VMPN_PLUGIN_DIR . 'includes/class-auth.php';
require_once VMPN_PLUGIN_DIR . 'includes/class-admin.php';

add_action('plugins_loaded', function () {
    VMPN_Settings::init();
    VMPN_Api_Client::init();
    VMPN_Auth::init();
    VMPN_Admin::init();
});

register_activation_hook(__FILE__, ['VMPN_Settings', 'activate']);
register_deactivation_hook(__FILE__, ['VMPN_Settings', 'deactivate']);

// Proxy AJAX: el navegador del psicólogo nunca ve el JWT del backend.
foreach (['get', 'put'] as $method) {
    add_action("wp_ajax_vmpn_api_{$method}", function () use ($method) {
        if (!wp_verify_nonce($_SERVER['HTTP_X_VMPN_NONCE'] ?? '', 'vmpn_ajax')) {
            wp_send_json_error('Nonce inválido');
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error('No autorizado');
        }

        $path = isset($_POST['path']) ? sanitize_text_field(wp_unslash($_POST['path'])) : '';
        if ($path === '' || strpos($path, '/admin/notifications/') !== 0) {
            wp_send_json_error('Ruta no permitida');
        }

        if ($method === 'put') {
            $body = json_decode(wp_unslash($_POST['body'] ?? '{}'), true);
            $result = VMPN_Api_Client::put($path, is_array($body) ? $body : []);
        } else {
            $result = VMPN_Api_Client::get($path);
        }

        if ($result['success']) {
            wp_send_json_success($result['data']);
        }
        wp_send_json_error($result['error'] ?? 'Error en la petición');
    });
}
