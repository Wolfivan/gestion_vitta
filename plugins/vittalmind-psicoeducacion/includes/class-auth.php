<?php
defined('ABSPATH') || exit;

class VMP_Auth {
    const NONCE_ACTION = 'vmp_auth';

    public static function init(): void {
        add_action('admin_post_vmp_login', [self::class, 'handle_login']);
        add_action('admin_post_vmp_logout', [self::class, 'handle_logout']);
    }

    public static function is_authenticated(): bool {
        return VMP_Api_Client::has_token();
    }

    public static function handle_login(): void {
        check_admin_referer(self::NONCE_ACTION);

        $email    = sanitize_email($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($email) || empty($password)) {
            wp_safe_redirect(add_query_arg('login_error', '1', wp_get_referer()));
            exit;
        }

        $result = VMP_Api_Client::post('/auth/login', [
            'email'    => $email,
            'password' => $password,
        ], false);

        if ($result['success'] && isset($result['data']['jwt'])) {
            $refresh_token = isset($result['data']['refreshToken']) ? (string) $result['data']['refreshToken'] : '';
            VMP_Api_Client::set_tokens($result['data']['jwt'], $refresh_token);
            wp_safe_redirect(admin_url('admin.php?page=vmp-dashboard'));
        } else {
            $status = (int) ($result['status'] ?? 0);
            $error  = $result['error'] ?? '';

            if (empty($error)) {
                $error = $status >= 400
                    ? 'El servidor API respondió con el código HTTP ' . $status . '.'
                    : 'No se pudo conectar con el servidor API.';
            }

            wp_safe_redirect(add_query_arg('login_error', $error, wp_get_referer()));
        }
        exit;
    }

    public static function handle_logout(): void {
        check_admin_referer(self::NONCE_ACTION);
        VMP_Api_Client::clear_token();
        wp_safe_redirect(admin_url('admin.php?page=vmp-psicoeducacion'));
        exit;
    }

    public static function handle_unauthorized(): void {
        VMP_Api_Client::clear_token();
    }

    public static function render_login_page(): void {
        $error = isset($_GET['login_error']) ? sanitize_text_field($_GET['login_error']) : '';
        ?>
        <div class="wrap" style="max-width:460px;margin:60px auto">
            <div class="vmp-card" style="text-align:center">
                <h1 style="font-size:28px;margin-bottom:4px">VittalMind</h1>
                <p style="color:#71787e;margin-bottom:24px">Panel de Psicoeducación</p>

                <?php if ($error): ?>
                    <div class="notice notice-error is-dismissible"><p><?php echo esc_html($error); ?></p></div>
                <?php endif; ?>

                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <?php wp_nonce_field(self::NONCE_ACTION); ?>
                    <input type="hidden" name="action" value="vmp_login">

                    <p>
                        <input type="email" name="email" placeholder="Correo electrónico"
                               style="width:100%;padding:10px 14px;border:1px solid #d0d5dd;border-radius:8px;font-size:14px"
                               required autocomplete="email">
                    </p>
                    <p>
                        <input type="password" name="password" placeholder="Contraseña"
                               style="width:100%;padding:10px 14px;border:1px solid #d0d5dd;border-radius:8px;font-size:14px"
                               required autocomplete="current-password">
                    </p>
                    <p>
                        <button type="submit" class="button button-primary" style="width:100%;padding:10px;height:auto;font-size:15px">
                            Iniciar sesión
                        </button>
                    </p>
                </form>
            </div>
        </div>
        <?php
    }
}
