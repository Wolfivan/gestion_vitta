<div class="wrap vmpn-card-wrap">
    <h1>Plantillas de notificaciones</h1>
    <div class="vmpn-notices"></div>

    <div class="vmpn-card vmpn-guidance">
        <h2>Criterio clínico</h2>
        <p class="vmpn-help">
            Los textos deben invitar sin exigir. Evita frases como «no olvides»,
            «llevas días sin…» o cualquier referencia a diagnósticos, síntomas o
            datos personales. La notificación nunca incluye el nombre ni el
            contenido de las entradas de gratitud.
        </p>
    </div>

    <div id="vmpn-templates" class="vmpn-templates">
        <p class="vmpn-empty">Cargando plantillas...</p>
    </div>

    <p style="margin-top:20px">
        <a href="<?php echo esc_url(admin_url('admin.php?page=vmpn-settings')); ?>" class="button">Configuración</a>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="display:inline">
            <?php wp_nonce_field('vmpn_auth'); ?>
            <input type="hidden" name="action" value="vmpn_logout">
            <button type="submit" class="button">Cerrar sesión del backend</button>
        </form>
    </p>
</div>

<script>
jQuery(function($) {
    var templates = [];

    function load() {
        VMPN.api.get('/admin/notifications/templates').done(function(r) {
            if (!r.success) {
                $('#vmpn-templates').html(
                    '<p class="vmpn-empty" style="color:#dc2626">' +
                    VMPN.escHtml(r.data || 'No se pudieron cargar las plantillas.') +
                    '</p>'
                );
                return;
            }

            templates = r.data || [];

            if (templates.length === 0) {
                $('#vmpn-templates').html('<p class="vmpn-empty">No hay plantillas registradas.</p>');
                return;
            }

            var html = '';
            templates.forEach(function(template) {
                html += VMPN.renderTemplate(template);
            });
            $('#vmpn-templates').html(html);
        });
    }

    $(document).on('click', '.vmpn-edit', function() {
        var key = $(this).data('key');
        var template = templates.find(function(t) { return t.key === key; });
        if (template) VMPN.openEditor(template);
    });

    $(document).on('click', '.vmpn-cancel', function() {
        VMPN.closeModal();
    });

    $(document).on('click', '.vmpn-save', function() {
        var $button = $(this);
        var key = $button.data('key');
        var title = $.trim($('#vmpn-edit-title').val());
        var body = $.trim($('#vmpn-edit-body').val());
        var deepLink = $.trim($('#vmpn-edit-deeplink').val());
        var isActive = $('#vmpn-edit-active').is(':checked');

        if (title === '' || body === '') {
            VMPN.notice('El título y el mensaje no pueden estar vacíos.', 'error');
            return;
        }

        $button.prop('disabled', true).text('Guardando...');

        VMPN.api.put('/admin/notifications/templates/' + encodeURIComponent(key), {
            title: title,
            body: body,
            deepLink: deepLink === '' ? null : deepLink,
            isActive: isActive
        }).done(function(r) {
            if (r.success) {
                VMPN.closeModal();
                VMPN.notice('Plantilla actualizada. La app usará el nuevo texto en el próximo envío.');
                load();
            } else {
                VMPN.notice(VMPN.escHtml(r.data || 'No se pudo guardar la plantilla.'), 'error');
            }
        }).always(function() {
            $button.prop('disabled', false).text('Guardar cambios');
        });
    });

    load();
});
</script>
