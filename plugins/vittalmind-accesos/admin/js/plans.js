jQuery(function($) {
    var plans = [];
    var features = [];

    function affectedText(plan) {
        var count = parseInt(plan.usuariosCount, 10);
        return 'Esto afecta a ' + count + (count === 1 ? ' persona' : ' personas');
    }

    function findPlan(codigo) {
        return plans.filter(function(plan) { return plan.codigo === codigo; })[0];
    }

    function cellsFor(codigo) {
        return $('.vma-cell').filter(function() { return String($(this).data('plan')) === codigo; });
    }

    function selectedFor(codigo) {
        return cellsFor(codigo).filter(':checked').map(function() {
            return String($(this).data('feature'));
        }).get();
    }

    // Una columna con casillas distintas a lo guardado: si no se pulsa su Guardar, se pierde.
    function isDirty(plan) {
        var selected = selectedFor(plan.codigo);
        return selected.length !== plan.features.length ||
            selected.some(function(key) { return plan.features.indexOf(key) === -1; });
    }

    function dirtyPlans() {
        return plans.filter(isDirty);
    }

    function refreshDirty() {
        var dirty = dirtyPlans();
        $('.vma-save-column').each(function() {
            var changed = dirty.indexOf(findPlan(String($(this).data('codigo')))) !== -1;
            $(this).toggleClass('button-primary', changed).text(changed ? 'Guardar *' : 'Guardar');
        });
        var names = dirty.map(function(plan) { return plan.nombre; }).join(', ');
        $('#vma-matrix-dirty')
            .text(dirty.length ? 'Cambios sin guardar en: ' + names + '. Pulsa Guardar en cada columna marcada.' : '')
            .toggle(dirty.length > 0);
    }

    // Casillas sin guardar de cada columna, para no perderlas al recargar la matriz.
    function pendingSelections() {
        var pending = {};
        dirtyPlans().forEach(function(plan) { pending[plan.codigo] = selectedFor(plan.codigo); });
        return pending;
    }

    function applySelections(pending) {
        Object.keys(pending).forEach(function(codigo) {
            cellsFor(codigo).each(function() {
                $(this).prop('checked', pending[codigo].indexOf(String($(this).data('feature'))) !== -1);
            });
        });
    }

    function renderPlans() {
        var html = '<table class="vma-table"><thead><tr><th>Plan</th><th>Código</th><th>Opciones</th><th>Personas</th><th>Features</th><th></th></tr></thead><tbody>';
        plans.forEach(function(plan) {
            var badges = '';
            if (plan.esDefault) badges += '<span class="vma-badge">Default</span>';
            if (!plan.activo) badges += '<span class="vma-badge vma-badge-off">Inactivo</span>';
            if (plan.esSolicitable) badges += '<span class="vma-badge">Solicitable</span>';
            if (plan.ocultaIdentidad) badges += '<span class="vma-badge vma-badge-hidden">Identidad oculta</span>';
            var remove = plan.esDefault
                ? ''
                : '<button type="button" class="button vma-delete" data-codigo="' + VMA.escHtml(plan.codigo) + '"' +
                  (plan.usuariosCount > 0 ? ' disabled title="Tiene personas asignadas"' : '') + '>Eliminar</button>';
            html += '<tr><td><strong>' + VMA.escHtml(plan.nombre) + '</strong></td>' +
                '<td><code>' + VMA.escHtml(plan.codigo) + '</code></td>' +
                '<td>' + badges + '</td>' +
                '<td>' + parseInt(plan.usuariosCount, 10) + '</td>' +
                '<td>' + plan.features.length + '</td>' +
                '<td><div class="vma-actions"><button type="button" class="button vma-edit" data-codigo="' + VMA.escHtml(plan.codigo) + '">Editar</button>' + remove + '</div></td></tr>';
        });
        $('#vma-plans').html(html + '</tbody></table>');
    }

    function renderMatrix() {
        // Columna de features y cabecera fijas: con muchos planes la tabla se desplaza
        // y sin ellas se marcaria una casilla sin ver a que feature o plan pertenece.
        var html = '<div class="vma-matrix-scroll"><table class="vma-table vma-matrix"><thead><tr><th>Feature</th>';
        plans.forEach(function(plan) {
            html += '<th class="vma-center">' + VMA.escHtml(plan.nombre) + '</th>';
        });
        html += '</tr></thead><tbody>';

        features.forEach(function(feature) {
            html += '<tr><td>' + VMA.escHtml(feature.nombre) + '<br><code>' + VMA.escHtml(feature.featureKey) + '</code></td>';
            plans.forEach(function(plan) {
                var checked = plan.features.indexOf(feature.featureKey) !== -1 ? ' checked' : '';
                html += '<td class="vma-center"><input type="checkbox" class="vma-cell"' + checked +
                    ' data-plan="' + VMA.escHtml(plan.codigo) + '" data-feature="' + VMA.escHtml(feature.featureKey) + '"' +
                    ' aria-label="' + VMA.escHtml(plan.nombre + ': ' + feature.nombre) + '"></td>';
            });
            html += '</tr>';
        });

        html += '<tr class="vma-matrix-actions"><td></td>';
        plans.forEach(function(plan) {
            html += '<td class="vma-center"><button type="button" class="button vma-save-column" data-codigo="' + VMA.escHtml(plan.codigo) + '">Guardar</button></td>';
        });
        $('#vma-matrix').html(html + '</tr></tbody></table></div>');
    }

    function load() {
        $.when(VMA.api.get('/admin/access/plans'), VMA.api.get('/admin/access/features')).done(function(p, f) {
            VMA.handle(function(data) {
                var pending = pendingSelections();
                plans = data.plans;
                VMA.handle(function(featureData) {
                    features = featureData.features;
                    renderPlans();
                    renderMatrix();
                    applySelections(pending);
                    refreshDirty();
                })(f[0]);
            })(p[0]);
        });
    }

    function saveColumn(codigo) {
        var plan = findPlan(codigo);
        var selected = selectedFor(codigo);

        var quitadas = plan.features.filter(function(key) { return selected.indexOf(key) === -1; });
        var message = affectedText(plan);
        if (plan.esDefault) message += ' y a todos los invitados';
        message += '.';
        if (quitadas.length > 0) {
            message += ' Se quita del plan: ' + quitadas.join(', ') + '. Los datos de las personas no se borran.';
        }
        if (!window.confirm(message + ' ¿Continuar?')) return;

        VMA.api.put('/admin/access/plans/' + encodeURIComponent(codigo) + '/features', { features: selected })
            .done(VMA.handle(function() {
                VMA.notice('Matriz guardada.');
                load();
            }));
    }

    function planFormHtml(plan) {
        var isNew = !plan;
        plan = plan || { activo: true, beneficios: [] };
        var check = function(id, value, disabled, label) {
            return '<p><label><input type="checkbox" id="' + id + '"' + (value ? ' checked' : '') + (disabled ? ' disabled' : '') + '> ' + label + '</label></p>';
        };
        var html = '';
        if (isNew) {
            html += '<div class="vma-field"><label for="vma-plan-codigo">Código</label>' +
                '<input type="text" id="vma-plan-codigo" maxlength="40">' +
                '<p class="vma-help">Minúsculas, números, guion o guion bajo. No se puede cambiar después.</p></div>';
        }
        html += '<div class="vma-field"><label for="vma-plan-nombre">Nombre</label>' +
            '<input type="text" id="vma-plan-nombre" maxlength="120" value="' + VMA.escHtml(plan.nombre) + '">' +
            '<p class="vma-warning">El nombre se muestra en la app y debe ser neutro: no describas la población ni una condición.</p></div>' +
            '<div class="vma-field"><label for="vma-plan-descripcion">Descripción</label>' +
            '<textarea id="vma-plan-descripcion" rows="2" maxlength="2000">' + VMA.escHtml(plan.descripcion) + '</textarea></div>' +
            '<div class="vma-field"><label for="vma-plan-duracion">Duración por defecto (días)</label>' +
            '<input type="number" id="vma-plan-duracion" min="1" max="3650" value="' + VMA.escHtml(plan.duracionDiasDefault) + '"' + (plan.esDefault ? ' disabled' : '') + '>' +
            '<p class="vma-help">Vacío: sin vencimiento.</p></div>' +
            '<div class="vma-field"><label for="vma-plan-orden">Orden</label>' +
            '<input type="number" id="vma-plan-orden" min="0" value="' + VMA.escHtml(plan.orden || 0) + '"></div>' +
            '<div class="vma-field"><label for="vma-plan-cta">Texto del botón en la app</label>' +
            '<input type="text" id="vma-plan-cta" maxlength="60" value="' + VMA.escHtml(plan.ctaTexto) + '"></div>' +
            '<div class="vma-field"><label for="vma-plan-beneficios">Beneficios (uno por línea)</label>' +
            '<textarea id="vma-plan-beneficios" rows="3">' + VMA.escHtml((plan.beneficios || []).join('\n')) + '</textarea></div>' +
            check('vma-plan-activo', plan.activo, plan.esDefault, 'Activo') +
            check('vma-plan-solicitable', plan.esSolicitable, plan.esDefault || plan.ocultaIdentidad, 'Solicitable desde la app') +
            check('vma-plan-oculta', plan.ocultaIdentidad, plan.esDefault, 'Ocultar identidad') +
            '<p class="vma-help">Ocultar identidad enmascara nombre y correo de quien tenga el plan, lo saca de los listados públicos y cancela sus solicitudes abiertas. Solo se levanta si se quita el plan a la persona.</p>';
        return html + VMA.formActionsHtml(isNew ? 'Crear plan' : 'Guardar cambios');
    }

    function readPlanForm(plan) {
        var duracion = $('#vma-plan-duracion').val();
        var data = {
            nombre: $('#vma-plan-nombre').val().trim(),
            descripcion: $('#vma-plan-descripcion').val().trim() || null,
            orden: parseInt($('#vma-plan-orden').val(), 10) || 0,
            ctaTexto: $('#vma-plan-cta').val().trim() || null,
            beneficios: $('#vma-plan-beneficios').val().split('\n').map(function(line) {
                return line.trim();
            }).filter(Boolean)
        };
        if (!plan || !plan.esDefault) {
            data.activo = $('#vma-plan-activo').prop('checked');
            data.esSolicitable = $('#vma-plan-solicitable').prop('checked');
            data.ocultaIdentidad = $('#vma-plan-oculta').prop('checked');
            data.duracionDiasDefault = duracion ? parseInt(duracion, 10) : null;
        }
        return data;
    }

    function openPlan(plan) {
        VMA.renderModal(plan ? 'Editar plan' : 'Nuevo plan', planFormHtml(plan));

        $('#vma-plan-oculta').on('change', function() {
            if (this.checked) $('#vma-plan-solicitable').prop('checked', false);
            $('#vma-plan-solicitable').prop('disabled', this.checked);
        });

        $('.vma-modal .vma-save').on('click', function() {
            var data = readPlanForm(plan);
            var request;
            if (plan) {
                if (data.ocultaIdentidad && !plan.ocultaIdentidad &&
                    !window.confirm(affectedText(plan) + ': se enmascara su identidad y se cancelan las solicitudes abiertas de este plan. ¿Continuar?')) {
                    return;
                }
                request = VMA.api.put('/admin/access/plans/' + encodeURIComponent(plan.codigo), data);
            } else {
                data.codigo = $('#vma-plan-codigo').val().trim();
                request = VMA.api.post('/admin/access/plans', data);
            }
            request.done(VMA.handle(function() {
                VMA.closeModal();
                VMA.notice('Plan guardado.');
                load();
            }));
        });
    }

    $('#vma-new-plan').on('click', function() { openPlan(null); });
    $('#vma-plans').on('click', '.vma-edit', function() {
        openPlan(findPlan(String($(this).data('codigo'))));
    });
    $('#vma-plans').on('click', '.vma-delete', function() {
        var codigo = String($(this).data('codigo'));
        if (!window.confirm('¿Eliminar el plan ' + codigo + '?')) return;
        VMA.api.del('/admin/access/plans/' + encodeURIComponent(codigo)).done(VMA.handle(function() {
            VMA.notice('Plan eliminado.');
            load();
        }));
    });
    $('#vma-matrix').on('click', '.vma-save-column', function() {
        saveColumn(String($(this).data('codigo')));
    });
    $('#vma-matrix').on('change', '.vma-cell', refreshDirty);
    $(window).on('beforeunload', function(event) {
        if (dirtyPlans().length === 0) return undefined;
        event.preventDefault();
        return '';
    });

    load();
});
