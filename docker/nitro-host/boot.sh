#!/bin/bash
set -e

# Configuration with defaults
DEBUG_MODE=${DEBUG_MODE:-false}
CPU_COUNT=${CPU_COUNT:-1}
MEMORY_SIZE=${MEMORY_SIZE:-256}

#
# Proxy
#

echo "Starting proxy application..."
/app/gvproxy -listen vsock://:1024 -listen unix:///tmp/network.sock &
sleep 2

echo "Configuring port forwarding..."
curl \
  --unix-socket /tmp/network.sock \
  http:/unix/services/forwarder/expose \
  -X POST \
  -d '{"local":":8443","remote":"192.168.127.2:8443"}'

#
# Env server
#

echo "Starting env server..."
/app/env-server &
sleep 2

#
# Enclave
#

echo "Starting enclave..."
echo "Using CPU count: $CPU_COUNT, Memory: $MEMORY_SIZE MB"

# Run the enclave
if [ "$DEBUG_MODE" = "true" ]; then
  echo "Debug mode enabled with console attached"

  # In debug mode with attached console, this will block until enclave finishes
  nitro-cli run-enclave \
    --cpu-count $CPU_COUNT \
    --memory $MEMORY_SIZE \
    --eif-path /app/enclave.eif \
    --debug-mode \
    --attach-console
else
  echo "Debug mode disabled"

  # In non-debug mode, run enclave in background and monitor
  nitro-cli run-enclave \
    --cpu-count $CPU_COUNT \
    --memory $MEMORY_SIZE \
    --eif-path /app/enclave.eif
    
  echo "Waiting for enclave to complete (monitoring)..."
  
  # Monitor enclaves until none are running
  while true; do
    # Check if any enclaves are running
    # if ! nitro-cli describe-enclaves | grep -q "\"State\": \"RUNNING\""; then
    #   echo "No running enclaves detected. Exiting."
    #   break
    # fi
    # echo "Enclave still running... (waiting)"

    nitro-cli describe-enclaves

    sleep 10
  done
fi

