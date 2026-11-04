<?php
defined('ABSPATH') || exit;

class VMA_Settings {
    // Misma opción que el plugin de psicoeducación: la URL de la API es una sola.
    const OPTION_KEY = 'vmp_api_url';
    const NONCE_ACTION = 'vma_settings_save';
    const APP_STORE_KEY = 'vma_app_store_url';
    const PLAY_STORE_KEY = 'vma_play_store_url';
    const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.vittalmind.app';

    public static function init(): void {
        add_action('admin_post_vma_save_settings', [self::class, 'handle_save']);
    }

    public static function activate(): void {
        if (!get_option(self::OPTION_KEY)) {
            add_option(self::OPTION_KEY, 'https://app.vittaminds.com');
        }
    }

    public static function get_api_url(): string {
        return rtrim(get_option(self::OPTION_KEY, 'https://app.vittaminds.com'), '/');
    }

    public static function get_app_store_url(): string {
        return (string) get_option(self::APP_STORE_KEY, '');
    }

    public static function get_play_store_url(): string {
        return (string) get_option(self::PLAY_STORE_KEY, self::DEFAULT_PLAY_STORE_URL);
    }

    public static function handle_save(): void {
        if (!current_user_can('manage_options')) {
            wp_die('No tienes permisos.');
        }
        check_admin_referer(self::NONCE_ACTION);

        if (isset($_POST['api_url'])) {
            update_option(self::OPTION_KEY, esc_url_raw(wp_unslash($_POST['api_url'])));
        }
        if (isset($_POST['notify_email'])) {
            update_option(VMA_Notifier::EMAIL_KEY, sanitize_email(wp_unslash($_POST['notify_email'])));
        }
        foreach (['app_store_url' => self::APP_STORE_KEY, 'play_store_url' => self::PLAY_STORE_KEY] as $field => $key) {
            if (isset($_POST[$field])) {
                update_option($key, esc_url_raw(wp_unslash($_POST[$field]), ['https']));
            }
        }

        wp_safe_redirect(add_query_arg('saved', '1', wp_get_referer()));
        exit;
    }

    public static function render_page(): void {
        $api_url = self::get_api_url();
        ?>
        <div class="wrap">
            <h1>Configuración · Accesos VittalMind</h1>
            <?php if (isset($_GET['saved'])): ?>
                <div class="notice notice-success is-dismissible"><p>Configuración guardada.</p></div>
            <?php endif; ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field(self::NONCE_ACTION); ?>
                <input type="hidden" name="action" value="vma_save_settings">
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="api_url">URL del Backend API</label></th>
                        <td>
                            <input type="url" id="api_url" name="api_url"
                                   value="<?php echo esc_attr($api_url); ?>" class="regular-text" required>
                            <p class="description">
                                Compartida con el plugin de psicoeducación. Ej: <code>https://app.vittaminds.com</code>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="notify_email">Correo para solicitudes nuevas</label></th>
                        <td>
                            <input type="email" id="notify_email" name="notify_email"
                                   value="<?php echo esc_attr(VMA_Notifier::get_notify_email()); ?>" class="regular-text">
                            <p class="description">Recibe cuántas solicitudes hay, sin datos de quien solicita. Requiere SMTP configurado en WordPress.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="app_store_url">Enlace de App Store</label></th>
                        <td>
                            <input type="url" id="app_store_url" name="app_store_url"
                                   value="<?php echo esc_attr(self::get_app_store_url()); ?>" class="regular-text">
                            <p class="description">Se muestra en la página /canjear. Vacío: no aparece el botón.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="play_store_url">Enlace de Google Play</label></th>
                        <td>
                            <input type="url" id="play_store_url" name="play_store_url"
                                   value="<?php echo esc_attr(self::get_play_store_url()); ?>" class="regular-text">
                        </td>
                    </tr>
                </table>
                <?php submit_button('Guardar'); ?>
            </form>
        </div>
        <?php
    }
}
