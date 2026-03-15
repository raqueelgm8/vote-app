# Vote App (Poetry Slam La Granja)

Aplicación para crear salas de votación con QR, controlar tiempos y mostrar resultados en tiempo real. Pensada para que el admin cree salas, gestione participantes y comparta el QR con los asistentes.

## Descripción del proyecto

Vote App permite crear una sala con opciones de voto, definir el tiempo de votación, compartir un QR y ver el ranking final con porcentajes. La experiencia está optimizada tanto para administración en escritorio como para votación desde móvil.

## Funcionalidades principales

- Crear salas con nombres de candidatos y duración configurable.
- Compartir QR o enlace para que los usuarios voten desde móvil.
- Votación con contador de tiempo y cierre automático.
- Resultados con ranking y barras de porcentaje.
- Administración de salas: listar, entrar, archivar.
- Accesos rápidos tras cerrar una votación (ver resultados / crear sala).
- Interfaz responsive y estilizada con la identidad visual de la app.

## Instalación y arranque

### Requisitos
- Node.js (recomendado 18+)
- Angular CLI (si quieres usar `ng` directamente)

### Instalar dependencias

```bash
npm install
```

### Arrancar en local

```bash
npm start
```

La app se servirá en:

```
http://localhost:4200
```

## Tests y coverage

Ejecutar tests:

```bash
& "C:\Program Files\nodejs\npm.cmd" test -- --watch=false --browsers=ChromeHeadless
```

Con coverage:

```bash
& "C:\Program Files\nodejs\npm.cmd" test -- --watch=false --code-coverage --browsers=ChromeHeadless
```

El informe queda en:

```
coverage/index.html
```

Nota: en Windows puede ser necesario configurar `CHROME_BIN` si Karma no puede lanzar Chrome.

```bash
setx CHROME_BIN "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

## Variables de entorno (Firebase)

Configura Firebase en:

```
src/environments/environment.ts
src/environments/environment.prod.ts
```

Ejemplo mínimo:

```ts
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: '...',
    authDomain: '...',
    projectId: '...',
    storageBucket: '...',
    messagingSenderId: '...',
    appId: '...'
  }
};
```

Para permitir login desde dominios externos (ngrok), añade el dominio en Firebase Console:
`Authentication` > `Settings` > `Authorized domains`.

## Despliegue / ngrok

Para probar desde móvil o fuera de la red local:

1. Arranca la app en local:
   ```bash
   npm start
   ```

2. Lanza ngrok:
   ```bash
   ngrok http 4200
   ```

3. Usa la URL HTTPS generada por ngrok.

4. Añade el dominio `*.ngrok-free.dev` en Firebase (dominios autorizados).

Con eso podrás abrir el QR desde cualquier dispositivo.
