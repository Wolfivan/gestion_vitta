<?php defined('ABSPATH') || exit; ?>
<h1>Planes <button type="button" class="button button-primary" id="vma-new-plan">Nuevo plan</button></h1>
<div class="vma-card">
    <div id="vma-plans"><p class="vma-empty">Cargando planes...</p></div>
</div>
<div class="vma-card">
    <h2>Matriz de accesos</h2>
    <p class="vma-help">Marca qué features incluye cada plan y guarda la columna. El plan default suma para todas las personas, también invitados.</p>
    <p class="vma-help">Para que un tema, bloque o categoría sea exclusivo de un plan: crea en Features una de tipo contenido, márcala aquí en ese plan y elígela en el plugin de psicoeducación.</p>
    <div id="vma-matrix"></div>
</div>
