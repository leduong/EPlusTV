FROM leduong/php:7.4-fpm

# Cài đặt các package cần thiết
RUN apt-get update && apt-get install -y nginx

# Copy file cấu hình Nginx
COPY ./php/nginx.conf /etc/nginx/sites-available/default

# Copy source code PHP Proxy
COPY ./php/proxy.php /var/www/html/proxy.php
COPY ./php/proxy.sh /proxy.sh

# Phân quyền thực thi script
RUN chmod +x /proxy.sh
RUN touch /var/log/php_proxy.log && chmod 777 /var/log/php_proxy.log

# Mở cổng 3000
EXPOSE 3000

# Chạy proxy
CMD ["/proxy.sh"]
