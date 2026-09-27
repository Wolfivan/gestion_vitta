<?php
/**
 * Plugin Name: VittalMind Psicoeducación
 * Plugin URI: https://vittalmind.com
 * Description: Panel administrativo para gestionar el contenido de psicoeducación de VittalMind. Se conecta a la API backend de VittalMind.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * Author: VittalMind
 * Text Domain: vittalmind-psicoeducacion
 */

defined('ABSPATH') || exit;

define('VMP_VERSION', '1.0.7');
define('VMP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VMP_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VMP_PLUGIN_BASENAME', plugin_basename(__FILE__));

require_once VMP_PLUGIN_DIR . 'includes/class-settings.php';
require_once VMP_PLUGIN_DIR . 'includes/class-api-client.php';
require_once VMP_PLUGIN_DIR . 'includes/class-auth.php';
require_once VMP_PLUGIN_DIR . 'includes/class-admin.php';

add_action('plugins_loaded', function () {
    VMP_Settings::init();
    VMP_Api_Client::init();
    VMP_Auth::init();
    VMP_Admin::init();
});

register_activation_hook(__FILE__, ['VMP_Settings', 'activate']);
register_deactivation_hook(__FILE__, ['VMP_Settings', 'deactivate']);

foreach (['get', 'post', 'put', 'delete'] as $method) {
    add_action("wp_ajax_vmp_api_{$method}", function () use ($method) {
        if (!wp_verify_nonce($_SERVER['HTTP_X_VMP_NONCE'] ?? '', 'vmp_ajax')) {
            wp_send_json_error('Nonce inválido');
        }
        if (!current_user_can('manage_options')) {
            wp_send_json_error('No autorizado');
        }
        $path = sanitize_text_field($_POST['path'] ?? '');
        if (empty($path)) {
            wp_send_json_error('Path requerido');
        }
        $body = [];
        if (in_array($method, ['post', 'put'])) {
            $body = json_decode(wp_unslash($_POST['body'] ?? '{}'), true) ?? [];
        }
        $result = in_array($method, ['get', 'delete'], true)
            ? VMP_Api_Client::$method($path)
            : VMP_Api_Client::$method($path, $body);
        if ($result['success']) {
            wp_send_json_success($result['data']);
        } else {
            wp_send_json_error($result['error'] ?? 'Error en la petición');
        }
    });
}
