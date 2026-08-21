var VMP = window.VMP || {};

(function($) {
    VMP.api = {
        get: function(path, data) {
            return $.ajax({
                url: vmp_ajax.ajax_url,
                method: 'POST',
                data: $.extend({ action: 'vmp_api_get', path: path }, data || {}),
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-VMP-Nonce', vmp_ajax.nonce);
                }
            }).fail(VMP.handleAjaxError);
        },

        post: function(path, body) {
            return $.ajax({
                url: vmp_ajax.ajax_url,
                method: 'POST',
                data: {
                    action: 'vmp_api_post',
                    path: path,
                    body: JSON.stringify(body || {})
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-VMP-Nonce', vmp_ajax.nonce);
                }
            }).fail(VMP.handleAjaxError);
        },

        put: function(path, body) {
            return $.ajax({
                url: vmp_ajax.ajax_url,
                method: 'POST',
                data: {
                    action: 'vmp_api_put',
                    path: path,
                    body: JSON.stringify(body || {})
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-VMP-Nonce', vmp_ajax.nonce);
                }
            }).fail(VMP.handleAjaxError);
        },

        del: function(path) {
            return $.ajax({
                url: vmp_ajax.ajax_url,
                method: 'POST',
                data: {
                    action: 'vmp_api_delete',
                    path: path
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-VMP-Nonce', vmp_ajax.nonce);
                }
            }).fail(VMP.handleAjaxError);
        }
    };

    VMP.handleAjaxError = function(xhr) {
        var msg = 'No se pudo conectar con el backend.';
        if (xhr && xhr.responseJSON && xhr.responseJSON.data) {
            msg = xhr.responseJSON.data;
        } else if (xhr && xhr.status) {
            msg += ' (HTTP ' + xhr.status + ')';
        }
        VMP.notice(msg, 'error');
    };

    VMP.escHtml = function(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    VMP.notice = function(message, type) {
        type = type || 'success';
        var $wrap = $('.vmp-notices');
        if (!$wrap.length) {
            $wrap = $('<div class="vmp-notices"></div>').prependTo('.vmp-card-wrap');
        }
        var $notice = $('<div class="notice notice-' + type + ' is-dismissible"><p>' + message + '</p></div>');
        $wrap.append($notice);
        setTimeout(function() { $notice.fadeOut(function() { $(this).remove(); }); }, 4000);
    };

    VMP.confirm = function(message, callback) {
        if (confirm(message)) {
            callback();
        }
    };

    VMP.renderModal = function(title, content) {
        var $overlay = $('#vmp-modal-overlay');
        if (!$overlay.length) {
            $overlay = $('<div id="vmp-modal-overlay" class="vmp-modal-overlay"><div class="vmp-modal"><button class="vmp-modal-close">&times;</button><div class="vmp-modal-body"></div></div></div>');
            $('body').append($overlay);
            $overlay.on('click', function(e) {
                if (e.target === this) $(this).removeClass('active');
            });
            $overlay.find('.vmp-modal-close').on('click', function() {
                $overlay.removeClass('active');
            });
        }
        $overlay.find('.vmp-modal-body').html(
            '<h2>' + title + '</h2>' + content
        );
        $overlay.addClass('active');
    };

    VMP.closeModal = function() {
        $('#vmp-modal-overlay').removeClass('active');
    };

    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') VMP.closeModal();
    });
})(jQuery);
