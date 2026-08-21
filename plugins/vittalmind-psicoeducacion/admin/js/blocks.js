var VMP = window.VMP || {};

var blockFormEl = document.getElementById('vmp-block-form');
var blockFormHtml = blockFormEl ? blockFormEl.innerHTML : '';
if (blockFormEl) blockFormEl.remove();

(function($) {
VMP.blocks = {
    categories: [],

    loadCategories: function() {
        var self = this;
        VMP.api.get('/psychoeducation').done(function(r) {
            if (r.success && r.data) {
                self.categories = r.data;
                var $filter = $('#vmp-block-filter-cat');
                var html = '<option value="">Todas las categorías</option>';
                r.data.forEach(function(c) {
                    html += '<option value="' + c.id + '">' + VMP.escHtml(c.titulo) + '</option>';
                });
                $filter.html(html);
                self.loadFilteredTopics();
            }
        });
    },

    loadFilteredTopics: function(callback) {
        var self = this;
        var catId = $('#vmp-block-filter-cat').val();
        var $topicFilter = $('#vmp-block-filter-topic');
        var $formTopic = $('#blk_tema_id');

        var topicOptions = '<option value="">Todos los temas</option>';
        var formOptions = '<option value="">— Seleccionar tema —</option>';

        function done() {
            $topicFilter.html(topicOptions);
            $formTopic.html(formOptions);
            self.loadList();
            if (callback) callback();
        }

        if (!catId) {
            VMP.api.get('/psychoeducation').done(function(r) {
                if (!r.success || !r.data) {
                    done();
                    return;
                }
                if (r.data.length === 0) {
                    done();
                    return;
                }
                var total = 0;
                r.data.forEach(function(cat) {
                    VMP.api.get('/psychoeducation/' + cat.slug).done(function(d) {
                        if (d.success && d.data && d.data.temas) {
                            d.data.temas.forEach(function(t) {
                                var label = VMP.escHtml(cat.titulo) + ' — ' + VMP.escHtml(t.titulo);
                                topicOptions += '<option value="' + t.id + '">' + label + '</option>';
                                formOptions += '<option value="' + t.id + '">' + label + '</option>';
                            });
                        }
                        total++;
                        if (total === r.data.length) done();
                    });
                });
            });
        } else {
            var cat = this.categories.find(function(c) { return c.id == catId; });
            if (cat) {
                VMP.api.get('/psychoeducation/' + cat.slug).done(function(d) {
                    if (d.success && d.data && d.data.temas) {
                        d.data.temas.forEach(function(t) {
                            topicOptions += '<option value="' + t.id + '">' + VMP.escHtml(t.titulo) + '</option>';
                            formOptions += '<option value="' + t.id + '">' + VMP.escHtml(t.titulo) + '</option>';
                        });
                    }
                    done();
                });
            } else {
                done();
            }
        }
    },

    loadList: function() {
        var filterTopicId = $('#vmp-block-filter-topic').val();
        var $tbody = $('#vmp-blocks-list');
        $tbody.html('<tr><td colspan="7" style="text-align:center;color:#94a3b8">Cargando...</td></tr>');

        var self = this;
        VMP.api.get('/psychoeducation').done(function(r) {
            if (!r.success || !r.data) {
                $tbody.html('<tr><td colspan="7" style="color:#dc2626">Error al cargar</td></tr>');
                return;
            }
            if (r.data.length === 0) {
                $tbody.html('<tr><td colspan="7" style="text-align:center;color:#94a3b8">No hay categorías.</td></tr>');
                return;
            }

            var html = '';
            var done = 0;

            function finish() {
                $tbody.html(html || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">No hay bloques.</td></tr>');
            }

            r.data.forEach(function(cat) {
                VMP.api.get('/psychoeducation/' + cat.slug).done(function(d) {
                    var temas = (d.success && d.data && d.data.temas) ? d.data.temas : [];
                    var tdone = 0;

                    temas.forEach(function(t) {
                        if (filterTopicId && t.id != filterTopicId) {
                            tdone++;
                            if (tdone === temas.length) {
                                done++;
                                if (done === r.data.length) finish();
                            }
                            return;
                        }
                        var topicLabel = VMP.escHtml(cat.titulo) + ' / ' + VMP.escHtml(t.titulo);

                        VMP.api.get('/psychoeducation/' + cat.slug + '/' + t.id).done(function(b) {
                            if (b.success && b.data && b.data.bloques) {
                                b.data.bloques.forEach(function(blk) {
                                    var pilarClass = 'vmp-badge-conciencia';
                                    if (blk.pilar === 'ACEPTACION') pilarClass = 'vmp-badge-aceptacion';
                                    if (blk.pilar === 'ACCION') pilarClass = 'vmp-badge-accion';

                                    html += '<tr>';
                                    html += '<td>' + blk.id + '</td>';
                                    html += '<td><strong>' + VMP.escHtml(blk.tituloBloque) + '</strong></td>';
                                    html += '<td style="font-size:12px;color:#64748b">' + topicLabel + '</td>';
                                    html += '<td><span class="vmp-badge ' + pilarClass + '">' + blk.pilar + '</span></td>';
                                    html += '<td><span class="vmp-badge vmp-badge-type">' + blk.tipoComponente + '</span></td>';
                                    html += '<td>' + blk.orden + '</td>';
                                    html += '<td>';
                                    html += '<button class="vmp-btn-sm" onclick="VMP.blocks.showForm(' + blk.id + ')">Editar</button> ';
                                    html += '<button class="vmp-btn-sm vmp-btn-danger" onclick="VMP.blocks.confirmDelete(' + blk.id + ')">Eliminar</button>';
                                    html += '</td>';
                                    html += '</tr>';
                                });
                            }
                            tdone++;
                            if (tdone === temas.length) {
                                done++;
                                if (done === r.data.length) finish();
                            }
                        });
                    });

                    if (temas.length === 0) {
                        done++;
                        if (done === r.data.length) finish();
                    }
                });
            });
        });
    },

    toggleFormFields: function() {
        var tipo = $('#blk_tipo').val();
        var $container = $('#vmp-block-json-fields');
        $container.empty();

        if (!tipo) return;

        var fieldSets = {
            TEXTO: this.renderTextoFields(),
            TABLA_COMPARATIVA: this.renderTablaFields(),
            CUESTIONARIO: this.renderCuestionarioFields(),
            EJERCICIO_DIDACTICO: this.renderEjercicioFields(),
            FORMULARIO: this.renderFormularioFields(),
            FORMULARIO_PAREJA: this.renderFormularioParejaFields()
        };

        if (fieldSets[tipo]) {
            $container.html(fieldSets[tipo]);
            $container.find('.vmp-add-item').on('click', function() {
                var $list = $(this).closest('.vmp-field').find('.vmp-items-list');
                var $proto = $list.find('.vmp-item-proto');
                var $row = $proto.clone().removeClass('vmp-item-proto').css('display', '');
                $row.find('input, select').val('');
                $list.append($row);
                $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
            });
            $container.find('.vmp-remove-item').on('click', function() {
                if ($(this).closest('.vmp-items-list').find('.vmp-item-row:not(.vmp-item-proto)').length > 1) {
                    $(this).closest('.vmp-item-row').remove();
                }
            });
        }
    },

    renderTextoFields: function() {
        return '<div class="vmp-field">' +
            '<label>Párrafos</label>' +
            '<div class="vmp-items-list" id="vmp-parrafos-list">' +
            '<div class="vmp-item-row vmp-item-proto" style="display:none">' +
            '<textarea rows="3" placeholder="Texto del párrafo" style="grid-column:1/-2"></textarea>' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '<div class="vmp-item-row"><textarea rows="3" placeholder="Texto del párrafo" style="grid-column:1/-2"></textarea>' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '</div><button class="button vmp-add-item" style="margin-top:8px">+ Agregar párrafo</button></div>' +
            '<div class="vmp-field"><label>Cita poética (opcional)</label></div>' +
            '<div class="vmp-field" style="margin-left:16px"><label>Autor de la cita</label><input type="text" id="vmp-cita-autor" placeholder="Nombre del autor"></div>' +
            '<div class="vmp-field" style="margin-left:16px"><label>Fragmento</label><textarea id="vmp-cita-fragmento" rows="2" placeholder="Texto de la cita"></textarea></div>';
    },

    renderTablaFields: function() {
        return '<div class="vmp-field">' +
            '<label>Columnas (separadas por coma)</label>' +
            '<input type="text" id="vmp-tabla-columnas" placeholder="Ej: Estilo, Conductas típicas, Mensaje">' +
            '</div><div class="vmp-field"><label>Filas</label>' +
            '<div class="vmp-items-list" id="vmp-tabla-filas-list">' +
            '<div class="vmp-item-row vmp-item-proto" style="display:none">' +
            '<input type="text" placeholder="Clave" class="vmp-fila-key">' +
            '<input type="text" placeholder="Valor" class="vmp-fila-val">' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '<div class="vmp-item-row"><input type="text" placeholder="Clave" class="vmp-fila-key">' +
            '<input type="text" placeholder="Valor" class="vmp-fila-val">' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '</div><button class="button vmp-add-item" style="margin-top:8px">+ Agregar fila</button></div>';
    },

    renderCuestionarioFields: function() {
        return '<div class="vmp-field"><label>Instrucciones</label>' +
            '<textarea id="vmp-cuest-instrucciones" rows="2" placeholder="Instrucciones para el cuestionario"></textarea></div>' +
            '<div class="vmp-field"><label>Ítems del cuestionario</label>' +
            '<div class="vmp-items-list" id="vmp-cuest-items-list">' +
            '<div class="vmp-item-row vmp-item-proto" style="display:none">' +
            '<input type="text" placeholder="ID (único)" class="vmp-cuest-id">' +
            '<input type="text" placeholder="Aspecto" class="vmp-cuest-aspecto">' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '<div class="vmp-item-row"><input type="text" placeholder="ID (único)" class="vmp-cuest-id">' +
            '<input type="text" placeholder="Aspecto" class="vmp-cuest-aspecto">' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '</div><button class="button vmp-add-item" style="margin-top:8px">+ Agregar ítem</button></div>' +
            '<div class="vmp-field"><label>Pregunta base</label>' +
            '<input type="text" id="vmp-cuest-pregunta" placeholder="Ej: ¿Cómo calificas tu nivel de {aspecto}?"></div>';
    },

    renderEjercicioFields: function() {
        return '<div class="vmp-field"><label>Metodología</label>' +
            '<textarea id="vmp-ejer-metodologia" rows="3" placeholder="Descripción de la metodología"></textarea></div>' +
            '<div class="vmp-field"><label>Pasos</label>' +
            '<div class="vmp-items-list" id="vmp-ejer-pasos-list">' +
            '<div class="vmp-item-row vmp-item-proto" style="display:none">' +
            '<textarea rows="2" placeholder="Descripción del paso" style="grid-column:1/-2"></textarea>' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '<div class="vmp-item-row"><textarea rows="2" placeholder="Descripción del paso" style="grid-column:1/-2"></textarea>' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '</div><button class="button vmp-add-item" style="margin-top:8px">+ Agregar paso</button></div>' +
            '<div class="vmp-field"><label>Ejemplo (opcional)</label>' +
            '<textarea id="vmp-ejer-ejemplo" rows="3" placeholder="Ejemplo ilustrativo"></textarea></div>';
    },

    renderFormularioFields: function() {
        return '<div class="vmp-field"><label>Instrucciones</label>' +
            '<textarea id="vmp-form-instrucciones" rows="2" placeholder="Instrucciones para el formulario"></textarea></div>' +
            '<div class="vmp-field"><label>Ítems del formulario</label>' +
            '<div class="vmp-items-list" id="vmp-form-items-list">' +
            '<div class="vmp-item-row vmp-item-proto" style="display:none">' +
            '<input type="text" placeholder="ID" class="vmp-form-id" style="width:80px">' +
            '<input type="text" placeholder="Label" class="vmp-form-label">' +
            '<select class="vmp-form-tipo"><option value="LIKERT">Likert</option><option value="TEXTO_LIBRE">Texto libre</option><option value="SELECCION_MULTIPLE">Selección múltiple</option><option value="NUMERICO">Numérico</option><option value="FECHA">Fecha</option></select>' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '<div class="vmp-item-row"><input type="text" placeholder="ID" class="vmp-form-id" style="width:80px">' +
            '<input type="text" placeholder="Label" class="vmp-form-label">' +
            '<select class="vmp-form-tipo"><option value="LIKERT">Likert</option><option value="TEXTO_LIBRE">Texto libre</option><option value="SELECCION_MULTIPLE">Selección múltiple</option><option value="NUMERICO">Numérico</option><option value="FECHA">Fecha</option></select>' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '</div><button class="button vmp-add-item" style="margin-top:8px">+ Agregar ítem</button></div>';
    },

    renderFormularioParejaFields: function() {
        return '<div class="vmp-field"><label>Instrucciones</label>' +
            '<textarea id="vmp-fpareja-instrucciones" rows="2" placeholder="Instrucciones para el formulario de pareja"></textarea></div>' +
            '<div class="vmp-field"><label>Ítems de evaluación</label>' +
            '<div class="vmp-items-list" id="vmp-fpareja-items-list">' +
            '<div class="vmp-item-row vmp-item-proto" style="display:none">' +
            '<input type="text" placeholder="ID" class="vmp-fpareja-id" style="width:80px">' +
            '<input type="text" placeholder="Aspecto" class="vmp-fpareja-aspecto">' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '<div class="vmp-item-row"><input type="text" placeholder="ID" class="vmp-fpareja-id" style="width:80px">' +
            '<input type="text" placeholder="Aspecto" class="vmp-fpareja-aspecto">' +
            '<button class="vmp-remove-item">Eliminar</button></div>' +
            '</div><button class="button vmp-add-item" style="margin-top:8px">+ Agregar ítem</button></div>' +
            '<div class="vmp-field">' +
            '<label><input type="checkbox" id="vmp-fpareja-exportar-pdf" checked> Exportar a PDF</label>' +
            '</div>';
    },

    buildCuerpoJson: function() {
        var tipo = $('#blk_tipo').val();
        var json = {};

        switch (tipo) {
            case 'TEXTO':
                json.parrafos = [];
                $('#vmp-parrafos-list .vmp-item-row:not(.vmp-item-proto)').each(function() {
                    var v = $(this).find('textarea').val();
                    if (v) json.parrafos.push(v);
                });
                var citaAutor = $('#vmp-cita-autor').val();
                var citaFrag = $('#vmp-cita-fragmento').val();
                if (citaAutor || citaFrag) {
                    json.cita_poetica = {};
                    if (citaAutor) json.cita_poetica.autor = citaAutor;
                    if (citaFrag) json.cita_poetica.fragmento = citaFrag;
                }
                break;

            case 'TABLA_COMPARATIVA':
                var cols = $('#vmp-tabla-columnas').val().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                json.columnas = cols;
                json.filas = [];
                $('#vmp-tabla-filas-list .vmp-item-row:not(.vmp-item-proto)').each(function() {
                    var key = $(this).find('.vmp-fila-key').val();
                    var val = $(this).find('.vmp-fila-val').val();
                    if (key && val) {
                        var row = {};
                        row[key] = val;
                        json.filas.push(row);
                    }
                });
                break;

            case 'CUESTIONARIO':
                json.instrucciones = $('#vmp-cuest-instrucciones').val();
                json.items = [];
                $('#vmp-cuest-items-list .vmp-item-row:not(.vmp-item-proto)').each(function() {
                    var id = $(this).find('.vmp-cuest-id').val();
                    var aspecto = $(this).find('.vmp-cuest-aspecto').val();
                    var pregunta = $('#vmp-cuest-pregunta').val().replace('{aspecto}', aspecto);
                    if (id && aspecto) {
                        json.items.push({ id: id, aspecto: aspecto, pregunta: pregunta });
                    }
                });
                break;

            case 'EJERCICIO_DIDACTICO':
                json.metodologia = $('#vmp-ejer-metodologia').val();
                json.pasos = [];
                $('#vmp-ejer-pasos-list .vmp-item-row:not(.vmp-item-proto)').each(function() {
                    var v = $(this).find('textarea').val();
                    if (v) json.pasos.push(v);
                });
                var ejemplo = $('#vmp-ejer-ejemplo').val();
                if (ejemplo) json.ejemplo = ejemplo;
                break;

            case 'FORMULARIO':
                json.instrucciones = $('#vmp-form-instrucciones').val();
                json.items = [];
                $('#vmp-form-items-list .vmp-item-row:not(.vmp-item-proto)').each(function() {
                    var id = $(this).find('.vmp-form-id').val();
                    var label = $(this).find('.vmp-form-label').val();
                    var tipo = $(this).find('.vmp-form-tipo').val();
                    if (id && label) {
                        json.items.push({ id: id, label: label, tipo: tipo });
                    }
                });
                break;

            case 'FORMULARIO_PAREJA':
                json.instrucciones = $('#vmp-fpareja-instrucciones').val();
                json.items = [];
                $('#vmp-fpareja-items-list .vmp-item-row:not(.vmp-item-proto)').each(function() {
                    var id = $(this).find('.vmp-fpareja-id').val();
                    var aspecto = $(this).find('.vmp-fpareja-aspecto').val();
                    if (id && aspecto) {
                        json.items.push({ id: id, aspecto: aspecto, pregunta: '¿Cómo calificas el nivel de ' + aspecto + ' en la relación?' });
                    }
                });
                json.exportar_pdf = $('#vmp-fpareja-exportar-pdf').is(':checked');
                break;
        }

        return json;
    },

    populateForm: function(block) {
        var tipo = block.tipoComponente;
        $('#blk_tipo').val(tipo);
        this.toggleFormFields();

        var json = block.cuerpoJson || {};
        if (typeof json === 'string') json = JSON.parse(json);

        switch (tipo) {
            case 'TEXTO':
                if (json.parrafos) {
                    var $list = $('#vmp-parrafos-list');
                    $list.find('.vmp-item-row:not(.vmp-item-proto)').remove();
                    json.parrafos.forEach(function(p) {
                        var $row = $list.find('.vmp-item-proto').clone().removeClass('vmp-item-proto').css('display', '');
                        $row.find('textarea').val(p);
                        $list.append($row);
                        $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
                    });
                }
                if (json.cita_poetica) {
                    if (json.cita_poetica.autor) $('#vmp-cita-autor').val(json.cita_poetica.autor);
                    if (json.cita_poetica.fragmento) $('#vmp-cita-fragmento').val(json.cita_poetica.fragmento);
                }
                break;

            case 'TABLA_COMPARATIVA':
                if (json.columnas) $('#vmp-tabla-columnas').val(json.columnas.join(', '));
                if (json.filas) {
                    var $tlist = $('#vmp-tabla-filas-list');
                    $tlist.find('.vmp-item-row:not(.vmp-item-proto)').remove();
                    json.filas.forEach(function(f) {
                        var $row = $tlist.find('.vmp-item-proto').clone().removeClass('vmp-item-proto').css('display', '');
                        var keys = Object.keys(f);
                        if (keys.length > 0) {
                            $row.find('.vmp-fila-key').val(keys[0]);
                            $row.find('.vmp-fila-val').val(f[keys[0]]);
                        }
                        $tlist.append($row);
                        $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
                    });
                }
                break;

            case 'CUESTIONARIO':
                if (json.instrucciones) $('#vmp-cuest-instrucciones').val(json.instrucciones);
                if (json.items) {
                    var $clist = $('#vmp-cuest-items-list');
                    $clist.find('.vmp-item-row:not(.vmp-item-proto)').remove();
                    json.items.forEach(function(item) {
                        var $row = $clist.find('.vmp-item-proto').clone().removeClass('vmp-item-proto').css('display', '');
                        $row.find('.vmp-cuest-id').val(item.id);
                        $row.find('.vmp-cuest-aspecto').val(item.aspecto);
                        $clist.append($row);
                        $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
                    });
                }
                break;

            case 'EJERCICIO_DIDACTICO':
                if (json.metodologia) $('#vmp-ejer-metodologia').val(json.metodologia);
                if (json.pasos) {
                    var $elist = $('#vmp-ejer-pasos-list');
                    $elist.find('.vmp-item-row:not(.vmp-item-proto)').remove();
                    json.pasos.forEach(function(p) {
                        var $row = $elist.find('.vmp-item-proto').clone().removeClass('vmp-item-proto').css('display', '');
                        $row.find('textarea').val(p);
                        $elist.append($row);
                        $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
                    });
                }
                if (json.ejemplo) $('#vmp-ejer-ejemplo').val(json.ejemplo);
                break;

            case 'FORMULARIO':
                if (json.instrucciones) $('#vmp-form-instrucciones').val(json.instrucciones);
                if (json.items) {
                    var $flist = $('#vmp-form-items-list');
                    $flist.find('.vmp-item-row:not(.vmp-item-proto)').remove();
                    json.items.forEach(function(item) {
                        var $row = $flist.find('.vmp-item-proto').clone().removeClass('vmp-item-proto').css('display', '');
                        $row.find('.vmp-form-id').val(item.id);
                        $row.find('.vmp-form-label').val(item.label);
                        $row.find('.vmp-form-tipo').val(item.tipo);
                        $flist.append($row);
                        $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
                    });
                }
                break;

            case 'FORMULARIO_PAREJA':
                if (json.instrucciones) $('#vmp-fpareja-instrucciones').val(json.instrucciones);
                if (json.items) {
                    var $fpList = $('#vmp-fpareja-items-list');
                    $fpList.find('.vmp-item-row:not(.vmp-item-proto)').remove();
                    json.items.forEach(function(item) {
                        var $row = $fpList.find('.vmp-item-proto').clone().removeClass('vmp-item-proto').css('display', '');
                        $row.find('.vmp-fpareja-id').val(item.id);
                        $row.find('.vmp-fpareja-aspecto').val(item.aspecto);
                        $fpList.append($row);
                        $row.find('.vmp-remove-item').on('click', function() { $(this).closest('.vmp-item-row').remove(); });
                    });
                }
                if (json.exportar_pdf !== undefined) {
                    $('#vmp-fpareja-exportar-pdf').prop('checked', json.exportar_pdf);
                }
                break;
        }
    },

    showForm: function(id) {
        var self = this;
        VMP.renderModal('Bloque de contenido', blockFormHtml);
        var $form = $('#vmp-block-form-fields');
        $form.find('[name="id"]').val('');
        $form.find('[name="tituloBloque"]').val('');
        $form.find('[name="pilar"]').val('');
        $form.find('[name="tipoComponente"]').val('');
        $form.find('[name="orden"]').val('0');
        $('#vmp-block-json-fields').empty();

        if (!id) {
            self.loadFilteredTopics();
            return;
        }

        VMP.api.get('/psychoeducation').done(function(r) {
            if (r.success && r.data) {
                var idx = 0;
                function findBlock() {
                    if (idx >= r.data.length) {
                        VMP.notice('Bloque no encontrado', 'error');
                        return;
                    }
                    var cat = r.data[idx];
                    VMP.api.get('/psychoeducation/' + cat.slug).done(function(d) {
                        if (d.success && d.data && d.data.temas) {
                            var tIdx = 0;
                            function searchTopics() {
                                if (tIdx >= d.data.temas.length) { idx++; findBlock(); return; }
                                var t = d.data.temas[tIdx];
                                VMP.api.get('/psychoeducation/' + cat.slug + '/' + t.id).done(function(b) {
                                    if (b.success && b.data && b.data.bloques) {
                                        var blk = b.data.bloques.find(function(x) { return x.id === id; });
                                        if (blk) {
                                            $form.find('[name="id"]').val(blk.id);
                                            $form.find('[name="tituloBloque"]').val(blk.tituloBloque);
                                            $form.find('[name="pilar"]').val(blk.pilar);
                                            $form.find('[name="tipoComponente"]').val(blk.tipoComponente);
                                            $form.find('[name="orden"]').val(blk.orden);
                                            self.populateForm(blk);
                                            self.loadFilteredTopics(function() {
                                                $form.find('[name="temaId"]').val(blk.temaId);
                                            });
                                            return;
                                        }
                                    }
                                    tIdx++;
                                    searchTopics();
                                });
                            }
                            searchTopics();
                        } else {
                            idx++;
                            findBlock();
                        }
                    });
                }
                findBlock();
            }
        });
    },

    save: function() {
        var $form = $('#vmp-block-form-fields');
        var id = $form.find('[name="id"]').val();
        var tipo = $form.find('[name="tipoComponente"]').val();

        var data = {
            temaId: parseInt($form.find('[name="temaId"]').val()),
            pilar: $form.find('[name="pilar"]').val(),
            tipoComponente: tipo,
            tituloBloque: $form.find('[name="tituloBloque"]').val(),
            cuerpoJson: this.buildCuerpoJson(),
            orden: parseInt($form.find('[name="orden"]').val()) || 0
        };

        if (!data.temaId || !data.pilar || !data.tipoComponente || !data.tituloBloque) {
            VMP.notice('Completa todos los campos requeridos.', 'error');
            return;
        }

        var promise = id
            ? VMP.api.put('/psychoeducation/admin/blocks/' + id, data)
            : VMP.api.post('/psychoeducation/admin/blocks', data);

        promise.done(function(r) {
            if (r.success) {
                VMP.closeModal();
                VMP.notice('Bloque ' + (id ? 'actualizado' : 'creado') + ' correctamente.');
                VMP.blocks.loadList();
            } else {
                VMP.notice('Error: ' + (r.data || 'No se pudo guardar'), 'error');
            }
        });
    },

    confirmDelete: function(id) {
        VMP.confirm('Eliminar este bloque de contenido?', function() {
            VMP.api.del('/psychoeducation/admin/blocks/' + id).done(function(r) {
                if (r.success) {
                    VMP.notice('Bloque eliminado.');
                    VMP.blocks.loadList();
                } else {
                    VMP.notice('Error: ' + (r.data || 'No se pudo eliminar'), 'error');
                }
            });
        });
    }
};

jQuery(function() {
    VMP.blocks.loadCategories();
});
})(jQuery);
