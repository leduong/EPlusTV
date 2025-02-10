# Sử dụng base image Golang để build ứng dụng
FROM golang:1.22-alpine AS builder

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy mã nguồn và build binary
COPY ./golang .
RUN go mod tidy
RUN go build -o server .

# Sử dụng image nhỏ hơn để chạy ứng dụng
FROM alpine:latest
COPY --from=builder /app/server /server

# Đảm bảo quyền thực thi
RUN chmod +x /server

# Mở cổng ứng dụng
EXPOSE 3000

# Chạy ứng dụng
CMD ["/server"]
