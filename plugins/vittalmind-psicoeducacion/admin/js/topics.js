var VMP = window.VMP || {};

var topicFormEl = document.getElementById('vmp-topic-form');
var topicFormHtml = topicFormEl ? topicFormEl.innerHTML : '';
if (topicFormEl) topicFormEl.remove();

(function($) {
VMP.topics = {
    categories: [],

    loadCategories: function(callback) {
        var self = this;
        VMP.api.get('/psychoeducation').done(function(r) {
            if (r.success && r.data) {
                self.categories = r.data;
                var $filter = $('#vmp-topic-filter');
                var $formCat = $('#top_categoria_id');
                var options = '<option value="">Todas las categorías</option>';
                var formOptions = '<option value="">— Seleccionar categoría —</option>';
                r.data.forEach(function(c) {
                    options += '<option value="' + c.id + '">' + VMP.escHtml(c.titulo) + '</option>';
                    formOptions += '<option value="' + c.id + '">' + VMP.escHtml(c.titulo) + '</option>';
                });
                $filter.html(options);
                $formCat.html(formOptions);
                if (callback) callback();
            }
        });
    },

    loadList: function() {
        var self = this;
        var filterCatId = $('#vmp-topic-filter').val();

        VMP.api.get('/psychoeducation').done(function(r) {
            if (!r.success || !r.data) {
                $('#vmp-topics-list').html('<tr><td colspan="8" style="color:#dc2626">Error al cargar</td></tr>');
                return;
            }

            var $tbody = $('#vmp-topics-list');
            var html = '';
            var done = 0;
            var total = r.data.length;

            if (total === 0) {
                $tbody.html('<tr><td colspan="8" style="text-align:center;color:#94a3b8">No hay categorías. Crea una primero.</td></tr>');
                return;
            }

            r.data.forEach(function(cat) {
                VMP.api.get('/psychoeducation/' + cat.slug).done(function(d) {
                    if (d.success && d.data && d.data.temas) {
                        var temas = filterCatId
                            ? d.data.temas.filter(function(t) { return t.categoriaId == filterCatId; })
                            : d.data.temas;

                        temas.forEach(function(t) {
                            html += '<tr>';
                            html += '<td>' + t.id + '</td>';
                            html += '<td><strong>' + VMP.escHtml(t.titulo) + '</strong></td>';
                            html += '<td>' + VMP.escHtml(cat.titulo) + '</td>';
                            html += '<td>' + VMP.escHtml(t.descripcionBreve || '—') + '</td>';
                            html += '<td>' + VMP.escHtml(t.autor || '—') + '</td>';
                            html += '<td>' + (t.bloquesCount || 0) + '</td>';
                            html += '<td>' + t.orden + '</td>';
                            html += '<td>';
                            html += '<button class="vmp-btn-sm" onclick="VMP.topics.showForm(' + t.id + ')">Editar</button> ';
                            html += '<button class="vmp-btn-sm vmp-btn-danger" onclick="VMP.topics.confirmDelete(' + t.id + ')">Eliminar</button>';
                            html += '</td>';
                            html += '</tr>';
                        });
                    }
                    done++;
                    if (done === total) {
                        $tbody.html(html || '<tr><td colspan="8" style="text-align:center;color:#94a3b8">No hay temas' + (filterCatId ? ' en esta categoría' : '') + '.</td></tr>');
                    }
                });
            });
        });
    },

    showForm: function(id) {
        var self = this;
        VMP.renderModal('Tema', topicFormHtml);
        var $form = $('#vmp-topic-form-fields');
        $form.find('[name="id"]').val('');
        $form.find('[name="titulo"]').val('');
        $form.find('[name="descripcionBreve"]').val('');
        $form.find('[name="autor"]').val('');
        $form.find('[name="orden"]').val('0');

        if (!id) {
            self.loadCategories();
        }

        if (id) {
            VMP.api.get('/psychoeducation').done(function(r) {
                if (r.success && r.data) {
                    var found = false;
                    var idx = 0;
                    function searchNext() {
                        if (idx >= r.data.length) {
                            if (!found) VMP.notice('Tema no encontrado', 'error');
                            return;
                        }
                        var cat = r.data[idx];
                        VMP.api.get('/psychoeducation/' + cat.slug).done(function(d) {
                            if (d.success && d.data && d.data.temas) {
                                var t = d.data.temas.find(function(tm) { return tm.id === id; });
                                if (t) {
                                    found = true;
                                    $form.find('[name="id"]').val(t.id);
                                    $form.find('[name="titulo"]').val(t.titulo);
                                    $form.find('[name="descripcionBreve"]').val(t.descripcionBreve || '');
                                    $form.find('[name="autor"]').val(t.autor || '');
                                    $form.find('[name="orden"]').val(t.orden);
                                    self.loadCategories(function() {
                                        $form.find('[name="categoriaId"]').val(t.categoriaId);
                                    });
                                }
                            }
                            idx++;
                            searchNext();
                        });
                    }
                    searchNext();
                }
            });
        }

        $('#vmp-topic-form-fields').off('submit').on('submit', function(e) {
            e.preventDefault();
            VMP.topics.save();
        });
    },

    save: function() {
        var $form = $('#vmp-topic-form-fields');
        var id = $form.find('[name="id"]').val();
        var data = {
            categoriaId: parseInt($form.find('[name="categoriaId"]').val()),
            titulo: $form.find('[name="titulo"]').val(),
            descripcionBreve: $form.find('[name="descripcionBreve"]').val() || undefined,
            autor: $form.find('[name="autor"]').val() || undefined,
            orden: parseInt($form.find('[name="orden"]').val()) || 0
        };

        if (!data.categoriaId) {
            VMP.notice('Selecciona una categoría.', 'error');
            return;
        }

        var promise = id
            ? VMP.api.put('/psychoeducation/admin/topics/' + id, data)
            : VMP.api.post('/psychoeducation/admin/topics', data);

        promise.done(function(r) {
            if (r.success) {
                VMP.closeModal();
                VMP.notice('Tema ' + (id ? 'actualizado' : 'creado') + ' correctamente.');
                VMP.topics.loadList();
            } else {
                VMP.notice('Error: ' + (r.data || 'No se pudo guardar'), 'error');
            }
        });
    },

    confirmDelete: function(id) {
        VMP.confirm('Eliminar este tema? Todos sus bloques se eliminarán.', function() {
            VMP.api.del('/psychoeducation/admin/topics/' + id).done(function(r) {
                if (r.success) {
                    VMP.notice('Tema eliminado.');
                    VMP.topics.loadList();
                } else {
                    VMP.notice('Error: ' + (r.data || 'No se pudo eliminar'), 'error');
                }
            });
        });
    }
};

jQuery(function() {
    VMP.topics.loadCategories(function() {
        VMP.topics.loadList();
    });
});
})(jQuery);
