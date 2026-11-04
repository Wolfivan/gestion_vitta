<?php
defined('ABSPATH') || exit;

/**
 * Aviso por correo de solicitudes nuevas y contador del menú. WP-Cron consulta la API cada
 * hora: el menú lee el último valor guardado para no llamar a la API en cada página.
 * El correo solo dice cuántas hay: el contacto y el mensaje no salen del panel.
 */
class VMA_Notifier {
    const CRON_HOOK       = 'vma_check_requests';
    const COUNT_KEY       = 'vma_pending_count';
    const LAST_ID_KEY     = 'vma_last_notified_request';
    const SESSION_LOST_KEY = 'vma_cron_session_lost';
    const EMAIL_KEY       = 'vma_notify_email';

    public static function init(): void {
        add_action(self::CRON_HOOK, [self::class, 'check_requests']);
        add_action('admin_notices', [self::class, 'render_session_notice']);

        // También tras actualizar el plugin, que no pasa por la activación.
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            wp_schedule_event(time(), 'hourly', self::CRON_HOOK);
        }
    }

    public static function deactivate(): void {
        wp_clear_scheduled_hook(self::CRON_HOOK);
    }

    public static function get_notify_email(): string {
        return (string) get_option(self::EMAIL_KEY, get_option('admin_email'));
    }

    public static function pending_count(): int {
        return (int) get_option(self::COUNT_KEY, 0);
    }

    public static function menu_title(string $title): string {
        $count = self::pending_count();
        if ($count === 0) {
            return $title;
        }
        return $title . ' <span class="awaiting-mod">' . $count . '</span>';
    }

    private static function fetch_pending(): ?array {
        $result = VMA_Api_Client::get('/admin/access/requests?estado=pendiente&limit=20');
        if (!$result['success'] || !is_array($result['data'])) {
            if ((int) $result['status'] === 401) {
                update_option(self::SESSION_LOST_KEY, '1', false);
            }
            return null;
        }

        delete_option(self::SESSION_LOST_KEY);
        update_option(self::COUNT_KEY, (int) ($result['data']['pagination']['total'] ?? 0), false);
        return $result['data']['items'] ?? [];
    }

    public static function refresh_count(): void {
        self::fetch_pending();
    }

    public static function check_requests(): void {
        $items = self::fetch_pending();
        if ($items === null) {
            return;
        }

        $last_id = (int) get_option(self::LAST_ID_KEY, 0);
        $ids     = array_map('intval', array_column($items, 'id'));
        $nuevas  = count(array_filter($ids, fn(int $id): bool => $id > $last_id));
        if ($nuevas === 0) {
            return;
        }

        $sent = wp_mail(
            self::get_notify_email(),
            sprintf('VittalMind: %d solicitudes de acceso nuevas', $nuevas),
            sprintf(
                "Hay %d solicitudes de acceso nuevas por revisar.\n\nEntra al panel: %s",
                $nuevas,
                admin_url('admin.php?page=vma-requests')
            )
        );

        // Si el correo falla, las mismas solicitudes se avisan en la siguiente hora.
        if ($sent) {
            update_option(self::LAST_ID_KEY, max($ids), false);
        }
    }

    public static function render_session_notice(): void {
        $page = isset($_GET['page']) ? sanitize_key($_GET['page']) : '';
        if (strpos($page, 'vma-') !== 0 || !get_option(self::SESSION_LOST_KEY)) {
            return;
        }
        echo '<div class="notice notice-warning"><p>La sesión con el backend expiró: los avisos de solicitudes nuevas están detenidos. Vuelve a iniciar sesión en VM Accesos.</p></div>';
    }
}
