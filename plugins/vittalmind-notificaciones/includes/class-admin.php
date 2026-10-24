<?php
defined('ABSPATH') || exit;

class VMPN_Admin {
    const CAPABILITY = 'manage_options';

    public static function init(): void {
        add_action('admin_menu', [self::class, 'register_menu']);
        add_action('admin_enqueue_scripts', [self::class, 'enqueue_assets']);
    }

    public static function register_menu(): void {
        add_menu_page(
            'VittalMind Notificaciones',
            'VM Notificaciones',
            self::CAPABILITY,
            'vmpn-notificaciones',
            [self::class, 'route_page'],
            'dashicons-bell',
            31
        );

        add_submenu_page(
            'vmpn-notificaciones',
            'Plantillas',
            'Plantillas',
            self::CAPABILITY,
            'vmpn-templates',
            [self::class, 'route_page']
        );

        add_submenu_page(
            'vmpn-notificaciones',
            'Configuración',
            'Configuración',
            self::CAPABILITY,
            'vmpn-settings',
            [self::class, 'route_page']
        );
    }

    public static function enqueue_assets(string $hook): void {
        if (strpos($hook, 'vmpn-') === false) {
            return;
        }

        wp_enqueue_style('vmpn-admin', VMPN_PLUGIN_URL . 'admin/css/admin.css', [], VMPN_VERSION);
        wp_enqueue_script('vmpn-admin', VMPN_PLUGIN_URL . 'admin/js/admin.js', ['jquery'], VMPN_VERSION, true);

        wp_localize_script('vmpn-admin', 'vmpn_ajax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('vmpn_ajax'),
            'api_url'  => VMPN_Settings::get_api_url(),
        ]);
    }

    public static function route_page(): void {
        if (!current_user_can(self::CAPABILITY)) {
            wp_die('No tienes permisos para acceder a esta página.');
        }

        $screen = isset($_GET['page']) ? sanitize_key($_GET['page']) : 'vmpn-templates';

        if ($screen === 'vmpn-settings') {
            VMPN_Settings::render_page();
            return;
        }

        if (!VMPN_Auth::is_authenticated()) {
            VMPN_Auth::render_login_page();
            return;
        }

        include VMPN_PLUGIN_DIR . 'admin/pages/templates.php';
    }
}
