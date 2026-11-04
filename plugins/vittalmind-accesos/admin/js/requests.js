jQuery(function($) {
    var page = 1;
    var requestsById = {};
    var ESTADOS_ABIERTOS = ['pendiente', 'contactado'];

    function contactHtml(request) {
        if (request.identidadOculta) {
            return VMA.identityHtml(request);
        }
        var email = VMA.escHtml(request.emailContacto);
        return '<a href="mailto:' + VMA.escHtml(encodeURIComponent(request.emailContacto)) + '">' + email + '</a>';
    }

    function actionsHtml(request) {
        if (ESTADOS_ABIERTOS.indexOf(request.estado) === -1) return '';
        var id = parseInt(request.id, 10);
        var contacted = request.estado === 'pendiente'
            ? '<button type="button" class="button vma-state" data-id="' + id + '" data-estado="contactado">Contactado</button>'
            : '';
        return '<div class="vma-actions">' + contacted +
            '<button type="button" class="button button-primary vma-approve" data-id="' + id + '">Aprobar</button>' +
            '<button type="button" class="button vma-state" data-id="' + id + '" data-estado="rechazada">Rechazar</button>' +
            '</div>';
    }

    function load() {
        var query = new URLSearchParams({ page: page, limit: 20 });
        var estado = $('#vma-filter-estado').val();
        if (estado) query.set('estado', estado);

        VMA.api.get('/admin/access/requests?' + query.toString()).done(VMA.handle(function(data) {
            requestsById = {};
            var html = '<table class="vma-table"><thead><tr><th>Contacto</th><th>Plan</th><th>Mensaje</th><th>Notas</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>';
            data.items.forEach(function(request) {
                requestsById[request.id] = request;
                html += '<tr><td>' + contactHtml(request) + '</td>' +
                    '<td>' + VMA.escHtml(request.planNombre || request.planSolicitado) + '</td>' +
                    '<td>' + VMA.escHtml(request.mensaje) + '</td>' +
                    '<td>' + VMA.escHtml(request.notasAdmin) + '</td>' +
                    '<td><span class="vma-badge">' + VMA.escHtml(request.estado) + '</span></td>' +
                    '<td>' + VMA.escHtml(VMA.formatDate(request.createdAt)) + '</td>' +
                    '<td>' + actionsHtml(request) + '</td></tr>';
            });
            html += '</tbody></table>';
            $('#vma-requests').html(data.items.length ? html : '<p class="vma-empty">No hay solicitudes.</p>');
            VMA.renderPagination($('#vma-pagination'), data.pagination, function(next) {
                page = next;
                load();
            });
        }));
    }

    function update(id, body, message) {
        VMA.api.put('/admin/access/requests/' + parseInt(id, 10), body).done(VMA.handle(function() {
            VMA.closeModal();
            VMA.notice(message);
            load();
        }));
    }

    function notesFieldHtml(request) {
        return '<div class="vma-field"><label for="vma-notas">Notas internas</label>' +
            '<textarea id="vma-notas" rows="3" maxlength="2000">' + VMA.escHtml(request.notasAdmin) + '</textarea></div>';
    }

    function readNotes() {
        return $('#vma-notas').val().trim() || null;
    }

    function openState(request, estado) {
        var title = estado === 'contactado' ? 'Marcar como contactado' : 'Rechazar solicitud';
        VMA.renderModal(title, notesFieldHtml(request) + VMA.formActionsHtml('Confirmar'));
        $('.vma-modal .vma-save').on('click', function() {
            update(request.id, { estado: estado, notasAdmin: readNotes() }, 'Solicitud actualizada.');
        });
    }

    function openApprove(request) {
        VMA.renderModal('Aprobar plan ' + (request.planNombre || request.planSolicitado),
            '<p>El plan se agrega a los que la persona ya tenga.</p>' +
            VMA.expiryFieldsHtml() + notesFieldHtml(request) + VMA.formActionsHtml('Aprobar'));
        VMA.bindExpiryFields();

        $('.vma-modal .vma-save').on('click', function() {
            var expiry = VMA.readExpiry();
            if (!expiry) {
                VMA.notice('Elige una fecha.', 'error');
                return;
            }
            update(request.id, $.extend({ estado: 'aprobada', notasAdmin: readNotes() }, expiry), 'Solicitud aprobada.');
        });
    }

    $('#vma-filter-estado').on('change', function() {
        page = 1;
        load();
    });
    $('#vma-requests').on('click', '.vma-state', function() {
        openState(requestsById[$(this).data('id')], $(this).data('estado'));
    });
    $('#vma-requests').on('click', '.vma-approve', function() {
        openApprove(requestsById[$(this).data('id')]);
    });

    load();
});
