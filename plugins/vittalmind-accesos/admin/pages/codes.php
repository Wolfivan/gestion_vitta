<?php defined('ABSPATH') || exit; ?>
<h1>Códigos <button type="button" class="button button-primary" id="vma-new-code">Nuevo código</button></h1>
<div class="vma-card">
    <div class="vma-filters">
        <select id="vma-filter-plan"><option value="">Todos los planes</option></select>
        <select id="vma-filter-activo">
            <option value="">Activos e inactivos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
        </select>
    </div>
    <ul class="vma-help">
        <li><strong>Desactivar</strong> impide nuevos canjes; quien ya canjeó conserva su acceso.</li>
        <li><strong>Revocar</strong> quita el acceso que dio el código a todas las personas que lo canjearon. No borra sus datos ni afecta el acceso que tengan por otra vía, y no se puede deshacer.</li>
        <li><strong>Eliminar</strong> borra el código y solo está disponible si nadie lo canjeó.</li>
    </ul>
    <p class="vma-help">Solo se muestra el total de canjes: nunca quién canjeó ni cuándo.</p>
    <div id="vma-codes"><p class="vma-empty">Cargando códigos...</p></div>
    <div id="vma-pagination" class="vma-pagination"></div>
</div>
