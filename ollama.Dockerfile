FROM alpine/ollama

RUN apk add --no-cache curl

ARG CHAT_MODEL=gemma3:1b

RUN (ollama serve &) && \
    until curl -s http://localhost:11434/api/tags > /dev/null; do sleep 1; done && \
    ollama pull nomic-embed-text && \
    ollama pull ${CHAT_MODEL} && \
    pkill ollama

EXPOSE 11434
