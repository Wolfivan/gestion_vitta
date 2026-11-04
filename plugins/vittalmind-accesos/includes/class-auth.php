<?php
defined('ABSPATH') || exit;

class VMA_Auth {
    const NONCE_ACTION = 'vma_auth';
    // La sesión del backend se comparte con psicoeducación: salir de Accesos no borra
    // los transients, solo marca que este usuario de WordPress cerró aquí.
    const LOGGED_OUT_META = 'vma_logged_out';

    public static function init(): void {
        add_action('admin_post_vma_login', [self::class, 'handle_login']);
        add_action('admin_post_vma_logout', [self::class, 'handle_logout']);
    }

    public static function is_authenticated(): bool {
        return VMA_Api_Client::has_session()
            && !get_user_meta(get_current_user_id(), self::LOGGED_OUT_META, true);
    }

    public static function handle_login(): void {
        check_admin_referer(self::NONCE_ACTION);

        if (!current_user_can('manage_options')) {
            wp_die('No tienes permisos.');
        }

        $email    = sanitize_email(wp_unslash($_POST['email'] ?? ''));
        $password = (string) wp_unslash($_POST['password'] ?? '');

        if ($email === '' || $password === '') {
            wp_safe_redirect(add_query_arg('login_error', '1', wp_get_referer()));
            exit;
        }

        $result = VMA_Api_Client::post('/auth/login', [
            'email'    => $email,
            'password' => $password,
        ], false);

        if ($result['success'] && isset($result['data']['jwt'])) {
            $refresh = isset($result['data']['refreshToken'])
                ? (string) $result['data']['refreshToken']
                : '';
            VMA_Api_Client::set_tokens($result['data']['jwt'], $refresh);

            // El backend exige rol admin para /admin/access/*.
            $check = VMA_Api_Client::get('/admin/access/plans');
            if ((int) $check['status'] === 403) {
                VMA_Api_Client::clear_token();
                $message = 'Esta cuenta no tiene permisos de administrador en el backend.';
                wp_safe_redirect(add_query_arg('login_error', urlencode($message), wp_get_referer()));
                exit;
            }

            delete_user_meta(get_current_user_id(), self::LOGGED_OUT_META);
            wp_safe_redirect(admin_url('admin.php?page=vma-users'));
        } else {
            $status = (int) ($result['status'] ?? 0);
            $error  = $result['error'] ?? '';

            if (empty($error)) {
                $error = $status >= 400
                    ? 'El servidor API respondió con el código HTTP ' . $status . '.'
                    : 'No se pudo conectar con el servidor API.';
            }

            wp_safe_redirect(add_query_arg('login_error', urlencode($error), wp_get_referer()));
        }
        exit;
    }

    public static function handle_logout(): void {
        check_admin_referer(self::NONCE_ACTION);
        update_user_meta(get_current_user_id(), self::LOGGED_OUT_META, '1');
        wp_safe_redirect(admin_url('admin.php?page=vma-users'));
        exit;
    }

    public static function render_login_page(): void {
        $error = isset($_GET['login_error']) ? sanitize_text_field(wp_unslash($_GET['login_error'])) : '';
        ?>
        <div class="wrap vma-login">
            <div class="vma-card">
                <h1>VittalMind</h1>
                <p class="vma-help">Accesos y planes</p>

                <?php if ($error): ?>
                    <div class="notice notice-error"><p><?php echo esc_html($error); ?></p></div>
                <?php endif; ?>

                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <?php wp_nonce_field(self::NONCE_ACTION); ?>
                    <input type="hidden" name="action" value="vma_login">
                    <p><input type="email" name="email" placeholder="Correo electrónico" required autocomplete="email"></p>
                    <p><input type="password" name="password" placeholder="Contraseña" required autocomplete="current-password"></p>
                    <p><button type="submit" class="button button-primary">Iniciar sesión</button></p>
                </form>
            </div>
        </div>
        <?php
    }
}
