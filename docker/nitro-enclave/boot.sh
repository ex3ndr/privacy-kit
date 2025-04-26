set -e
/proxy/nitriding-daemon \
    -fqdn localhost \
    -extport 8443 \
    -intport 8081 \
    -appwebsrv "http://localhost:8080" \
    -appcmd "/proxy/env-client $@"