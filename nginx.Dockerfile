FROM nginx:1.28.2
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY nginx-routes.conf /etc/nginx/templates/routes/routes.conf.template
