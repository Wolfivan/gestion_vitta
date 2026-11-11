<?php defined('ABSPATH') || exit; ?>
<h1>Planes <button type="button" class="button button-primary" id="vma-new-plan">Nuevo plan</button></h1>
<div class="vma-card">
    <div id="vma-plans"><p class="vma-empty">Cargando planes...</p></div>
</div>
<div class="vma-card">
    <h2>Matriz de accesos</h2>
    <p class="vma-help">Marca qué features incluye cada plan y guarda la columna. El plan default suma para todas las personas, también invitados: lo que incluye aparece marcado y fijo en los demás planes. Si cambias el default, guarda su columna para verlo reflejado en el resto.</p>
    <p class="vma-help">Para que un tema, bloque o categoría sea exclusivo de un plan: crea en Features una de tipo contenido, márcala aquí en ese plan y elígela en el plugin de psicoeducación.</p>
    <p id="vma-matrix-dirty" class="vma-dirty-notice" role="status" style="display:none"></p>
    <div id="vma-matrix"></div>
</div>
