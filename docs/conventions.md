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
