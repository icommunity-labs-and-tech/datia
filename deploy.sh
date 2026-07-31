#!/bin/bash
# Deploy script for the Datia Cloud Run service.
# Can be run from anywhere — always builds from this script's own directory,
# never from the shell's current working directory (avoids ever deploying
# the wrong repo if invoked from a sibling checkout like certypass).
#
# Usage:
#   ./deploy.sh
#
# Always builds the Docker image locally and pushes it — never uses
# `gcloud builds submit`, to avoid Cloud Build usage/costs.

set -e

PROJECT=icommunity-1727620636012
REGION=europe-southwest1
SERVICE=digipass-datia
IMAGE="gcr.io/$PROJECT/digipass-datia"

# Resolve to this script's own directory, regardless of caller's cwd
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "▶ [datia] Building (context: $DIR)..."
docker build --platform linux/amd64 -t "$IMAGE" "$DIR"

echo "▶ [datia] Pushing..."
docker push "$IMAGE"

echo "▶ [datia] Deploying to Cloud Run ($REGION)..."
gcloud run deploy "$SERVICE" --image "$IMAGE" --project "$PROJECT" --region "$REGION"

echo ""
echo "✅ [datia] Done"
