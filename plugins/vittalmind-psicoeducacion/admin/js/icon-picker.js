var VMP = window.VMP || {};

(function($) {
    'use strict';

    // El valor de `icono` viaja sin traducción hasta un <Text> de React Native
    // (biblioteca-screen.tsx y psychoeducation-home-screen.tsx), así que lo que
    // se guarda aquí tiene que ser el glifo en sí, no un nombre.
    //
    // De aquí sale el conjunto curado, y no una lista libre, por dos razones: el
    // campo VARCHAR(50) no cabe con un SVG, y un emoji dibujado distinto en cada
    // plataforma es peor que un emoji feo. Por eso no hay secuencias ZWJ, ni
    // tonos de piel, ni nada más nuevo que Emoji 12.0.
    var ICON_CATALOG = [
        {
            label: 'Vínculo y relaciones',
            icons: [
                { char: '💑', name: 'Pareja' },
                { char: '💞', name: 'Amor' },
                { char: '💌', name: 'Carta de amor' },
                { char: '🤝', name: 'Acuerdo' },
                { char: '👥', name: 'Comunidad' },
                { char: '💬', name: 'Conversación' }
            ]
        },
        {
            label: 'Bienestar emocional',
            icons: [
                { char: '💔', name: 'Dolor' },
                { char: '🩹', name: 'Recuperación' },
                { char: '😌', name: 'Calma' },
                { char: '😔', name: 'Tristeza' },
                { char: '🌧️', name: 'Dificultad' },
                { char: '☀️', name: 'Esperanza' }
            ]
        },
        {
            label: 'Mente y aprendizaje',
            icons: [
                { char: '🧠', name: 'Mente' },
                { char: '🌱', name: 'Crecimiento' },
                { char: '🧘', name: 'Atención plena' },
                { char: '📖', name: 'Lectura' },
                { char: '🧩', name: 'Pieza' },
                { char: '🔬', name: 'Análisis' },
                { char: '🎓', name: 'Formación' },
                { char: '⚖️', name: 'Equilibrio' }
            ]
        },
        {
            label: 'Comunicación',
            icons: [
                { char: '🗣️', name: 'Hablar' },
                { char: '✍️', name: 'Escribir' },
                { char: '📣', name: 'Anunciar' },
                { char: '🔑', name: 'Clave' }
            ]
        },
        {
            label: 'Progreso y hábitos',
            icons: [
                { char: '🎯', name: 'Objetivo' },
                { char: '⭐', name: 'Destacado' },
                { char: '✅', name: 'Completado' },
                { char: '💪', name: 'Fortaleza' },
                { char: '🔄', name: 'Cambio' },
                { char: '🧭', name: 'Dirección' },
                { char: '🩺', name: 'Salud' },
                { char: '🚀', name: 'Impulso' }
            ]
        },
        {
            label: 'Otros',
            icons: [
                // El corazón de texto es lo que tiene hoy la categoría
                // relaciones-pareja en la base de datos. Si no estuviera aquí, al
                // editar esa categoría el grid no marcaría nada y el valor se
                // perdería al guardar.
                { char: '♥', name: 'Corazón (valor actual)' },
                { char: '💭', name: 'Reflexión' },
                { char: '🌅', name: 'Nuevo comienzo' }
            ]
        }
    ];

    VMP.iconCatalog = ICON_CATALOG;

    VMP.isKnownIcon = function(value) {
        if (!value) return false;
        for (var g = 0; g < ICON_CATALOG.length; g++) {
            var icons = ICON_CATALOG[g].icons;
            for (var i = 0; i < icons.length; i++) {
                if (icons[i].char === value) return true;
            }
        }
        return false;
    };

    VMP.mountIconPicker = function($form) {
        var $input = $form.find('[name="icono"]');
        var $grid = $form.find('.vmp-icon-grid');
        if (!$input.length || !$grid.length) return null;

        var $preview = $form.find('.vmp-icon-preview');
        var $note = $form.find('.vmp-icon-note');

        function renderPreview(value) {
            if (!$preview.length) return;
            // Sin icono la app dibuja el 📖 de biblioteca, así que eso es lo que
            // se previsualiza. Evita elegir "Sin icono" pensando que el círculo
            // se quedará vacío.
            $preview.text(value || '📖');
            $preview.toggleClass('is-empty', !value);
        }

        function renderNote(value) {
            if (!$note.length) return;
            if (value && !VMP.isKnownIcon(value)) {
                $note.text('Icono actual: ' + value + ' — no está en la lista. Se conservará al guardar.');
                $note.addClass('is-visible');
            } else {
                $note.text('');
                $note.removeClass('is-visible');
            }
        }

        $grid.empty();

        ICON_CATALOG.forEach(function(group) {
            var $group = $('<div class="vmp-icon-group"></div>');
            $('<div class="vmp-icon-group-label"></div>').text(group.label).appendTo($group);
            var $row = $('<div class="vmp-icon-row"></div>').appendTo($group);

            group.icons.forEach(function(icon) {
                // type="button" es obligatorio: dentro de un <form> un button
                // sin type se envía y cerraría el modal al elegir icono.
                $('<button type="button" class="vmp-icon-opt"></button>')
                    .text(icon.char)
                    .attr('title', icon.name)
                    .attr('data-icon', icon.char)
                    .appendTo($row);
            });

            $group.appendTo($grid);
        });

        // "Sin icono" va fuera de los grupos porque vacía el campo en vez de
        // poner un glifo.
        $('<button type="button" class="vmp-icon-opt vmp-icon-none"></button>')
            .text('∅')
            .attr('title', 'Sin icono (la app muestra 📖)')
            .attr('data-icon', '')
            .appendTo($grid);

        var picker = {
            set: function(value) {
                value = value || '';
                $input.val(value);
                $grid.find('.vmp-icon-opt').each(function() {
                    var $opt = $(this);
                    $opt.toggleClass('selected', $opt.attr('data-icon') === value);
                });
                renderPreview(value);
                renderNote(value);
            }
        };

        $grid.off('click.vmpIcon').on('click.vmpIcon', '.vmp-icon-opt', function() {
            picker.set($(this).attr('data-icon'));
        });

        picker.set($input.val());
        return picker;
    };
})(jQuery);
