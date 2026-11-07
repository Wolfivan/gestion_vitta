var VMP = window.VMP || {};

var categoryFormEl = document.getElementById('vmp-category-form');
var categoryFormHtml = categoryFormEl ? categoryFormEl.innerHTML : '';
if (categoryFormEl) categoryFormEl.remove();

(function($) {
VMP.categories = {
    features: [],
    // Herramientas disponibles, las marcadas en su orden y los temas de la categoría
    // abierta en el formulario (para avisar si al abrirla no se vería nada).
    tools: [],
    selectedTools: [],
    temasCount: 0,

    toolName: function(key) {
        var tool = this.tools.find(function(t) { return t.featureKey === key; });
        return tool ? tool.nombre : key;
    },

    renderTools: function() {
        var self = this;
        var $list = $('#vmp-category-tools');
        if (!$list.length) return;
        var unselected = self.tools.filter(function(t) { return self.selectedTools.indexOf(t.featureKey) === -1; });
        if (self.selectedTools.length === 0 && unselected.length === 0) {
            $list.html('<span class="vmp-help">No hay features de tipo Herramienta en VM Accesos.</span>');
        } else {
            var html = '';
            self.selectedTools.forEach(function(key, i) {
                html += '<div class="vmp-tool-row">';
                html += '<label><input type="checkbox" class="vmp-tool-check" checked value="' + VMP.escHtml(key) + '"> ' + VMP.escHtml(self.toolName(key)) + '</label> ';
                html += '<button type="button" class="vmp-btn-sm vmp-tool-move" data-dir="-1" data-index="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Subir">↑</button> ';
                html += '<button type="button" class="vmp-btn-sm vmp-tool-move" data-dir="1" data-index="' + i + '"' + (i === self.selectedTools.length - 1 ? ' disabled' : '') + ' aria-label="Bajar">↓</button>';
                html += '</div>';
            });
            unselected.forEach(function(t) {
                html += '<div class="vmp-tool-row"><label><input type="checkbox" class="vmp-tool-check" value="' + VMP.escHtml(t.featureKey) + '"> ' + VMP.escHtml(t.nombre) + '</label></div>';
            });
            $list.html(html);
        }
        $('.vmp-tool-warning').toggle(self.temasCount === 0 && self.selectedTools.length === 0);
    },

    bindTools: function() {
        var self = this;
        $('#vmp-category-tools')
            .on('change', '.vmp-tool-check', function() {
                var key = this.value;
                if (this.checked) {
                    if (self.selectedTools.indexOf(key) === -1) self.selectedTools.push(key);
                } else {
                    self.selectedTools = self.selectedTools.filter(function(k) { return k !== key; });
                }
                self.renderTools();
            })
            .on('click', '.vmp-tool-move', function() {
                var i = parseInt($(this).data('index'), 10);
                var j = i + parseInt($(this).data('dir'), 10);
                if (j < 0 || j >= self.selectedTools.length) return;
                var moved = self.selectedTools[i];
                self.selectedTools[i] = self.selectedTools[j];
                self.selectedTools[j] = moved;
                self.renderTools();
            });
    },

    loadFeatures: function(callback) {
        var self = this;
        VMP.loadContentFeatures(function(list) {
            self.features = list;
            if (callback) callback();
        });
    },

    populateFeatureSelector: function($form, selected) {
        var $selector = $form.find('[name="accesoFeatureKey"]');
        $selector.find('option:not(:first)').remove();
        this.features.forEach(function(f) {
            $selector.append($('<option></option>').val(f.featureKey).text(f.nombre));
        });
        // Una feature desactivada sigue guardada en la categoría: se conserva visible.
        if (selected && !$selector.find('option').filter(function() { return this.value === selected; }).length) {
            $selector.append($('<option></option>').val(selected).text(selected));
        }
        $selector.val(selected || '');
    },

    loadList: function() {
        VMP.api.get('/psychoeducation/admin/categories').done(function(r) {
            var $tbody = $('#vmp-categories-list');
            if (r.success && r.data) {
                if (r.data.length === 0) {
                    $tbody.html('<tr><td colspan="11" style="text-align:center;color:#94a3b8">No hay categorías. Crea la primera.</td></tr>');
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
                    html += '<td>' + (c.accesoFeatureKey ? VMP.escHtml(c.accesoFeatureKey) : '<span style="color:#10b981">Free</span>') + '</td>';
                    html += '<td>' + (c.temasCount || 0) + '</td>';
                    html += '<td>' + (c.enHome ? 'Sí' : 'No') + '</td>';
                    html += '<td>' + ((c.herramientas || []).length) + '</td>';
                    html += '<td>' + c.orden + '</td>';
                    html += '<td>';
                    html += '<button class="vmp-btn-sm" onclick="VMP.categories.showForm(' + c.id + ')">Editar</button> ';
                    html += '<button class="vmp-btn-sm vmp-btn-danger" onclick="VMP.categories.confirmDelete(' + c.id + ')">Eliminar</button>';
                    html += '</td>';
                    html += '</tr>';
                });
                $tbody.html(html);
            } else {
                $tbody.html('<tr><td colspan="11" style="text-align:center;color:#dc2626">Error: ' + VMP.escHtml(r.data || 'Sin respuesta') + '</td></tr>');
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
        var self = this;
        self.loadFeatures(function() { self.populateFeatureSelector($form); });

        $form.find('[name="enHome"]').prop('checked', false);
        self.selectedTools = [];
        self.temasCount = 0;
        self.bindTools();
        VMP.loadToolFeatures(function(list) {
            self.tools = list;
            self.renderTools();
        });

        if (id) {
            VMP.api.get('/psychoeducation/admin/categories').done(function(r) {
                if (r.success && r.data) {
                    var cat = r.data.find(function(c) { return c.id === id; });
                    if (cat) {
                        $form.find('[name="id"]').val(cat.id);
                        $form.find('[name="titulo"]').val(cat.titulo);
                        $form.find('[name="slug"]').val(cat.slug);
                        $form.find('[name="descripcion"]').val(cat.descripcion || '');
                        $form.find('[name="orden"]').val(cat.orden);
                        $form.find('[name="enHome"]').prop('checked', !!cat.enHome);
                        self.selectedTools = (cat.herramientas || []).slice();
                        self.temasCount = cat.temasCount || 0;
                        self.renderTools();
                        self.loadFeatures(function() {
                            self.populateFeatureSelector($form, cat.accesoFeatureKey);
                        });
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
            orden: parseInt($form.find('[name="orden"]').val()) || 0,
            // null y no undefined: Free tiene que quitar la restricción anterior.
            accesoFeatureKey: $form.find('[name="accesoFeatureKey"]').val() || null,
            enHome: $form.find('[name="enHome"]').is(':checked'),
            // Lista completa en el orden visible: el Backend reemplaza la anterior.
            herramientas: this.selectedTools.slice()
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
