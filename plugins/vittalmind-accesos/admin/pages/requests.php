<?php defined('ABSPATH') || exit; ?>
<h1>Solicitudes</h1>
<div class="vma-card">
    <div class="vma-filters">
        <select id="vma-filter-estado">
            <option value="">Todos los estados</option>
            <option value="pendiente" selected>Pendiente</option>
            <option value="contactado">Contactado</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
            <option value="cancelada">Cancelada</option>
        </select>
    </div>
    <p class="vma-help">El correo no se envía desde aquí: el enlace abre tu programa de correo.</p>
    <div id="vma-requests"><p class="vma-empty">Cargando solicitudes...</p></div>
    <div id="vma-pagination" class="vma-pagination"></div>
</div>
