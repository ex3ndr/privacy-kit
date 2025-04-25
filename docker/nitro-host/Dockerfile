FROM public.ecr.aws/docker/library/amazonlinux:2 AS builder
RUN amazon-linux-extras install -y aws-nitro-enclaves-cli
RUN yum install -y aws-nitro-enclaves-cli-devel jq

# Prepare Nitro Enclaves dependencies
WORKDIR /ne-deps
RUN BINS="\
    /usr/bin/nitro-cli \
    /usr/bin/nitro-enclaves-allocator \
    /usr/bin/jq \
    " && \
    for bin in $BINS; do \
        { echo "$bin"; ldd "$bin" | grep -Eo "/.*lib.*/[^ ]+"; } | \
            while read path; do \
                mkdir -p ".$(dirname $path)"; \
                cp -fL "$path" ".$path"; \
            done \
    done
RUN \
    mkdir -p /ne-deps/etc/nitro_enclaves && \
    mkdir -p /ne-deps/run/nitro_enclaves && \
    mkdir -p /ne-deps/var/log/nitro_enclaves && \
    cp -rf /usr/share/nitro_enclaves/ /ne-deps/usr/share/ && \
    cp -f /etc/nitro_enclaves/allocator.yaml /ne-deps/etc/nitro_enclaves/allocator.yaml

FROM public.ecr.aws/docker/library/golang:1.23.0-bookworm@sha256:31dc846dd1bcca84d2fa231bcd16c09ff271bcc1a5ae2c48ff10f13b039688f3 as env-server-builder
WORKDIR /build
ADD env-server.go .
RUN CGO_ENABLED=0 go build -o env-server env-server.go

#
# Main image
#

FROM public.ecr.aws/docker/library/amazonlinux:2
WORKDIR /app
COPY --from=builder /ne-deps/etc /etc
COPY --from=builder /ne-deps/lib64 /lib64
COPY --from=builder /ne-deps/run /run
COPY --from=builder /ne-deps/usr /usr
COPY --from=builder /ne-deps/var /var

# Add gvproxy
ADD https://github.com/containers/gvisor-tap-vsock/releases/download/v0.8.5/gvproxy-linux-amd64 /home
RUN mv /home/gvproxy-linux-amd64 /app/gvproxy
RUN chmod +x /app/gvproxy

# Write boot script
ADD boot.sh /app
RUN chmod +x /app/boot.sh

# Start
ENTRYPOINT ["/app/boot.sh"]
CMD ["/app/enclave.eif"]