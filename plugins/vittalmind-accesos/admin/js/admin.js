var VMA = window.VMA || {};

(function($) {
    function call(action, path, body) {
        return $.ajax({
            url: vma_ajax.ajax_url,
            method: 'POST',
            data: { action: action, path: path, body: JSON.stringify(body || {}) },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-VMA-Nonce', vma_ajax.nonce);
            }
        }).fail(VMA.handleAjaxError);
    }

    VMA.api = {
        get: function(path) { return call('vma_api_get', path); },
        post: function(path, body) { return call('vma_api_post', path, body); },
        put: function(path, body) { return call('vma_api_put', path, body); },
        del: function(path, body) { return call('vma_api_delete', path, body); }
    };

    VMA.handleAjaxError = function(xhr) {
        var msg = 'No se pudo conectar con el backend.';
        if (xhr && xhr.status) {
            msg += ' (HTTP ' + xhr.status + ')';
        }
        VMA.notice(msg, 'error');
    };

    // Ejecuta onOk con los datos o muestra el error del backend.
    VMA.handle = function(onOk) {
        return function(r) {
            if (r && r.success) {
                onOk(r.data);
            } else {
                VMA.notice((r && r.data) || 'Error en la petición.', 'error');
            }
        };
    };

    VMA.escHtml = function(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    VMA.notice = function(message, type) {
        var $notice = $('<div class="notice is-dismissible"><p></p></div>');
        $notice.addClass('notice-' + (type || 'success')).find('p').text(message);
        $('.vma-notices').append($notice);
        setTimeout(function() { $notice.fadeOut(function() { $(this).remove(); }); }, 5000);
    };

    VMA.formatDate = function(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
    };

    // YYYY-MM-DD en hora de Colombia, para los campos de fecha.
    VMA.toBogotaDate = function(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    };

    // Una fecha elegida en el panel es el final de ese dia en Colombia.
    VMA.endOfDayBogota = function(date) {
        return date + 'T23:59:59-05:00';
    };

    VMA.shortId = function(idAnonimo) {
        return String(idAnonimo).slice(0, 8);
    };

    VMA.identityHtml = function(item, name, email) {
        if (item.identidadOculta) {
            return '<span class="vma-badge vma-badge-hidden">Identidad oculta</span>' +
                '<code>' + VMA.escHtml(VMA.shortId(item.idAnonimo)) + '</code>';
        }
        return '<strong>' + VMA.escHtml(name) + '</strong><br>' + VMA.escHtml(email);
    };

    VMA.renderPagination = function($el, pagination, onPage) {
        if (!pagination || pagination.totalPages <= 1) {
            $el.empty();
            return;
        }
        var $prev = $('<button type="button" class="button">Anterior</button>')
            .prop('disabled', pagination.page <= 1)
            .on('click', function() { onPage(pagination.page - 1); });
        var $next = $('<button type="button" class="button">Siguiente</button>')
            .prop('disabled', pagination.page >= pagination.totalPages)
            .on('click', function() { onPage(pagination.page + 1); });
        var $label = $('<span></span>').text(
            'Página ' + pagination.page + ' de ' + pagination.totalPages + ' (' + pagination.total + ')'
        );
        $el.empty().append($prev, $label, $next);
    };

    // Campos de vigencia compartidos por asignar un plan y aprobar una solicitud.
    VMA.expiryFieldsHtml = function() {
        return '<div class="vma-field"><label for="vma-expiry-mode">Vigencia</label>' +
            '<select id="vma-expiry-mode">' +
            '<option value="plan">Duración por defecto del plan</option>' +
            '<option value="dias">Número de días</option>' +
            '<option value="fecha">Hasta una fecha</option>' +
            '<option value="sin">Sin vencimiento</option>' +
            '</select></div>' +
            '<div class="vma-field vma-expiry-dias" hidden><label for="vma-expiry-dias">Días</label>' +
            '<input type="number" id="vma-expiry-dias" min="1" max="3650" value="30"></div>' +
            '<div class="vma-field vma-expiry-fecha" hidden><label for="vma-expiry-fecha">Fecha (hora de Colombia)</label>' +
            '<input type="date" id="vma-expiry-fecha"></div>' +
            '<p class="vma-help">Si la persona ya tiene este plan, la vigencia se suma a la actual.</p>';
    };

    VMA.bindExpiryFields = function() {
        $('#vma-expiry-mode').on('change', function() {
            $('.vma-expiry-dias').prop('hidden', this.value !== 'dias');
            $('.vma-expiry-fecha').prop('hidden', this.value !== 'fecha');
        });
    };

    VMA.readExpiry = function() {
        var mode = $('#vma-expiry-mode').val();
        if (mode === 'dias') return { duracionDias: parseInt($('#vma-expiry-dias').val(), 10) };
        if (mode === 'sin') return { sinVencimiento: true };
        if (mode === 'fecha') {
            var fecha = $('#vma-expiry-fecha').val();
            return fecha ? { expiraAt: VMA.endOfDayBogota(fecha) } : null;
        }
        return {};
    };

    VMA.renderModal = function(title, content) {
        var $overlay = $('#vma-modal-overlay');
        if (!$overlay.length) {
            $overlay = $('<div id="vma-modal-overlay" class="vma-modal-overlay"><div class="vma-modal"><button type="button" class="vma-modal-close" aria-label="Cerrar">&times;</button><h2></h2><div class="vma-modal-body"></div></div></div>');
            $('body').append($overlay);
            $overlay.on('click', function(e) {
                if (e.target === this) VMA.closeModal();
            });
            $overlay.on('click', '.vma-modal-close, .vma-cancel', VMA.closeModal);
        }
        $overlay.find('h2').text(title);
        $overlay.find('.vma-modal-body').html(content);
        $overlay.addClass('active');
    };

    VMA.closeModal = function() {
        $('#vma-modal-overlay').removeClass('active');
    };

    VMA.formActionsHtml = function(label) {
        return '<div class="vma-form-actions">' +
            '<button type="button" class="button vma-cancel">Cancelar</button>' +
            '<button type="button" class="button button-primary vma-save">' + VMA.escHtml(label) + '</button>' +
            '</div>';
    };

    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') VMA.closeModal();
    });
})(jQuery);
