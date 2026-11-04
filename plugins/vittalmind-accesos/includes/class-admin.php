<?php
defined('ABSPATH') || exit;

class VMA_Admin {
    const CAPABILITY = 'manage_options';

    // Página => título y script. La lista blanca decide qué archivo se incluye.
    const PAGES = [
        'vma-users'    => ['title' => 'Usuarios', 'slug' => 'users'],
        'vma-requests' => ['title' => 'Solicitudes', 'slug' => 'requests'],
        'vma-codes'    => ['title' => 'Códigos', 'slug' => 'codes'],
        'vma-plans'    => ['title' => 'Planes', 'slug' => 'plans'],
        'vma-features' => ['title' => 'Features', 'slug' => 'features'],
    ];

    public static function init(): void {
        add_action('admin_menu', [self::class, 'register_menu']);
        add_action('admin_enqueue_scripts', [self::class, 'enqueue_assets']);
    }

    public static function register_menu(): void {
        add_menu_page(
            'VittalMind Accesos',
            VMA_Notifier::menu_title('VM Accesos'),
            self::CAPABILITY,
            'vma-users',
            [self::class, 'route_page'],
            'dashicons-groups',
            32
        );

        foreach (self::PAGES as $page => $config) {
            add_submenu_page(
                'vma-users',
                $config['title'],
                $page === 'vma-requests' ? VMA_Notifier::menu_title($config['title']) : $config['title'],
                self::CAPABILITY,
                $page,
                [self::class, 'route_page']
            );
        }

        add_submenu_page(
            'vma-users',
            'Configuración',
            'Configuración',
            self::CAPABILITY,
            'vma-settings',
            [self::class, 'route_page']
        );
    }

    public static function enqueue_assets(string $hook): void {
        if (strpos($hook, 'vma-') === false) {
            return;
        }

        wp_enqueue_style('vma-admin', VMA_PLUGIN_URL . 'admin/css/admin.css', [], VMA_VERSION);
        wp_enqueue_script('vma-admin', VMA_PLUGIN_URL . 'admin/js/admin.js', ['jquery'], VMA_VERSION, true);

        wp_localize_script('vma-admin', 'vma_ajax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('vma_ajax'),
        ]);

        $page = isset($_GET['page']) ? sanitize_key($_GET['page']) : '';
        if (isset(self::PAGES[$page]) && VMA_Auth::is_authenticated()) {
            $slug = self::PAGES[$page]['slug'];
            wp_enqueue_script("vma-{$slug}", VMA_PLUGIN_URL . "admin/js/{$slug}.js", ['vma-admin'], VMA_VERSION, true);
        }
    }

    public static function route_page(): void {
        if (!current_user_can(self::CAPABILITY)) {
            wp_die('No tienes permisos para acceder a esta página.');
        }

        $page = isset($_GET['page']) ? sanitize_key($_GET['page']) : 'vma-users';

        if ($page === 'vma-settings') {
            VMA_Settings::render_page();
            return;
        }

        if (!VMA_Auth::is_authenticated()) {
            VMA_Auth::render_login_page();
            return;
        }

        if ($page === 'vma-requests') {
            VMA_Notifier::refresh_count();
        }

        $slug = self::PAGES[$page]['slug'] ?? 'users';
        echo '<div class="wrap vma-wrap"><div class="vma-notices"></div>';
        include VMA_PLUGIN_DIR . "admin/pages/{$slug}.php"; // nosemgrep: slug sale de la lista blanca PAGES.
        self::render_logout();
        echo '</div>';
    }

    private static function render_logout(): void {
        ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="vma-logout">
            <?php wp_nonce_field(VMA_Auth::NONCE_ACTION); ?>
            <input type="hidden" name="action" value="vma_logout">
            <button type="submit" class="button">Cerrar sesión de Accesos</button>
        </form>
        <?php
    }
}
