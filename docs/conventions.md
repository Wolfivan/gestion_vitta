# Convenciones de código

> Homogeneidad extrema. La IA predice mejor cuando el repositorio se parece
> a sí mismo en todas partes.

## Estilo TypeScript

- **Versión:** TypeScript 5.0+ con `strict: true` en tsconfig.
- **Formato:** Prettier con printWidth 100, singleQuote, trailingComma all.
- **Imports:** Orden: externos → internos absolutos → relativos. Un grupo separado por blank line.
- **Strings:** `'comillas simples'` siempre. Dobles solo para JSON strings.
- **Template literals** para interpolación. Nada de concatenación con `+`.

## Nombres

| Tipo                    | Convención        | Ejemplo                     |
|-------------------------|-------------------|-----------------------------|
| Archivos (App)          | `kebab-case`      | `panic-button.tsx`          |
| Archivos (Backend)      | `kebab-case`      | `auth-controller.ts`        |
| Componentes             | `PascalCase`      | `PanicButton`               |
| Hooks                   | `camelCase` prefijo `use` | `useAuth`         |
| Servicios               | `camelCase`       | `authService`               |
| Funciones/variables     | `camelCase`       | `getSession`                |
| Constantes              | `UPPER_SNAKE`     | `API_BASE_URL`              |
| Interfaces              | `PascalCase` prefijo `I` | `IAuthResponse`      |
| Tipos                   | `PascalCase` prefijo `T` | `TUserSession`       |
| Archivos de test        | `*.test.ts`       | `auth-service.test.ts`      |

## Estructura de archivo (Backend)

```typescript
import { Request, Response } from 'express';
import { authService } from '@/services/auth-service';
import { handleError } from '@/utils/error-handler';

export const authController = {
  async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      const result = await authService.verifyGoogleToken(token);
      res.json(result);
    } catch (error) {
      handleError(res, error);
    }
  },
};
```

## Estructura de archivo (Frontend)

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/button';

interface Props {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<Props> = ({ onSuccess }) => {
  const { login, isLoading } = useAuth();

  return (
    <View>
      <Button
        title="Iniciar sesión con Google"
        onPress={login}
        disabled={isLoading}
      />
    </View>
  );
};
```

## Tests

- Un archivo de test por módulo: `*.test.ts` junto al módulo o en `__tests__/`.
- Usar Jest + React Native Testing Library (frontend) o Supertest (backend).
- Nombres descriptivos: `describe('authService')` / `it('returns JWT when token is valid')`.
- No usar mocks de módulos externos a menos que sea estrictamente necesario.
- Usar `beforeEach` para limpiar estado entre tests.

## Manejo de errores

- Backend: errores del dominio lanzan excepciones nombradas.
- Backend: middleware global captura errores y devuelve JSON estructurado.
- Frontend: hooks atrapan errores y exponen `error` + `isError` al componente.
- Nunca propagar stack traces al usuario.

## Comentarios

Por defecto **no** se escriben. Solo se permiten cuando explican un *por qué*
no obvio (workaround documentado, invariante sutil). Los nombres deben
hacer el resto.

## Colores y UI

- Todo color de la interfaz se referencia con un token de `@/constants`
  (`COLORS`). Prohibido escribir hex/rgba literales en componentes o pantallas.
- Cambiar o limitar la paleta se hace solo desde `App/src/constants/index.ts`.
- El test `App/__tests__/palette-guard.test.ts` falla si aparece un color no
  declarado en la paleta.

## Animaciones SVG con Reanimated

Reglas para escalar o rotar elementos de `react-native-svg` desde
`useAnimatedProps`. Verificadas contra `react-native-svg@15.15.4`
(`lib/commonjs/lib/extract/extractTransform.js`).

- **No usar la prop `origin` para escalar.** Solo se aplica cuando `scale` /
  `rotation` van como *props*. Si el scale viaja dentro del prop `transform` — que
  es justo lo que hace `useAnimatedProps` — se ignora **en silencio** y el
  elemento escala sobre `(0, 0)`.
- **No escribir `origin` como `"x y"` separadas por espacio.** `universal2axis`
  solo hace `split(/,/)`, de modo que `"200 120"` se convierte en `NaN` y
  `extractTransform` devuelve el origen `(0, 0)`. Si aun así se usa, sería
  `"200,120"`, y solo en el caso del punto anterior.
- **Patrón correcto: ancla en un `<G>` padre *plano* + coordenadas locales.** El
  elemento se dibuja en `(0, 0)` y se coloca con un `<G translateX={x}
  translateY={y}>` **que no recibe `animatedProps`**. La matriz resultante es
  `translate(ancla) · scale(s)`, que escala sobre el ancla sin depender de
  `origin`. Es la forma de replicar el `transform-origin` de CSS:

  ```tsx
  <G translateX={200} translateY={170}>
    <AnimatedCircle cx={0} cy={0} r={45} animatedProps={dropProps} />
  </G>
  ```

- **El `<G>` de anclaje debe ser plano: nunca pongas `translateX` / `translateY` /
  `origin` en el mismo elemento que recibe `animatedProps`.** Es la trampa más
  silenciosa de las tres, y da un síntoma engañoso: al montar se ve bien, y en el
  primer frame el elemento se va a la esquina. La razón es que `G` sobrescribe
  `setNativeProps` y hace `matrix = extractTransform(props)` con **solo las props
  animadas** (`{ transform, opacity }`), así que sobrescribe la matriz que
  `extractProps` había calculado con todas las props. Medido:

  | momento | props que ve `extractTransform` | matrix |
  |---|---|---|
  | montaje | `{ translateX, translateY, transform }` | `[s, 0, 0, s, 200, 170]` |
  | frame | `{ transform }` | `[s, 0, 0, s, 0, 0]` ← se pierde el offset |

  Como el `<G>` plano nunca recibe `animatedProps`, su `matrix` se calcula una vez
  y nadie la vuelve a tocar, así que el ancla sobrevive a todos los frames.

- **El array `transform` se compone en el orden de CSS.** Con
  `[{ scale }, { translateY: 550 }]` el desplazamiento **neto** es `scale * 550`
  (`0.2 * 550 = 110`), no 550. Para reproducir un `transform: scale(s)
  translateY(t)` de una hoja de estilos hay que conservar ese orden.
- **Al portar los keyframes de un SVG**, ojo a dos cosas: el `transform` de CSS se
  compone en orden inverso al leído, y el frame final suele venir implícito
  (`100% { opacity: 0 }` sin repetir el `transform`).

### Qué pueden y qué no pueden ver los tests

El mock de `react-native-svg` en `App/jest.setup.ts` sustituye cada elemento por
un string (`'GMock'`, `'CircleMock'`…). Eso permite afirmar la **estructura** del
JSX, pero **nunca ejecuta `setNativeProps` ni calcula una `matrix`**, así que
ningún test de este repo detecta por sí solo un anclaje perdido. Para eso hay dos
complementos, ambos en
`App/__tests__/gratitude-flower-animation.test.tsx`:

- Un guard estructural: ningún nodo con `animatedProps` puede llevar `translateX`,
  `translateY`, `origin`, `originX`, `originY` ni `matrix`.
- Un `require` por ruta profunda a `extractTransform.js`, que el mock no
  intercepta, para codificar la tabla de la fila anterior.

Un test puede confirmar que el JSX tiene la forma correcta, no que la pantalla se vea
bien.

Caso aplicado y su test de regresión:
`App/src/components/gratitude-flower-animation.tsx` y
`App/__tests__/gratitude-flower-animation.test.tsx`.
