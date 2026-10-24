<?php
defined('ABSPATH') || exit;

class VMPN_Settings {
    const OPTION_KEY = 'vmpn_api_url';
    const NONCE_ACTION = 'vmpn_settings_save';

    public static function init(): void {
        add_action('admin_post_vmpn_save_settings', [self::class, 'handle_save']);
    }

    public static function activate(): void {
        if (!get_option(self::OPTION_KEY)) {
            add_option(self::OPTION_KEY, 'https://app.vittaminds.com');
        }
    }

    public static function deactivate(): void {
        // Se conserva la URL: desactivar el plugin no debe borrar configuración.
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
            update_option(self::OPTION_KEY, esc_url_raw(wp_unslash($_POST['api_url'])));
        }

        wp_safe_redirect(add_query_arg('saved', '1', wp_get_referer()));
        exit;
    }

    public static function render_page(): void {
        $api_url = self::get_api_url();
        ?>
        <div class="wrap">
            <h1>Configuración · Notificaciones VittalMind</h1>
            <?php if (isset($_GET['saved'])): ?>
                <div class="notice notice-success is-dismissible"><p>Configuración guardada.</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field(self::NONCE_ACTION); ?>
                <input type="hidden" name="action" value="vmpn_save_settings">
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="api_url">URL del Backend API</label></th>
                        <td>
                            <input type="url" id="api_url" name="api_url"
                                   value="<?php echo esc_attr($api_url); ?>" class="regular-text" required>
                            <p class="description">
                                Ej: <code>https://app.vittaminds.com</code> o <code>http://localhost:3000</code>
                            </p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Guardar configuración'); ?>
            </form>
            <div class="vmpn-card">
                <h2>Cómo se usa</h2>
                <ol>
                    <li>Inicia sesión con la cuenta de administrador del backend.</li>
                    <li>Revisa los copys en la pestaña <strong>Plantillas</strong>.</li>
                    <li>
                        Al guardar, la app recibe el nuevo texto en el siguiente envío.
                        No hay que recompilar ni publicar una actualización.
                    </li>
                </ol>
                <p class="vmpn-help">
                    Los textos deben ser amables y no culpabilizantes. Evita urgencia
                    artificial, diagnósticos o cualquier dato clínico: la notificación
                    solo debe invitar a un momento de bienestar.
                </p>
            </div>
        </div>
        <?php
    }
}
