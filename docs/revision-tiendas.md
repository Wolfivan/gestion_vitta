# Código de prueba para revisores de tiendas

App Store y Google Play revisan las funciones de pago o acceso, así que necesitan poder
canjear un código. **El código y la contraseña reales no van al repositorio.**

## Antes de enviar un build que incluya el canje

1. En producción, crea una cuenta de revisión con correo y contraseña propios.
2. En el panel **VM Accesos → Códigos**, crea un código:
   - Etiqueta: `Revisión de tiendas`.
   - Plan: uno de prueba, sin identidad oculta.
   - Cupo amplio y varios canjes por persona: el revisor puede repetir la prueba.
   - Vigencia hasta después de la fecha estimada de aprobación.
3. Anota en **App Store Connect → App Review Information → Notes** y en **Play Console →
   App content → App access** la cuenta, la contraseña, el código y estos pasos:
   1. Inicia sesión con la cuenta de prueba.
   2. Entra a Perfil y toca Redimir.
   3. Escribe el código y toca Canjear.
4. Aclara que la cámara solo se usa para leer el QR y que el código también se puede escribir.

## Después de la aprobación

Desactiva el código. Quien ya canjeó conserva el acceso, y el código ya no sirve para nadie más.
