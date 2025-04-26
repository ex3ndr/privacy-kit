#!/bin/sh
set -e

# Parameters
ARCH=amd64
IMAGE_NAME="public.ecr.aws/g7d0a3u1/nitro/hello"
IMAGE_TAG="v6"

# Clean up
rm -f "enclave.tar"
rm -f "enclave.eif"

# Build the enclave docker image reproducibly
docker run \
    -v $(pwd):/workspace \
	--platform linux/$ARCH \
	gcr.io/kaniko-project/executor:v1.9.2 \
	--reproducible \
	--no-push \
	--tarPath "enclave.tar" \
	--destination "enclave:latest" \
  --dockerfile Dockerfile \
	--build-arg TARGETPLATFORM=linux/$ARCH \
	--build-arg TARGETOS=linux \
	--build-arg TARGETARCH=$ARCH \
	--custom-platform linux/$ARCH

# Print the size and hash of the image
echo "Docker Image size: $(ls -lh "enclave.tar" | awk '{print $5}')"
echo "Docker Image hash: $(sha256sum "enclave.tar")"

# Export enclave image to EIF file
docker load -i "enclave.tar"
docker run --rm --privileged \
  --platform linux/amd64 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)":/workspace \
  public.ecr.aws/g7d0a3u1/nitro/cli:v1 \
  nitro-cli build-enclave --docker-uri "enclave:latest" --output-file /workspace/enclave.eif

# Export measurements
docker run --rm \
  --platform linux/amd64 \
  -v "$(pwd)":/workspace \
  public.ecr.aws/g7d0a3u1/nitro/cli:v1 \
  sh -c "nitro-cli describe-eif --eif-path /workspace/enclave.eif > /workspace/enclave.json"
echo "Enclave size: $(ls -lh enclave.eif | awk '{print $5}')"

# Build output image
docker build --platform linux/amd64 -t $IMAGE -f Dockerfile.host .
docker push $IMAGE