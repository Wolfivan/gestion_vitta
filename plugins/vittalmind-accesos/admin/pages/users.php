<?php defined('ABSPATH') || exit; ?>
<h1>Usuarios</h1>
<div class="vma-card">
    <div class="vma-filters">
        <input type="search" id="vma-search" placeholder="Buscar por nombre o correo">
        <select id="vma-filter-plan"><option value="">Todos los planes</option></select>
        <select id="vma-filter-vencimiento">
            <option value="">Cualquier vencimiento</option>
            <option value="vigente">Con fecha vigente</option>
            <option value="vencido">Vencido</option>
            <option value="sin">Sin vencimiento</option>
        </select>
        <button type="button" class="button" id="vma-apply">Filtrar</button>
    </div>
    <p class="vma-help">Las personas con un plan de identidad oculta no aparecen en la búsqueda por nombre o correo: se encuentran filtrando por plan.</p>
    <div id="vma-users"><p class="vma-empty">Cargando usuarios...</p></div>
    <div id="vma-pagination" class="vma-pagination"></div>
</div>
