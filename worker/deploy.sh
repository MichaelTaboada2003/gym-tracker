#!/usr/bin/env bash
#
# Despliega el Worker y cablea la URL resultante en la app.
#
# Existe porque el paso manual es fácil de fallar: la URL hay que ponerla en dos
# sitios (`.env` para desarrollo local y `eas.json` para las builds de EAS) y
# olvidar el segundo produce un APK donde el análisis aparece como no disponible,
# sin ningún error que explique por qué.
#
# Requisito previo, una sola vez:
#   npx wrangler login
#   npx wrangler secret put GROQ_API_KEY

set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"

echo "→ Desplegando el Worker..."
OUTPUT=$(npx wrangler deploy 2>&1) || { echo "$OUTPUT"; exit 1; }
echo "$OUTPUT"

URL=$(printf '%s\n' "$OUTPUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)
if [ -z "$URL" ]; then
    echo
    echo "✗ No pude extraer la URL de la salida de wrangler."
    echo "  Cópiala a mano en .env y en los tres perfiles de eas.json."
    exit 1
fi

echo
echo "→ URL desplegada: $URL"

python3 - "$URL" "$ROOT" <<'PY'
import json, pathlib, re, sys, collections

url, root = sys.argv[1], pathlib.Path(sys.argv[2])

env = root / '.env'
if env.exists():
    text = env.read_text()
    if re.search(r'^EXPO_PUBLIC_ANALYSIS_URL=', text, re.M):
        text = re.sub(r'^EXPO_PUBLIC_ANALYSIS_URL=.*$', f'EXPO_PUBLIC_ANALYSIS_URL={url}', text, flags=re.M)
    else:
        text += f'\nEXPO_PUBLIC_ANALYSIS_URL={url}\n'
    env.write_text(text)
    print('  ✓ .env actualizado (para expo start)')

eas = root / 'eas.json'
cfg = json.loads(eas.read_text(), object_pairs_hook=collections.OrderedDict)
for profile in cfg.get('build', {}).values():
    profile.setdefault('env', collections.OrderedDict())['EXPO_PUBLIC_ANALYSIS_URL'] = url
eas.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + '\n')
print(f"  ✓ eas.json actualizado ({len(cfg.get('build', {}))} perfiles, para las builds)")
PY

echo
echo "→ Comprobando que responde..."
if curl -fsS "$URL/health" | grep -q '"ok":true'; then
    echo "  ✓ El Worker responde correctamente"
    echo
    echo "Listo. Ya puedes compilar:  npx eas build -p android --profile preview"
else
    echo "  ✗ /health no responde. Revisa el despliegue en dash.cloudflare.com"
    exit 1
fi
