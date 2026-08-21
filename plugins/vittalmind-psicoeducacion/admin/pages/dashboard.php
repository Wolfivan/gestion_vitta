<div class="wrap vmp-card-wrap">
    <h1>Dashboard — Psicoeducación</h1>
    <div class="vmp-notices"></div>
    <div class="vmp-grid" id="vmp-dashboard-stats">
        <div class="vmp-stat"><h3>Categorías</h3><div class="vmp-number" id="vmp-stat-categories">—</div></div>
        <div class="vmp-stat"><h3>Temas</h3><div class="vmp-number" id="vmp-stat-topics">—</div></div>
        <div class="vmp-stat"><h3>Bloques</h3><div class="vmp-number" id="vmp-stat-blocks">—</div></div>
        <div class="vmp-stat"><h3>Tipos de bloque</h3><div class="vmp-number" id="vmp-stat-types">—</div></div>
    </div>

    <div class="vmp-card">
        <h2>Acciones rápidas</h2>
        <p>
            <a href="<?php echo admin_url('admin.php?page=vmp-categories'); ?>" class="button">Gestionar categorías</a>
            <a href="<?php echo admin_url('admin.php?page=vmp-topics'); ?>" class="button">Gestionar temas</a>
            <a href="<?php echo admin_url('admin.php?page=vmp-blocks'); ?>" class="button">Gestionar bloques</a>
            <a href="<?php echo admin_url('admin.php?page=vmp-settings'); ?>" class="button">Configuración</a>
        </p>
    </div>

    <div class="vmp-card">
        <h2>Vista previa de contenido</h2>
        <div id="vmp-dashboard-content"><p style="color:#94a3b8">Cargando contenido...</p></div>
    </div>
</div>

<script>
jQuery(function($) {
    function escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    VMP.api.get('/psychoeducation').done(function(r) {
        if (!r.success || !r.data) {
            $('#vmp-dashboard-content').html('<p style="color:#dc2626">Error al cargar: ' + escHtml(r.data || 'Sin respuesta') + '</p>');
            return;
        }

        var cats = r.data;

        if (cats.length === 0) {
            $('#vmp-dashboard-content').html('<p style="color:#94a3b8">No hay categorías. <a href="' + vmp_ajax.ajax_url.replace('/wp-admin/admin-ajax.php', '/wp-admin/admin.php?page=vmp-categories') + '">Crear primera categoría</a></p>');
            $('#vmp-stat-categories').text('0');
            $('#vmp-stat-topics').text('0');
            $('#vmp-stat-blocks').text('0');
            $('#vmp-stat-types').text('—');
            return;
        }

        var totalTopics = 0;
        var totalBlocks = 0;
        var typeSet = new Set();
        var html = '';
        var done = 0;

        cats.forEach(function(cat) {
            totalTopics += cat.temasCount || 0;

            html += '<div class="vmp-card" style="margin-bottom:12px">';
            html += '<h3>' + escHtml(cat.titulo) + ' <span style="font-weight:400;font-size:13px;color:#64748b">(' + escHtml(cat.slug) + ')</span></h3>';
            html += '<p>' + escHtml(cat.descripcion || 'Sin descripción') + '</p>';
            html += '<p><strong>Temas:</strong> ' + (cat.temasCount || 0) + '</p>';
            html += '</div>';

            VMP.api.get('/psychoeducation/' + cat.slug).done(function(detail) {
                var temas = (detail.success && detail.data && detail.data.temas) ? detail.data.temas : [];
                var tdone = 0;

                temas.forEach(function(t) {
                    VMP.api.get('/psychoeducation/' + cat.slug + '/' + t.id).done(function(b) {
                        if (b.success && b.data && b.data.bloques) {
                            b.data.bloques.forEach(function(blk) {
                                totalBlocks++;
                                typeSet.add(blk.tipoComponente);
                            });
                        }
                        tdone++;
                        if (tdone === temas.length) {
                            done++;
                            if (done === cats.length) {
                                $('#vmp-stat-categories').text(cats.length);
                                $('#vmp-stat-topics').text(totalTopics);
                                $('#vmp-stat-blocks').text(totalBlocks);
                                $('#vmp-stat-types').text(typeSet.size || '—');
                            }
                        }
                    });
                });

                if (temas.length === 0) {
                    done++;
                    if (done === cats.length) {
                        $('#vmp-stat-categories').text(cats.length);
                        $('#vmp-stat-topics').text(totalTopics);
                        $('#vmp-stat-blocks').text(totalBlocks);
                        $('#vmp-stat-types').text(typeSet.size || '—');
                    }
                }
            });
        });

        $('#vmp-dashboard-content').html(html);
    }).fail(function() {
        $('#vmp-dashboard-content').html('<p style="color:#dc2626">Error de conexión con el backend.</p>');
    });
});
</script>
