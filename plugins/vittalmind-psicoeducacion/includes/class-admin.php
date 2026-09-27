<?php
defined('ABSPATH') || exit;

class VMP_Admin {
    const CAPABILITY = 'manage_options';

    public static function init(): void {
        add_action('admin_menu', [self::class, 'register_menu']);
        add_action('admin_enqueue_scripts', [self::class, 'enqueue_assets']);
    }

    public static function register_menu(): void {
        add_menu_page(
            'VittalMind Psicoeducación',
            'VittalMind',
            self::CAPABILITY,
            'vmp-psicoeducacion',
            [self::class, 'route_page'],
            'dashicons-welcome-learn',
            30
        );

        add_submenu_page(
            'vmp-psicoeducacion',
            'Dashboard',
            'Dashboard',
            self::CAPABILITY,
            'vmp-dashboard',
            [self::class, 'route_page']
        );

        add_submenu_page(
            'vmp-psicoeducacion',
            'Categorías',
            'Categorías',
            self::CAPABILITY,
            'vmp-categories',
            [self::class, 'route_page']
        );

        add_submenu_page(
            'vmp-psicoeducacion',
            'Temas',
            'Temas',
            self::CAPABILITY,
            'vmp-topics',
            [self::class, 'route_page']
        );

        add_submenu_page(
            'vmp-psicoeducacion',
            'Bloques de Contenido',
            'Bloques',
            self::CAPABILITY,
            'vmp-blocks',
            [self::class, 'route_page']
        );

        add_submenu_page(
            'vmp-psicoeducacion',
            'Configuración',
            'Configuración',
            self::CAPABILITY,
            'vmp-settings',
            [self::class, 'route_page']
        );
    }

    public static function enqueue_assets(string $hook): void {
        if (strpos($hook, 'vmp-') === false) {
            return;
        }

        wp_enqueue_style('vmp-admin', VMP_PLUGIN_URL . 'admin/css/admin.css', [], VMP_VERSION);
        wp_enqueue_script('vmp-admin', VMP_PLUGIN_URL . 'admin/js/admin.js', ['jquery'], VMP_VERSION, true);

        // El selector de iconos se carga en todas las pantallas porque el
        // formulario de categoría se reutiliza, no porque hoy se use en todas.
        wp_enqueue_script(
            'vmp-icon-picker',
            VMP_PLUGIN_URL . 'admin/js/icon-picker.js',
            ['jquery', 'vmp-admin'],
            VMP_VERSION,
            true
        );

        $screen = $_GET['page'] ?? '';

        $js_files = [
            'vmp-categories' => 'categories.js',
            'vmp-topics'     => 'topics.js',
            'vmp-blocks'     => 'blocks.js',
        ];

        if (isset($js_files[$screen])) {
            wp_enqueue_script(
                'vmp-' . $screen,
                VMP_PLUGIN_URL . 'admin/js/' . $js_files[$screen],
                ['jquery', 'vmp-admin'],
                VMP_VERSION,
                true
            );
        }

        wp_localize_script('vmp-admin', 'vmp_ajax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('vmp_ajax'),
            'api_url'  => VMP_Settings::get_api_url(),
        ]);
    }

    public static function route_page(): void {
        if (!current_user_can(self::CAPABILITY)) {
            wp_die('No tienes permisos para acceder a esta página.');
        }

        $screen = $_GET['page'] ?? 'vmp-dashboard';

        if ($screen !== 'vmp-settings' && !VMP_Auth::is_authenticated()) {
            VMP_Auth::render_login_page();
            return;
        }

        $pages = [
            'vmp-dashboard'   => 'dashboard.php',
            'vmp-categories'  => 'categories.php',
            'vmp-topics'      => 'topics.php',
            'vmp-blocks'      => 'blocks.php',
            'vmp-settings'    => null,
        ];

        if (isset($pages[$screen]) && $pages[$screen]) {
            $path = VMP_PLUGIN_DIR . 'admin/pages/' . $pages[$screen];
            if (file_exists($path)) {
                include $path;
            }
        } elseif ($screen === 'vmp-settings') {
            VMP_Settings::render_page();
        } else {
            include VMP_PLUGIN_DIR . 'admin/pages/dashboard.php';
        }
    }
}
