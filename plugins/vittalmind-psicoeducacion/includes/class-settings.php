<?php
defined('ABSPATH') || exit;

class VMP_Settings {
    const OPTION_KEY = 'vmp_api_url';
    const NONCE_ACTION = 'vmp_settings_save';

    public static function init(): void {
        add_action('admin_post_vmp_save_settings', [self::class, 'handle_save']);
    }

    public static function activate(): void {
        if (!get_option(self::OPTION_KEY)) {
            add_option(self::OPTION_KEY, 'https://app.vittaminds.com');
        }
    }

    public static function deactivate(): void {
        delete_option(self::OPTION_KEY);
    }

    public static function get_api_url(): string {
        return rtrim(get_option(self::OPTION_KEY, 'https://app.vittaminds.com'), '/');
    }

    public static function handle_save(): void {
        if (!current_user_can('manage_options')) {
            wp_die('No tienes permisos.');
        }
        check_admin_referer(self::NONCE_ACTION);
        if (isset($_POST['api_url'])) {
            update_option(self::OPTION_KEY, sanitize_text_field($_POST['api_url']));
        }
        wp_safe_redirect(add_query_arg('saved', '1', wp_get_referer()));
        exit;
    }

    public static function render_page(): void {
        $api_url = self::get_api_url();
        ?>
        <div class="wrap">
            <h1>Configuración VittalMind Psicoeducación</h1>
            <?php if (isset($_GET['saved'])): ?>
                <div class="notice notice-success is-dismissible"><p>Configuración guardada.</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field(self::NONCE_ACTION); ?>
                <input type="hidden" name="action" value="vmp_save_settings">
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="api_url">URL del Backend API</label></th>
                        <td>
                            <input type="url" id="api_url" name="api_url"
                                   value="<?php echo esc_attr($api_url); ?>" class="regular-text" required>
                            <p class="description">Ej: <code>https://app.vittaminds.com</code> o <code>http://localhost:3000</code></p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Guardar configuración'); ?>
            </form>
            <hr>
            <h2>Estado de conexión</h2>
            <div id="vmp-connection-status">
                <p><span class="spinner" style="float:none;visibility:visible"></span> Verificando conexión...</p>
            </div>
        </div>
        <script>
        jQuery(document).ready(function($) {
            $.post(ajaxurl, { action: 'vmp_check_connection', nonce: '<?php echo esc_js(wp_create_nonce('vmp_check_connection')); ?>' }, function(r) {
                if (r.success) {
                    $('#vmp-connection-status').html('<p style="color:green">Conectado al backend correctamente.</p>');
                } else {
                    $('#vmp-connection-status').html('<p style="color:red">Error de conexión: ' + r.data + '</p>');
                }
            });
        });
        </script>
        <?php
    }
}

add_action('wp_ajax_vmp_check_connection', function () {
    if (!current_user_can('manage_options')) {
        wp_send_json_error('No tienes permisos.');
    }
    check_ajax_referer('vmp_check_connection', 'nonce');

    $url = VMP_Settings::get_api_url() . '/health';
    $response = wp_remote_get($url, ['timeout' => 10]);
    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (isset($body['status']) && $body['status'] === 'ok') {
        wp_send_json_success();
    }
    wp_send_json_error('Respuesta inesperada del servidor.');
});
