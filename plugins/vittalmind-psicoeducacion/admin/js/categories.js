var VMP = window.VMP || {};

var categoryFormEl = document.getElementById('vmp-category-form');
var categoryFormHtml = categoryFormEl ? categoryFormEl.innerHTML : '';
if (categoryFormEl) categoryFormEl.remove();

(function($) {
VMP.categories = {
    loadList: function() {
        VMP.api.get('/psychoeducation').done(function(r) {
            var $tbody = $('#vmp-categories-list');
            if (r.success && r.data) {
                if (r.data.length === 0) {
                    $tbody.html('<tr><td colspan="8" style="text-align:center;color:#94a3b8">No hay categorías. Crea la primera.</td></tr>');
                    return;
                }
                var html = '';
                r.data.forEach(function(c) {
                    html += '<tr>';
                    html += '<td>' + c.id + '</td>';
                    html += '<td><strong>' + VMP.escHtml(c.titulo) + '</strong></td>';
                    html += '<td class="vmp-icon-cell">' + (c.icono ? VMP.escHtml(c.icono) : '<span class="vmp-icon-empty">—</span>') + '</td>';
                    html += '<td><code>' + VMP.escHtml(c.slug) + '</code></td>';
                    html += '<td>' + VMP.escHtml(c.descripcion || '—') + '</td>';
                    html += '<td>' + (c.temasCount || 0) + '</td>';
                    html += '<td>' + c.orden + '</td>';
                    html += '<td>';
                    html += '<button class="vmp-btn-sm" onclick="VMP.categories.showForm(' + c.id + ')">Editar</button> ';
                    html += '<button class="vmp-btn-sm vmp-btn-danger" onclick="VMP.categories.confirmDelete(' + c.id + ')">Eliminar</button>';
                    html += '</td>';
                    html += '</tr>';
                });
                $tbody.html(html);
            } else {
                $tbody.html('<tr><td colspan="8" style="text-align:center;color:#dc2626">Error: ' + VMP.escHtml(r.data || 'Sin respuesta') + '</td></tr>');
            }
        });
    },

    showForm: function(id) {
        VMP.renderModal('Categoría', categoryFormHtml);
        var $form = $('#vmp-category-form-fields');
        $form.find('[name="id"]').val('');
        $form.find('[name="titulo"]').val('');
        $form.find('[name="slug"]').val('');
        $form.find('[name="descripcion"]').val('');
        $form.find('[name="icono"]').val('');
        $form.find('[name="orden"]').val('0');

        // Se monta después de los resets para que el grid arranque en "Sin
        // icono" y no conserve la selección de la edición anterior.
        var iconPicker = VMP.mountIconPicker($form);

        if (id) {
            VMP.api.get('/psychoeducation').done(function(r) {
                if (r.success && r.data) {
                    var cat = r.data.find(function(c) { return c.id === id; });
                    if (cat) {
                        $form.find('[name="id"]').val(cat.id);
                        $form.find('[name="titulo"]').val(cat.titulo);
                        $form.find('[name="slug"]').val(cat.slug);
                        $form.find('[name="descripcion"]').val(cat.descripcion || '');
                        $form.find('[name="orden"]').val(cat.orden);
                        if (iconPicker) {
                            // set() y no .val() a secas: además de escribir el
                            // valor, marca la opción correspondiente y avisa si el
                            // icono guardado no está en el catálogo.
                            iconPicker.set(cat.icono || '');
                        } else {
                            $form.find('[name="icono"]').val(cat.icono || '');
                        }
                    } else {
                        VMP.notice('Categoría no encontrada', 'error');
                    }
                }
            });
        }

        $('#vmp-category-form-fields').off('submit').on('submit', function(e) {
            e.preventDefault();
            VMP.categories.save();
        });
    },

    save: function() {
        var $form = $('#vmp-category-form-fields');
        var id = $form.find('[name="id"]').val();

        // null y no undefined: "Sin icono" tiene que llegar al repositorio como
        // NULL explícito. Con undefined, JSON.stringify omite la clave y el
        // icono anterior se queda en la base de datos.
        var icono = $form.find('[name="icono"]').val() || null;

        var data = {
            slug: $form.find('[name="slug"]').val(),
            titulo: $form.find('[name="titulo"]').val(),
            descripcion: $form.find('[name="descripcion"]').val() || undefined,
            icono: icono,
            orden: parseInt($form.find('[name="orden"]').val()) || 0
        };

        var promise = id
            ? VMP.api.put('/psychoeducation/admin/categories/' + id, data)
            : VMP.api.post('/psychoeducation/admin/categories', data);

        promise.done(function(r) {
            if (r.success) {
                VMP.closeModal();
                VMP.notice('Categoría ' + (id ? 'actualizada' : 'creada') + ' correctamente.');
                VMP.categories.loadList();
            } else {
                VMP.notice('Error: ' + (r.data || 'No se pudo guardar'), 'error');
            }
        });
    },

    confirmDelete: function(id) {
        VMP.confirm('Eliminar esta categoría? Los temas y bloques asociados también se eliminarán.', function() {
            VMP.api.del('/psychoeducation/admin/categories/' + id).done(function(r) {
                if (r.success) {
                    VMP.notice('Categoría eliminada.');
                    VMP.categories.loadList();
                } else {
                    VMP.notice('Error: ' + (r.data || 'No se pudo eliminar'), 'error');
                }
            });
        });
    }
};

jQuery(function() { VMP.categories.loadList(); });
})(jQuery);
