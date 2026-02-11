FROM alpine/ollama

RUN apk add --no-cache curl

RUN (ollama serve &) && \
    until curl -s http://localhost:11434/api/tags > /dev/null; do sleep 1; done && \
    ollama pull nomic-embed-text && \
    ollama pull gemma3:1b && \
    pkill ollama

EXPOSE 11434
