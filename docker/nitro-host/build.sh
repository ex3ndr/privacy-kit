#!/bin/bash
set -e

# Define variables
IMAGE_NAME="public.ecr.aws/g7d0a3u1/nitro/host"
IMAGE_TAG="v6"

# Build directory path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building Docker image for $IMAGE_NAME:$IMAGE_TAG..."

# Check if buildx is available and set up for multi-architecture builds
if ! docker buildx ls | grep -q "multiarch"; then
  echo "Setting up Docker buildx for multi-architecture builds..."
  docker buildx create --name multiarch --driver docker-container --use
fi

# Build for both AMD64 and ARM64 architectures
echo "Building for AMD64 and ARM64 architectures..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t "$IMAGE_NAME:$IMAGE_TAG" \
  -f Dockerfile \
  --push \
  .

echo "Build completed successfully!"