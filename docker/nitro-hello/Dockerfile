FROM public.ecr.aws/g7d0a3u1/nitro/enclave:v4 as daemon

# Build app
FROM public.ecr.aws/docker/library/golang:1.23.0-bookworm@sha256:31dc846dd1bcca84d2fa231bcd16c09ff271bcc1a5ae2c48ff10f13b039688f3 as app-builder
WORKDIR /build
ADD main.go .
RUN CGO_ENABLED=0 go build -o app main.go

# Assemble enclave
FROM scratch

# Copy proxy
COPY --from=daemon /proxy /proxy

# Copy app
WORKDIR /app
COPY --from=app-builder /build/app .

# Start the app and proxy
ENTRYPOINT ["/proxy/nitriding-daemon", "-fqdn", "localhost", "-extport", "8443", "-intport", "8081", "-appwebsrv", "http://localhost:8080", "-appcmd", "/proxy/env-client /app/app"]