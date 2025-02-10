FROM alpine:3.18.9
RUN mkdir -p /etc/udhcpc ; echo 'RESOLV_CONF="no"' >> /etc/udhcpc/udhcpc.conf
RUN apk add --update nodejs npm su-exec shadow
RUN rm -rf /var/cache/apk/*
WORKDIR /app
COPY ./*.json .
RUN npm ci

COPY ./services ./services
COPY ./views ./views
COPY ./index.tsx .
COPY ./entrypoint.sh .

RUN chmod +x entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
