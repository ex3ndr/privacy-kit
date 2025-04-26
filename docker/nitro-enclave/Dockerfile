FROM public.ecr.aws/docker/library/golang:1.23.0-bookworm@sha256:31dc846dd1bcca84d2fa231bcd16c09ff271bcc1a5ae2c48ff10f13b039688f3 AS daemon-builder

# Build Nitriding Daemon
RUN CGO_ENABLED=0 go install -trimpath -ldflags="-s -w" -buildvcs=false github.com/brave/nitriding-daemon@v1.4.2

# Build Env Client
WORKDIR /build
ADD go.mod .
ADD go.sum .
RUN go mod download
ADD boot.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -buildvcs=false -o boot boot.go
RUN mkdir -p /proxy && cp /build/boot /proxy/boot && rm -rf /build

# Copy Nitriding Daemon
RUN cp /go/bin/nitriding-daemon /proxy/nitriding-daemon
RUN chmod +x /proxy/boot