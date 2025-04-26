#!/bin/sh
set -e

# Parameters
ARCH=amd64
IMAGE="public.ecr.aws/g7d0a3u1/nitro/hello:v6"
image_tar="enclave.tar"
image_tag="enclave:latest"
image_eif="enclave.eif"

# Build the enclave docker image reproducibly
rm -f $image_tar
docker run \
    -v $(pwd):/workspace \
	--platform linux/$ARCH \
	gcr.io/kaniko-project/executor:v1.9.2 \
	--reproducible \
	--no-push \
	--tarPath $image_tar \
	--destination $image_tag \
  --dockerfile Dockerfile \
	--build-arg TARGETPLATFORM=linux/$ARCH \
	--build-arg TARGETOS=linux \
	--build-arg TARGETARCH=$ARCH \
	--custom-platform linux/$ARCH

# Print the size and hash of the image
echo "Docker Image size: $(ls -lh $image_tar | awk '{print $5}')"
echo "Docker Image hash: $(sha256sum $image_tar)"

# Export enclave image to EIF file
rm -f $image_eif
docker load -i $image_tar
docker run --rm --privileged \
  --platform linux/amd64 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)":/workspace \
  public.ecr.aws/g7d0a3u1/nitro/cli:v1 \
  nitro-cli build-enclave --docker-uri $image_tag --output-file /workspace/$image_eif

# Export measurements
docker run --rm \
  --platform linux/amd64 \
  -v "$(pwd)":/workspace \
  public.ecr.aws/g7d0a3u1/nitro/cli:v1 \
  sh -c "nitro-cli describe-eif --eif-path /workspace/$image_eif > /workspace/enclave.json"
echo "Enclave size: $(ls -lh $image_eif | awk '{print $5}')"

# Build output image
docker build --platform linux/amd64 -t $IMAGE -f Dockerfile.host .
docker push $IMAGE