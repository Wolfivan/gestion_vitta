jQuery(function($) {
    var page = 1;
    var usersById = {};
    var plans = [];

    function planBadge(user, plan) {
        var label = plan.nombre;
        if (plan.expiraAt) {
            label += (plan.vigente ? ' · vence ' : ' · venció ') + VMA.formatDate(plan.expiraAt);
        }
        return '<span class="vma-badge' + (plan.vigente ? '' : ' vma-badge-off') + '">' + VMA.escHtml(label) +
            ' <button type="button" class="vma-link-danger vma-revoke" title="Quitar plan"' +
            ' data-id="' + VMA.escHtml(user.idAnonimo) + '" data-plan="' + VMA.escHtml(plan.codigo) + '"' +
            ' data-nombre="' + VMA.escHtml(plan.nombre) + '">&times;</button></span>';
    }

    function load() {
        var query = new URLSearchParams({ page: page, limit: 20 });
        var search = $('#vma-search').val().trim();
        var plan = $('#vma-filter-plan').val();
        var vencimiento = $('#vma-filter-vencimiento').val();
        if (search) query.set('search', search);
        if (plan) query.set('plan', plan);
        if (vencimiento) query.set('vencimiento', vencimiento);

        VMA.api.get('/admin/access/users?' + query.toString()).done(VMA.handle(function(data) {
            usersById = {};
            var html = '<table class="vma-table"><thead><tr><th>Usuario</th><th>Planes</th><th></th></tr></thead><tbody>';
            data.items.forEach(function(user) {
                usersById[user.idAnonimo] = user;
                var badges = user.planes.map(function(plan) { return planBadge(user, plan); }).join('');
                html += '<tr><td>' + VMA.identityHtml(user, user.nombre, user.email) + '</td>' +
                    '<td>' + (badges || '<span class="vma-badge vma-badge-off">Solo plan default</span>') + '</td>' +
                    '<td><button type="button" class="button vma-grant" data-id="' + VMA.escHtml(user.idAnonimo) + '">Asignar plan</button></td></tr>';
            });
            html += '</tbody></table>';
            $('#vma-users').html(data.items.length ? html : '<p class="vma-empty">No hay usuarios con esos filtros.</p>');
            VMA.renderPagination($('#vma-pagination'), data.pagination, function(next) {
                page = next;
                load();
            });
        }));
    }

    function openGrant(user) {
        var options = plans.filter(function(plan) { return plan.activo && !plan.esDefault; })
            .map(function(plan) {
                return '<option value="' + VMA.escHtml(plan.codigo) + '">' + VMA.escHtml(plan.nombre) + '</option>';
            }).join('');
        var who = user.identidadOculta ? VMA.shortId(user.idAnonimo) : user.email;

        VMA.renderModal('Asignar plan a ' + who,
            '<div class="vma-field"><label for="vma-grant-plan">Plan</label>' +
            '<select id="vma-grant-plan">' + options + '</select></div>' +
            VMA.expiryFieldsHtml() + VMA.formActionsHtml('Asignar'));
        VMA.bindExpiryFields();

        $('.vma-modal .vma-save').on('click', function() {
            var expiry = VMA.readExpiry();
            if (!expiry) {
                VMA.notice('Elige una fecha.', 'error');
                return;
            }
            VMA.api.post('/admin/access/users/' + user.idAnonimo + '/plans',
                $.extend({ planCodigo: $('#vma-grant-plan').val() }, expiry)
            ).done(VMA.handle(function() {
                VMA.closeModal();
                VMA.notice('Plan asignado.');
                load();
            }));
        });
    }

    function openRevoke(idAnonimo, planCodigo, nombre) {
        VMA.renderModal('Quitar plan ' + nombre,
            '<p>La persona pierde este plan al siguiente refresco de la app. Sus datos no se borran.</p>' +
            '<div class="vma-field"><label for="vma-revoke-motivo">Motivo (opcional, sin datos personales)</label>' +
            '<input type="text" id="vma-revoke-motivo" maxlength="200"></div>' +
            VMA.formActionsHtml('Quitar plan'));

        $('.vma-modal .vma-save').on('click', function() {
            VMA.api.del('/admin/access/users/' + idAnonimo + '/plans/' + encodeURIComponent(planCodigo),
                { motivo: $('#vma-revoke-motivo').val().trim() || null }
            ).done(VMA.handle(function() {
                VMA.closeModal();
                VMA.notice('Plan quitado.');
                load();
            }));
        });
    }

    $('#vma-apply').on('click', function() {
        page = 1;
        load();
    });
    $('#vma-search').on('keydown', function(e) {
        if (e.key === 'Enter') $('#vma-apply').trigger('click');
    });
    $('#vma-users').on('click', '.vma-grant', function() {
        openGrant(usersById[$(this).data('id')]);
    });
    $('#vma-users').on('click', '.vma-revoke', function() {
        openRevoke($(this).data('id'), $(this).data('plan'), $(this).data('nombre'));
    });

    VMA.api.get('/admin/access/plans').done(VMA.handle(function(data) {
        plans = data.plans;
        plans.forEach(function(plan) {
            $('#vma-filter-plan').append($('<option></option>').val(plan.codigo).text(plan.nombre));
        });
    }));
    load();
});
