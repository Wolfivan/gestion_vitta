# Quality-lite: toolchain reproducible para el gate de calidad.
# El repo se monta en /repo (solo lectura) y se reutilizan las dependencias
# de cada proyecto, que son JavaScript puro (tsc y eslint no ejecutan binarios
# nativos, así que funcionan igual en Linux aunque se instalaran en Windows).
FROM node:20-alpine

# Duplicación de código: se instala en la imagen para no depender del host.
RUN npm install -g jscpd@5.4.2

WORKDIR /repo

ENV HOME=/tmp \
    CI=1 \
    NODE_OPTIONS=--max-old-space-size=2048

USER node

ENTRYPOINT ["node", "/repo/scripts/quality/run-quality.mjs"]
