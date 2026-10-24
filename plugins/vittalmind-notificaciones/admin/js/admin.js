var VMPN = window.VMPN || {};

(function($) {
    VMPN.api = {
        get: function(path) {
            return $.ajax({
                url: vmpn_ajax.ajax_url,
                method: 'POST',
                data: { action: 'vmpn_api_get', path: path },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-VMPN-Nonce', vmpn_ajax.nonce);
                }
            }).fail(VMPN.handleAjaxError);
        },

        put: function(path, body) {
            return $.ajax({
                url: vmpn_ajax.ajax_url,
                method: 'POST',
                data: {
                    action: 'vmpn_api_put',
                    path: path,
                    body: JSON.stringify(body || {})
                },
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-VMPN-Nonce', vmpn_ajax.nonce);
                }
            }).fail(VMPN.handleAjaxError);
        }
    };

    VMPN.handleAjaxError = function(xhr) {
        var msg = 'No se pudo conectar con el backend.';
        if (xhr && xhr.responseJSON && xhr.responseJSON.data) {
            msg = xhr.responseJSON.data;
        } else if (xhr && xhr.status) {
            msg += ' (HTTP ' + xhr.status + ')';
        }
        VMPN.notice(msg, 'error');
    };

    VMPN.escHtml = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    VMPN.notice = function(message, type) {
        type = type || 'success';
        var $wrap = $('.vmpn-notices');
        if (!$wrap.length) {
            $wrap = $('<div class="vmpn-notices"></div>').prependTo('.vmpn-card-wrap');
        }
        var $notice = $('<div class="notice notice-' + type + ' is-dismissible"><p>' + message + '</p></div>');
        $wrap.append($notice);
        setTimeout(function() { $notice.fadeOut(function() { $(this).remove(); }); }, 4000);
    };

    VMPN.categoryLabel = function(category) {
        var labels = {
            gratitude: 'Gratitud',
            motivation: 'Motivación',
            announcement: 'Avisos'
        };
        return labels[category] || category;
    };

    VMPN.renderTemplate = function(template) {
        var activeLabel = template.is_active ? 'Activa' : 'Inactiva';
        var activeClass = template.is_active ? 'vmpn-badge-active' : 'vmpn-badge-inactive';

        var html = '';
        html += '<div class="vmpn-template" data-key="' + VMPN.escHtml(template.key) + '">';
        html += '<div class="vmpn-template-head">';
        html += '<div>';
        html += '<span class="vmpn-badge vmpn-badge-' + VMPN.escHtml(template.category) + '">' + VMPN.escHtml(VMPN.categoryLabel(template.category)) + '</span> ';
        html += '<span class="vmpn-badge ' + activeClass + '">' + activeLabel + '</span>';
        html += '<code class="vmpn-key">' + VMPN.escHtml(template.key) + '</code>';
        html += '</div>';
        html += '<button type="button" class="button vmpn-edit" data-key="' + VMPN.escHtml(template.key) + '">Editar</button>';
        html += '</div>';
        html += '<div class="vmpn-preview">';
        html += '<div class="vmpn-preview-title">' + VMPN.escHtml(template.title) + '</div>';
        html += '<div class="vmpn-preview-body">' + VMPN.escHtml(template.body) + '</div>';
        html += '</div>';
        html += '<div class="vmpn-template-meta">';
        if (template.deep_link) {
            html += '<span>Destino: <code>' + VMPN.escHtml(template.deep_link) + '</code></span>';
        }
        html += '<span>Versión ' + parseInt(template.version, 10) + '</span>';
        html += '</div>';
        html += '</div>';
        return html;
    };

    VMPN.openEditor = function(template) {
        var title = VMPN.escHtml(template.title).replace(/"/g, '&quot;');
        var body = VMPN.escHtml(template.body);
        var deepLink = VMPN.escHtml(template.deep_link || '');
        var checked = template.is_active ? ' checked' : '';

        var content = '';
        content += '<div class="vmpn-field">';
        content += '<label for="vmpn-edit-title">Título (máx. 120)</label>';
        content += '<input type="text" id="vmpn-edit-title" maxlength="120" value="' + title + '">';
        content += '<p class="vmpn-help">Visible como encabezado de la notificación.</p>';
        content += '</div>';

        content += '<div class="vmpn-field">';
        content += '<label for="vmpn-edit-body">Mensaje (máx. 300)</label>';
        content += '<textarea id="vmpn-edit-body" maxlength="300" rows="4">' + body + '</textarea>';
        content += '<p class="vmpn-help">Lenguaje amable, sin culpa, sin urgencia ni datos clínicos.</p>';
        content += '</div>';

        content += '<div class="vmpn-field">';
        content += '<label for="vmpn-edit-deeplink">Deep link</label>';
        content += '<input type="text" id="vmpn-edit-deeplink" maxlength="255" value="' + deepLink + '">';
        content += '<p class="vmpn-help">Ej: <code>vittalmind://gratitude</code>. Déjalo vacío si no debe abrir una pantalla.</p>';
        content += '</div>';

        content += '<div class="vmpn-field">';
        content += '<label><input type="checkbox" id="vmpn-edit-active"' + checked + '> Plantilla activa</label>';
        content += '<p class="vmpn-help">Si la desactivas, el motor omite estos envíos.</p>';
        content += '</div>';

        content += '<div class="vmpn-form-actions">';
        content += '<button type="button" class="button vmpn-cancel">Cancelar</button>';
        content += '<button type="button" class="button button-primary vmpn-save" data-key="' + VMPN.escHtml(template.key) + '">Guardar cambios</button>';
        content += '</div>';

        VMPN.renderModal('Editar plantilla', content);
    };

    VMPN.renderModal = function(title, content) {
        var $overlay = $('#vmpn-modal-overlay');
        if (!$overlay.length) {
            $overlay = $('<div id="vmpn-modal-overlay" class="vmpn-modal-overlay"><div class="vmpn-modal"><button class="vmpn-modal-close">&times;</button><div class="vmpn-modal-body"></div></div></div>');
            $('body').append($overlay);
            $overlay.on('click', function(e) {
                if (e.target === this) $(this).removeClass('active');
            });
            $overlay.find('.vmpn-modal-close').on('click', function() {
                $overlay.removeClass('active');
            });
        }
        $overlay.find('.vmpn-modal-body').html('<h2>' + title + '</h2>' + content);
        $overlay.addClass('active');
    };

    VMPN.closeModal = function() {
        $('#vmpn-modal-overlay').removeClass('active');
    };

    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') VMPN.closeModal();
    });
})(jQuery);
