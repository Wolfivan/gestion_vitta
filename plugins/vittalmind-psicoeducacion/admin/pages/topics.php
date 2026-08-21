<div class="wrap vmp-card-wrap">
    <h1>Temas de Psicoeducación</h1>
    <div class="vmp-notices"></div>

    <div class="vmp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <p style="margin:0;color:#64748b">Los temas pertenecen a una categoría.</p>
            <button class="button button-primary" onclick="VMP.topics.showForm()">+ Nuevo tema</button>
        </div>
        <div class="vmp-field">
            <label for="vmp-topic-filter">Filtrar por categoría</label>
            <select id="vmp-topic-filter" onchange="VMP.topics.loadList()">
                <option value="">Todas las categorías</option>
            </select>
        </div>
        <div class="vmp-table-wrap">
            <table class="vmp-table" id="vmp-topics-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Categoría</th>
                        <th>Descripción breve</th>
                        <th>Autor</th>
                        <th>Bloques</th>
                        <th>Orden</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="vmp-topics-list">
                    <tr><td colspan="8" style="text-align:center;color:#94a3b8">Cargando...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div id="vmp-topic-form" style="display:none">
    <form id="vmp-topic-form-fields">
        <input type="hidden" name="id" value="">
        <div class="vmp-field">
            <label for="top_categoria_id">Categoría *</label>
            <select id="top_categoria_id" name="categoriaId" required>
                <option value="">— Seleccionar categoría —</option>
            </select>
        </div>
        <div class="vmp-field">
            <label for="top_titulo">Título *</label>
            <input type="text" id="top_titulo" name="titulo" required>
        </div>
        <div class="vmp-field">
            <label for="top_descripcion_breve">Descripción breve</label>
            <textarea id="top_descripcion_breve" name="descripcionBreve" rows="3"></textarea>
        </div>
        <div class="vmp-field">
            <label for="top_autor">Autor</label>
            <input type="text" id="top_autor" name="autor" placeholder="Nombre del autor">
        </div>
        <div class="vmp-field">
            <label for="top_orden">Orden</label>
            <input type="number" id="top_orden" name="orden" value="0" min="0">
        </div>
        <div class="vmp-form-actions">
            <button type="button" class="button" onclick="VMP.closeModal()">Cancelar</button>
            <button type="submit" class="button button-primary">Guardar</button>
        </div>
    </form>
</div>
