# Proxy de análisis

Un Worker de Cloudflare que guarda la API key de Groq para que no viaje dentro
del APK.

## Por qué existe

Cualquier variable `EXPO_PUBLIC_*` queda incrustada literalmente en el bundle de
JavaScript que se distribuye. Extraerla no requiere ingeniería inversa:

```
unzip app.apk -d out/
strings out/assets/index.android.bundle | grep gsk_
```

Con este proxy la key vive como secreto de Cloudflare y nunca sale de ahí. La app
solo conoce una URL, que no cuesta dinero si se filtra.

## Desplegar

```bash
cd worker
npm install
npx wrangler login

# La key se guarda cifrada, nunca en wrangler.toml ni en git
npx wrangler secret put GROQ_API_KEY

npx wrangler deploy
```

`wrangler deploy` imprime la URL, del estilo
`https://gym-tracker-analysis.<tu-cuenta>.workers.dev`. Hay que ponerla en **dos
sitios**, porque cada uno cubre un caso distinto:

**1. `.env`** — para `npx expo start` en tu máquina:

```
EXPO_PUBLIC_ANALYSIS_URL=https://gym-tracker-analysis.tu-cuenta.workers.dev
```

**2. `eas.json`**, en el bloque `env` de cada perfil — para las builds de APK/IPA.

Este segundo paso es obligatorio y fácil de olvidar: `.env` está en `.gitignore`,
así que **EAS no lo sube**. Si la URL solo está en `.env`, el APK se compila con
la variable vacía y el análisis aparece como "no disponible" sin ningún error.

Ponerla en `eas.json` es seguro: es un endpoint, no una credencial, y de todas
formas acaba dentro del APK.

Comprueba que responde:

```bash
curl https://gym-tracker-analysis.tu-cuenta.workers.dev/health
# {"ok":true}
```

## Opciones

En `wrangler.toml`, bajo `[vars]`:

| Variable | Efecto |
|---|---|
| `GROQ_MODEL` | Fija el modelo. Si se omite, elige el mejor que ofrezca tu cuenta y se adapta solo cuando Groq retira uno. |
| `APP_TOKEN` | Exige la cabecera `X-App-Token`. La app debe compilarse con el mismo valor en `EXPO_PUBLIC_ANALYSIS_TOKEN`. |

Sobre `APP_TOKEN`: **no es seguridad real**, porque también se extrae del APK.
Sirve para que un escáner que encuentre la URL por casualidad no pueda usarla.
Quien se moleste en abrir el APK podrá.

## Coste y abuso

El plan gratuito de Workers cubre 100.000 peticiones al día; un análisis es una
petición. El riesgo real es que alguien saque la URL del APK y consuma tu cuota
de Groq. Tres cosas lo acotan:

- El Worker es dueño del prompt de sistema. La app solo envía datos de
  entrenamiento, así que el endpoint no sirve como LLM de uso general.
- Rechaza cuerpos de más de 8 KB y cualquier ruta que no sea `POST /analyze`.
- Los límites del plan gratuito de Groq ponen un techo al gasto.

Si algún día se descontrola, rota la key (`wrangler secret put GROQ_API_KEY`) o
cambia el `APP_TOKEN` y recompila la app.

## Cambiar el prompt

El prompt de sistema está en `src/index.ts`, no en la app. Editarlo exige
`npx wrangler deploy`, lo que además lo mantiene versionado junto al proxy.
