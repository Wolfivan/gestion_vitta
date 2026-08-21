<?php
defined('ABSPATH') || exit;

class VMP_Api_Client {
    const TOKEN_TRANSIENT   = 'vmp_jwt_token';
    const REFRESH_TRANSIENT = 'vmp_refresh_token';
    const TOKEN_TTL         = 55 * 60;
    const REFRESH_TOKEN_TTL = 29 * 24 * 60 * 60;

    private static string $token = '';
    private static string $refresh_token = '';

    public static function init(): void {
        self::$token         = (string) get_transient(self::TOKEN_TRANSIENT);
        self::$refresh_token = (string) get_transient(self::REFRESH_TRANSIENT);
    }

    public static function set_token(string $token): void {
        self::$token = $token;
        set_transient(self::TOKEN_TRANSIENT, $token, self::TOKEN_TTL);
    }

    public static function set_refresh_token(string $refresh_token): void {
        self::$refresh_token = $refresh_token;
        set_transient(self::REFRESH_TRANSIENT, $refresh_token, self::REFRESH_TOKEN_TTL);
    }

    public static function set_tokens(string $token, string $refresh_token): void {
        self::set_token($token);
        self::set_refresh_token($refresh_token);
    }

    public static function get_token(): string {
        return self::$token;
    }

    public static function get_refresh_token(): string {
        return self::$refresh_token;
    }

    public static function clear_token(): void {
        self::$token         = '';
        self::$refresh_token = '';
        delete_transient(self::TOKEN_TRANSIENT);
        delete_transient(self::REFRESH_TRANSIENT);
    }

    public static function has_token(): bool {
        return !empty(self::$token);
    }

    private static function get_headers(bool $auth = true): array {
        $headers = ['Content-Type' => 'application/json'];
        if ($auth && self::has_token()) {
            $headers['Authorization'] = 'Bearer ' . self::$token;
        }
        return $headers;
    }

    public static function get(string $path, bool $auth = true): array {
        return self::send('GET', $path, null, $auth);
    }

    public static function post(string $path, array $body = [], bool $auth = true): array {
        return self::send('POST', $path, $body, $auth);
    }

    public static function put(string $path, array $body = [], bool $auth = true): array {
        return self::send('PUT', $path, $body, $auth);
    }

    public static function delete(string $path, bool $auth = true): array {
        return self::send('DELETE', $path, null, $auth);
    }

    private static function send(string $method, string $path, $body, bool $auth): array {
        if ($auth && !self::has_token()) {
            if (self::try_refresh()) {
                $result = self::handle_response(self::request($method, $path, $body, $auth));
                if ($result['status'] !== 401) {
                    return $result;
                }
            }
            return self::session_expired();
        }

        $result = self::handle_response(self::request($method, $path, $body, $auth));

        if ($auth && $result['status'] === 401) {
            if (self::try_refresh()) {
                $result = self::handle_response(self::request($method, $path, $body, $auth));
                if ($result['status'] !== 401) {
                    return $result;
                }
            }

            // Si el refresh falló pero otro request en paralelo ya renovó, reintentar con el jwt fresco.
            $fresh = (string) get_transient(self::TOKEN_TRANSIENT);
            if ($fresh !== '' && $fresh !== self::$token) {
                self::$token = $fresh;
                $result = self::handle_response(self::request($method, $path, $body, $auth));
                if ($result['status'] !== 401) {
                    return $result;
                }
            }

            self::clear_token();
            return self::session_expired();
        }

        if ($auth && $result['success']) {
            self::touch_token();
        }

        return $result;
    }

    /**
     * @return array|WP_Error
     */
    private static function request(string $method, string $path, $body, bool $auth) {
        $url  = VMP_Settings::get_api_url() . '/' . ltrim($path, '/');
        $args = [
            'method'  => $method,
            'headers' => self::get_headers($auth),
            'timeout' => 30,
        ];
        if (in_array($method, ['POST', 'PUT'], true) && is_array($body)) {
            $args['body'] = wp_json_encode($body);
        }
        return wp_remote_request($url, $args);
    }

    private static function try_refresh(): bool {
        $refresh_token = self::get_refresh_token();
        if (empty($refresh_token)) {
            return false;
        }

        $result = self::handle_response(self::request('POST', '/auth/refresh', ['refreshToken' => $refresh_token], false));

        if (!$result['success'] || !is_array($result['data'])) {
            return false;
        }

        $jwt   = isset($result['data']['jwt']) ? (string) $result['data']['jwt'] : '';
        if ($jwt === '') {
            return false;
        }

        $refresh = isset($result['data']['refreshToken']) ? (string) $result['data']['refreshToken'] : '';
        self::set_tokens($jwt, $refresh !== '' ? $refresh : $refresh_token);
        return true;
    }

    private static function touch_token(): void {
        if (self::has_token()) {
            set_transient(self::TOKEN_TRANSIENT, self::$token, self::TOKEN_TTL);
        }
    }

    private static function session_expired(): array {
        return [
            'success' => false,
            'status'  => 401,
            'data'    => null,
            'error'   => 'Tu sesión con el backend expiró. Vuelve a iniciar sesión.',
        ];
    }

    private static function handle_response($response): array {
        if (is_wp_error($response)) {
            return [
                'success' => false,
                'status'  => 0,
                'data'    => null,
                'error'   => $response->get_error_message(),
            ];
        }
        $status = wp_remote_retrieve_response_code($response);
        $body   = json_decode(wp_remote_retrieve_body($response), true);

        return [
            'success' => $status >= 200 && $status < 300,
            'status'  => $status,
            'data'    => $body,
            'error'   => $status >= 400 ? (is_array($body) && isset($body['error']['message']) ? $body['error']['message'] : 'Error del servidor') : null,
        ];
    }
}
