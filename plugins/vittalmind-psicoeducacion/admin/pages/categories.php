<div class="wrap vmp-card-wrap">
    <h1>Categorías de Psicoeducación</h1>
    <div class="vmp-notices"></div>

    <div class="vmp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <p style="margin:0;color:#64748b">Gestiona las categorías de contenido psicoeducativo.</p>
            <button class="button button-primary" onclick="VMP.categories.showForm()">+ Nueva categoría</button>
        </div>
        <div class="vmp-table-wrap">
            <table class="vmp-table" id="vmp-categories-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Slug</th>
                        <th>Descripción</th>
                        <th>Temas</th>
                        <th>Orden</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="vmp-categories-list">
                    <tr><td colspan="7" style="text-align:center;color:#94a3b8">Cargando...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div id="vmp-category-form" style="display:none">
    <form id="vmp-category-form-fields">
        <input type="hidden" name="id" value="">
        <div class="vmp-field">
            <label for="cat_titulo">Título *</label>
            <input type="text" id="cat_titulo" name="titulo" required>
        </div>
        <div class="vmp-field">
            <label for="cat_slug">Slug *</label>
            <input type="text" id="cat_slug" name="slug" required pattern="[a-z0-9-]+">
            <div class="vmp-help">Solo letras minúsculas, números y guiones. Ej: <code>relaciones-pareja</code></div>
        </div>
        <div class="vmp-field">
            <label for="cat_descripcion">Descripción</label>
            <textarea id="cat_descripcion" name="descripcion" rows="3"></textarea>
        </div>
        <div class="vmp-field">
            <label for="cat_icono">Icono (emoji o identificador)</label>
            <input type="text" id="cat_icono" name="icono" placeholder="ej: heart">
        </div>
        <div class="vmp-field">
            <label for="cat_orden">Orden</label>
            <input type="number" id="cat_orden" name="orden" value="0" min="0">
        </div>
        <div class="vmp-form-actions">
            <button type="button" class="button" onclick="VMP.closeModal()">Cancelar</button>
            <button type="submit" class="button button-primary">Guardar</button>
        </div>
    </form>
</div>
