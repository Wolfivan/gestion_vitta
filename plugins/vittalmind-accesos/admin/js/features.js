jQuery(function($) {
    var features = [];
    var TIPOS = { contenido: 'Contenido', modulo: 'Módulo', herramienta: 'Herramienta' };

    function findFeature(key) {
        return features.filter(function(feature) { return feature.featureKey === key; })[0];
    }

    function load() {
        VMA.api.get('/admin/access/features').done(VMA.handle(function(data) {
            features = data.features;
            var html = '<table class="vma-table"><thead><tr><th>Nombre</th><th>Clave</th><th>Tipo</th><th>Estado</th><th></th></tr></thead><tbody>';
            features.forEach(function(feature) {
                var key = VMA.escHtml(feature.featureKey);
                html += '<tr><td><strong>' + VMA.escHtml(feature.nombre) + '</strong><br>' +
                    '<span class="vma-help">' + VMA.escHtml(feature.descripcion) + '</span></td>' +
                    '<td><code>' + key + '</code></td>' +
                    '<td>' + VMA.escHtml(TIPOS[feature.tipo] || feature.tipo) + '</td>' +
                    '<td><span class="vma-badge' + (feature.activo ? '' : ' vma-badge-off') + '">' + (feature.activo ? 'Activa' : 'Inactiva') + '</span></td>' +
                    '<td><div class="vma-actions"><button type="button" class="button vma-edit" data-key="' + key + '">Editar</button>' +
                    '<button type="button" class="button vma-delete" data-key="' + key + '">Eliminar</button></div></td></tr>';
            });
            $('#vma-features').html(html + '</tbody></table>');
        }));
    }

    function openFeature(feature) {
        var options = Object.keys(TIPOS).map(function(tipo) {
            var selected = feature && feature.tipo === tipo ? ' selected' : '';
            return '<option value="' + tipo + '"' + selected + '>' + TIPOS[tipo] + '</option>';
        }).join('');

        var html = '';
        if (!feature) {
            html += '<div class="vma-field"><label for="vma-feature-key">Clave</label>' +
                '<input type="text" id="vma-feature-key" maxlength="80" placeholder="content.nombre">' +
                '<p class="vma-help">Minúsculas, números, punto, guion o guion bajo.</p></div>';
        }
        html += '<div class="vma-field"><label for="vma-feature-nombre">Nombre</label>' +
            '<input type="text" id="vma-feature-nombre" maxlength="120" value="' + VMA.escHtml(feature && feature.nombre) + '"></div>' +
            '<div class="vma-field"><label for="vma-feature-descripcion">Descripción</label>' +
            '<textarea id="vma-feature-descripcion" rows="2" maxlength="2000">' + VMA.escHtml(feature && feature.descripcion) + '</textarea></div>' +
            '<div class="vma-field"><label for="vma-feature-tipo">Tipo</label>' +
            '<select id="vma-feature-tipo">' + options + '</select></div>' +
            '<p><label><input type="checkbox" id="vma-feature-activo"' + (!feature || feature.activo ? ' checked' : '') + '> Activa</label></p>' +
            VMA.formActionsHtml(feature ? 'Guardar cambios' : 'Crear feature');

        VMA.renderModal(feature ? 'Editar feature' : 'Nueva feature', html);

        $('.vma-modal .vma-save').on('click', function() {
            var data = {
                nombre: $('#vma-feature-nombre').val().trim(),
                descripcion: $('#vma-feature-descripcion').val().trim() || null,
                tipo: $('#vma-feature-tipo').val(),
                activo: $('#vma-feature-activo').prop('checked')
            };
            var request;
            if (feature) {
                request = VMA.api.put('/admin/access/features/' + encodeURIComponent(feature.featureKey), data);
            } else {
                data.featureKey = $('#vma-feature-key').val().trim();
                request = VMA.api.post('/admin/access/features', data);
            }
            request.done(VMA.handle(function() {
                VMA.closeModal();
                VMA.notice('Feature guardada.');
                load();
            }));
        });
    }

    $('#vma-new-feature').on('click', function() { openFeature(null); });
    $('#vma-features').on('click', '.vma-edit', function() {
        openFeature(findFeature(String($(this).data('key'))));
    });
    $('#vma-features').on('click', '.vma-delete', function() {
        var key = String($(this).data('key'));
        if (!window.confirm('¿Eliminar la feature ' + key + '?')) return;
        VMA.api.del('/admin/access/features/' + encodeURIComponent(key)).done(VMA.handle(function() {
            VMA.notice('Feature eliminada.');
            load();
        }));
    });

    load();
});
