<div class="wrap vmp-card-wrap">
    <h1>Bloques de Contenido</h1>
    <div class="vmp-notices"></div>

    <div class="vmp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <p style="margin:0;color:#64748b">Los bloques son unidades de contenido dentro de un tema.</p>
            <button class="button button-primary" onclick="VMP.blocks.showForm()">+ Nuevo bloque</button>
        </div>
        <div class="vmp-field">
            <label for="vmp-block-filter-cat">Filtrar por categoría</label>
            <select id="vmp-block-filter-cat" onchange="VMP.blocks.loadFilteredTopics()">
                <option value="">Todas las categorías</option>
            </select>
        </div>
        <div class="vmp-field">
            <label for="vmp-block-filter-topic">Filtrar por tema</label>
            <select id="vmp-block-filter-topic" onchange="VMP.blocks.loadList()">
                <option value="">Todos los temas</option>
            </select>
        </div>
        <div class="vmp-table-wrap">
            <table class="vmp-table" id="vmp-blocks-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Tema</th>
                        <th>Pilar</th>
                        <th>Tipo</th>
                        <th>Orden</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="vmp-blocks-list">
                    <tr><td colspan="7" style="text-align:center;color:#94a3b8">Cargando...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div id="vmp-block-form" style="display:none">
    <form id="vmp-block-form-fields">
        <input type="hidden" name="id" value="">
        <div class="vmp-field">
            <label for="blk_tema_id">Tema *</label>
            <select id="blk_tema_id" name="temaId" required>
                <option value="">— Seleccionar tema —</option>
            </select>
        </div>
        <div class="vmp-field">
            <label for="blk_titulo">Título del bloque *</label>
            <input type="text" id="blk_titulo" name="tituloBloque" required>
        </div>
        <div class="vmp-field">
            <label for="blk_pilar">Pilar *</label>
            <select id="blk_pilar" name="pilar" required>
                <option value="">— Seleccionar pilar —</option>
                <option value="CONCIENCIA">Conciencia</option>
                <option value="ACEPTACION">Aceptación</option>
                <option value="ACCION">Acción</option>
            </select>
        </div>
        <div class="vmp-field">
            <label for="blk_tipo">Tipo de componente *</label>
            <select id="blk_tipo" name="tipoComponente" required onchange="VMP.blocks.toggleFormFields()">
                <option value="">— Seleccionar tipo —</option>
                <option value="TEXTO">Texto</option>
                <option value="TABLA_COMPARATIVA">Tabla Comparativa</option>
                <option value="CUESTIONARIO">Cuestionario</option>
                <option value="EJERCICIO_DIDACTICO">Ejercicio Didáctico</option>
                <option value="FORMULARIO">Formulario</option>
                <option value="FORMULARIO_PAREJA">Formulario Pareja</option>
                <option value="VIDEO_YOUTUBE">Video YouTube</option>
            </select>
        </div>
        <div class="vmp-field">
            <label for="blk_orden">Orden</label>
            <input type="number" id="blk_orden" name="orden" value="0" min="0">
        </div>
    </form>

    <div id="vmp-block-json-fields"></div>

    <div class="vmp-form-actions">
        <button type="button" class="button" onclick="VMP.closeModal()">Cancelar</button>
        <button type="button" class="button button-primary" onclick="VMP.blocks.save()">Guardar bloque</button>
    </div>
</div>
