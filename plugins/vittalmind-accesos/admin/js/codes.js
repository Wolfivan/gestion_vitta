jQuery(function($) {
    var page = 1;
    var codesById = {};
    var plans = [];
    var STEPS = [
        'Abre la app e inicia sesión o crea tu cuenta.',
        'Entra a Perfil y toca Redimir.',
        'Escribe el código o escanea el QR.'
    ];

    function findPlan(codigo) {
        return plans.filter(function(plan) { return plan.codigo === codigo; })[0];
    }

    function accessText(code) {
        if (code.fechaFinAcceso) return 'Acceso hasta el ' + VMA.formatDate(code.fechaFinAcceso);
        if (code.duracionDias) return 'Acceso por ' + code.duracionDias + ' días';
        var plan = findPlan(code.planCodigo);
        if (plan && plan.duracionDiasDefault) return 'Acceso por ' + plan.duracionDiasDefault + ' días';
        return 'Acceso sin vencimiento';
    }

    function redeemWindowText(code) {
        var parts = [];
        if (code.validoDesde) parts.push('desde el ' + VMA.formatDate(code.validoDesde));
        if (code.validoHasta) parts.push('hasta el ' + VMA.formatDate(code.validoHasta));
        return parts.join(' ');
    }

    function usesText(code) {
        return code.usos + (code.maxUsos === null ? '' : ' de ' + code.maxUsos);
    }

    function load() {
        var query = new URLSearchParams({ page: page, limit: 20 });
        var plan = $('#vma-filter-plan').val();
        var activo = $('#vma-filter-activo').val();
        if (plan) query.set('plan', plan);
        if (activo) query.set('activo', activo);

        VMA.api.get('/admin/access/codes?' + query.toString()).done(VMA.handle(function(data) {
            codesById = {};
            var html = '<table class="vma-table"><thead><tr><th>Etiqueta</th><th>Código</th><th>Plan</th><th>Se puede canjear</th><th>El acceso dura</th><th>Canjes</th><th>Estado</th><th></th></tr></thead><tbody>';
            data.items.forEach(function(code) {
                codesById[code.id] = code;
                var id = parseInt(code.id, 10);
                var remove = code.usos === 0
                    ? '<button type="button" class="button vma-delete" data-id="' + id + '">Eliminar</button>'
                    : '';
                var revoke = code.usos > 0 && !code.revocadoAt
                    ? '<button type="button" class="button vma-revoke" data-id="' + id + '">Revocar</button>'
                    : '';
                var toggle = code.revocadoAt
                    ? ''
                    : '<button type="button" class="button vma-toggle" data-id="' + id + '">' + (code.activo ? 'Desactivar' : 'Activar') + '</button>';
                var status = code.revocadoAt
                    ? '<span class="vma-badge vma-badge-hidden">Revocado</span>'
                    : '<span class="vma-badge' + (code.activo ? '' : ' vma-badge-off') + '">' + (code.activo ? 'Activo' : 'Inactivo') + '</span>';
                html += '<tr><td><strong>' + VMA.escHtml(code.etiqueta) + '</strong></td>' +
                    '<td><code>' + VMA.escHtml(code.codigo) + '</code></td>' +
                    '<td>' + VMA.escHtml(code.planNombre) + '</td>' +
                    '<td>' + VMA.escHtml(redeemWindowText(code) || 'Sin límite de fecha') + '</td>' +
                    '<td>' + VMA.escHtml(accessText(code).replace('Acceso ', '')) + '</td>' +
                    '<td>' + VMA.escHtml(usesText(code)) + '</td>' +
                    '<td>' + status + '</td>' +
                    '<td><div class="vma-actions">' +
                    (code.revocadoAt ? '' : '<button type="button" class="button button-primary vma-card-open" data-id="' + id + '">Tarjeta</button>') +
                    '<button type="button" class="button vma-edit" data-id="' + id + '">Editar</button>' +
                    toggle + revoke + remove + '</div></td></tr>';
            });
            html += '</tbody></table>';
            $('#vma-codes').html(data.items.length ? html : '<p class="vma-empty">No hay códigos.</p>');
            VMA.renderPagination($('#vma-pagination'), data.pagination, function(next) {
                page = next;
                load();
            });
        }));
    }

    function field(id, label, input, help) {
        return '<div class="vma-field"><label for="' + id + '">' + label + '</label>' + input +
            (help ? '<p class="vma-help">' + help + '</p>' : '') + '</div>';
    }

    function dateInput(id, iso) {
        return '<input type="date" id="' + id + '" value="' + VMA.escHtml(VMA.toBogotaDate(iso)) + '">';
    }

    function accessMode(code) {
        if (code && code.fechaFinAcceso) return 'fecha';
        if (code && code.duracionDias) return 'dias';
        return 'plan';
    }

    function formHtml(code) {
        var c = code || { maxUsosPorUsuario: 1 };
        var mode = accessMode(code);
        var options = plans.filter(function(plan) {
            return (plan.activo && !plan.esDefault) || (code && plan.codigo === code.planCodigo);
        }).map(function(plan) {
            var selected = code && plan.codigo === code.planCodigo ? ' selected' : '';
            return '<option value="' + VMA.escHtml(plan.codigo) + '"' + selected + '>' + VMA.escHtml(plan.nombre) + '</option>';
        }).join('');
        var modeOption = function(value, label) {
            return '<option value="' + value + '"' + (mode === value ? ' selected' : '') + '>' + label + '</option>';
        };

        var html = field('vma-code-etiqueta', 'Etiqueta interna',
            '<input type="text" id="vma-code-etiqueta" maxlength="120" value="' + VMA.escHtml(c.etiqueta) + '">',
            'Solo se ve en este panel. Usa un nombre neutro: no describas la población.');

        html += field('vma-code-plan', 'Plan que otorga',
            '<select id="vma-code-plan"' + (code ? ' disabled' : '') + '>' + options + '</select>',
            code ? 'No se puede cambiar: el código ya pudo imprimirse.' : '');

        if (!code) {
            html += field('vma-code-codigo', 'Código personalizado (opcional)',
                '<input type="text" id="vma-code-codigo" maxlength="60">',
                'Déjalo vacío para generar uno seguro del tipo VM-XXXX-XXXX.');
        }

        html += '<h3>El código se puede canjear</h3>' +
            field('vma-code-desde', 'Desde', dateInput('vma-code-desde', c.validoDesde), 'Vacío: desde ya.') +
            field('vma-code-hasta', 'Hasta', dateInput('vma-code-hasta', c.validoHasta), 'Incluye todo ese día, hora de Colombia. Vacío: sin fecha límite.') +
            field('vma-code-max', 'Cupo total de canjes',
                '<input type="number" id="vma-code-max" min="1" value="' + VMA.escHtml(c.maxUsos) + '">', 'Vacío: ilimitado.') +
            field('vma-code-por-usuario', 'Canjes por persona',
                '<input type="number" id="vma-code-por-usuario" min="1" value="' + VMA.escHtml(c.maxUsosPorUsuario) + '">');

        html += '<h3>El acceso dura</h3>' +
            field('vma-code-modo', 'Cuánto dura el acceso una vez canjeado',
                '<select id="vma-code-modo">' + modeOption('plan', 'Lo que defina el plan') +
                modeOption('dias', 'Un número de días') + modeOption('fecha', 'Hasta una fecha fija') + '</select>',
                'Si la persona ya tiene el plan, se suma a su vigencia actual.') +
            '<div class="vma-code-dias"' + (mode === 'dias' ? '' : ' hidden') + '>' +
            field('vma-code-dias', 'Días', '<input type="number" id="vma-code-dias" min="1" max="3650" value="' + VMA.escHtml(c.duracionDias || 30) + '">') + '</div>' +
            '<div class="vma-code-fecha"' + (mode === 'fecha' ? '' : ' hidden') + '>' +
            field('vma-code-fecha', 'Fecha final del acceso', dateInput('vma-code-fecha', c.fechaFinAcceso), 'Incluye todo ese día, hora de Colombia.') + '</div>';

        return html + VMA.formActionsHtml(code ? 'Guardar cambios' : 'Crear código');
    }

    function readDate(selector) {
        return $(selector).val() || null;
    }

    function readNumber(selector) {
        var value = $(selector).val();
        return value === '' ? null : parseInt(value, 10);
    }

    function readAccess(code) {
        var mode = $('#vma-code-modo').val();
        var fecha = readDate('#vma-code-fecha');
        var access = { duracionDias: mode === 'dias' ? readNumber('#vma-code-dias') : null };
        if (mode !== 'fecha') {
            access.fechaFinAcceso = null;
        } else if (!code || fecha !== VMA.toBogotaDate(code.fechaFinAcceso)) {
            // Sin cambios no se reenvía: un código ya vencido debe poder editarse.
            access.fechaFinAcceso = fecha;
        }
        return access;
    }

    function readForm(code) {
        var data = $.extend({
            etiqueta: $('#vma-code-etiqueta').val().trim(),
            validoDesde: readDate('#vma-code-desde'),
            validoHasta: readDate('#vma-code-hasta'),
            maxUsos: readNumber('#vma-code-max'),
            maxUsosPorUsuario: readNumber('#vma-code-por-usuario') || 1
        }, readAccess(code));

        if (!code) {
            data.planCodigo = $('#vma-code-plan').val();
            var custom = $('#vma-code-codigo').val().trim();
            if (custom) data.codigo = custom;
        }
        return data;
    }

    function openForm(code) {
        VMA.renderModal(code ? 'Editar código' : 'Nuevo código', formHtml(code));

        $('#vma-code-modo').on('change', function() {
            $('.vma-code-dias').prop('hidden', this.value !== 'dias');
            $('.vma-code-fecha').prop('hidden', this.value !== 'fecha');
        });

        $('.vma-modal .vma-save').on('click', function() {
            var data = readForm(code);
            if ($('#vma-code-modo').val() === 'fecha' && !readDate('#vma-code-fecha')) {
                VMA.notice('Elige la fecha final del acceso.', 'error');
                return;
            }
            var request = code
                ? VMA.api.put('/admin/access/codes/' + parseInt(code.id, 10), data)
                : VMA.api.post('/admin/access/codes', data);

            request.done(VMA.handle(function(result) {
                VMA.closeModal();
                VMA.notice('Código guardado.');
                if (result.advertencia) VMA.notice(result.advertencia, 'warning');
                load();
            }));
        });
    }

    function cardLines(code) {
        var lines = [accessText(code)];
        if (code.validoHasta) lines.push('Canjéalo antes del ' + VMA.formatDate(code.validoHasta));
        return lines;
    }

    // Sin plan ni etiqueta: una tarjeta en la mano no debe revelar una población.
    function cardHtml(qr, code) {
        var steps = STEPS.map(function(step) { return '<li>' + VMA.escHtml(step) + '</li>'; }).join('');
        var lines = cardLines(code).map(function(line) { return '<p>' + VMA.escHtml(line) + '</p>'; }).join('');
        return '<div id="vma-print-card" class="vma-bono">' +
            '<h3>Bono de acceso · Vitta Mind</h3>' +
            '<img src="data:image/png;base64,' + VMA.escHtml(qr.png) + '" alt="Código QR del bono" width="240" height="240">' +
            '<p class="vma-bono-code">' + VMA.escHtml(qr.codigo) + '</p>' + lines +
            '<ol>' + steps + '</ol></div>' +
            '<div class="vma-form-actions vma-no-print">' +
            '<button type="button" class="button vma-cancel">Cerrar</button>' +
            '<button type="button" class="button" id="vma-card-png">Descargar PNG</button>' +
            '<button type="button" class="button button-primary" id="vma-card-print">Imprimir o guardar como PDF</button>' +
            '</div>';
    }

    function wrapText(ctx, text, maxWidth) {
        var lines = [];
        var line = '';
        text.split(' ').forEach(function(word) {
            var next = line ? line + ' ' + word : word;
            if (ctx.measureText(next).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = next;
            }
        });
        lines.push(line);
        return lines;
    }

    function downloadPng(qr, code) {
        var WIDTH = 800;
        var HEIGHT = 980;
        var canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        var ctx = canvas.getContext('2d');
        var image = new Image();

        image.onload = function() {
            var y = 70;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#1e293b';
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('Bono de acceso · Vitta Mind', WIDTH / 2, y);
            ctx.drawImage(image, (WIDTH - 480) / 2, y + 30, 480, 480);
            y += 570;
            ctx.font = 'bold 44px monospace';
            ctx.fillText(qr.codigo, WIDTH / 2, y);
            y += 20;
            ctx.font = '28px sans-serif';
            cardLines(code).forEach(function(line) {
                y += 44;
                ctx.fillText(line, WIDTH / 2, y);
            });
            y += 40;
            ctx.textAlign = 'left';
            STEPS.forEach(function(step, index) {
                wrapText(ctx, (index + 1) + '. ' + step, WIDTH - 120).forEach(function(line) {
                    y += 42;
                    ctx.fillText(line, 60, y);
                });
            });

            var link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'bono-acceso.png';
            document.body.appendChild(link);
            link.click();
            link.remove();
        };
        image.src = 'data:image/png;base64,' + qr.png;
    }

    function openCard(code) {
        VMA.api.get('/admin/access/codes/' + parseInt(code.id, 10) + '/qr').done(VMA.handle(function(qr) {
            VMA.renderModal('Tarjeta del código', cardHtml(qr, code));
            $('#vma-card-print').on('click', function() { window.print(); });
            $('#vma-card-png').on('click', function() { downloadPng(qr, code); });
        }));
    }

    function openRevoke(code) {
        var id = parseInt(code.id, 10);
        VMA.api.get('/admin/access/codes/' + id + '/revoke-preview').done(VMA.handle(function(preview) {
            var count = parseInt(preview.personas, 10);
            VMA.renderModal('Revocar ' + code.codigo,
                '<p class="vma-warning">Se quitará el acceso a ' + count + (count === 1 ? ' persona' : ' personas') +
                '. No se puede deshacer y el código queda inutilizado.</p>' +
                '<p>Sus datos no se borran. Quien tenga el plan por otra vía lo conserva.</p>' +
                field('vma-revoke-motivo', 'Motivo (opcional, sin datos personales)',
                    '<input type="text" id="vma-revoke-motivo" maxlength="200">') +
                VMA.formActionsHtml('Revocar código'));

            $('.vma-modal .vma-save').on('click', function() {
                VMA.api.post('/admin/access/codes/' + id + '/revoke', {
                    motivo: $('#vma-revoke-motivo').val().trim() || null
                }).done(VMA.handle(function() {
                    VMA.closeModal();
                    VMA.notice('Código revocado.');
                    load();
                }));
            });
        }));
    }

    function codeOf(button) {
        return codesById[$(button).data('id')];
    }

    $('#vma-new-code').on('click', function() { openForm(null); });
    $('#vma-filter-plan, #vma-filter-activo').on('change', function() {
        page = 1;
        load();
    });
    $('#vma-codes').on('click', '.vma-edit', function() { openForm(codeOf(this)); });
    $('#vma-codes').on('click', '.vma-card-open', function() { openCard(codeOf(this)); });
    $('#vma-codes').on('click', '.vma-revoke', function() { openRevoke(codeOf(this)); });
    $('#vma-codes').on('click', '.vma-toggle', function() {
        var code = codeOf(this);
        VMA.api.put('/admin/access/codes/' + parseInt(code.id, 10), { activo: !code.activo })
            .done(VMA.handle(function() {
                VMA.notice(code.activo ? 'Código desactivado. Quien ya canjeó conserva su acceso.' : 'Código activado.');
                load();
            }));
    });
    $('#vma-codes').on('click', '.vma-delete', function() {
        var code = codeOf(this);
        if (!window.confirm('¿Eliminar el código ' + code.codigo + '? No se puede deshacer.')) return;
        VMA.api.del('/admin/access/codes/' + parseInt(code.id, 10)).done(VMA.handle(function() {
            VMA.notice('Código eliminado.');
            load();
        }));
    });

    VMA.api.get('/admin/access/plans').done(VMA.handle(function(data) {
        plans = data.plans;
        plans.forEach(function(plan) {
            $('#vma-filter-plan').append($('<option></option>').val(plan.codigo).text(plan.nombre));
        });
        load();
    }));
});
