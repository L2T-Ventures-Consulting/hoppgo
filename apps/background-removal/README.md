# Background removal service

Private CPU sidecar used by Louez to remove product-image backgrounds with
MIT-licensed `rembg` and the Apache-2.0 U²-Net family. Its small FastAPI wrapper
intentionally excludes rembg's optional Gradio UI and dependencies.

The default `u2netp` model is the low-memory profile: it is especially effective
after GPT has already produced a pure white background and remains deployable on
a small CPU instance (roughly 450 MB loaded in the tested container). A
higher-capacity rembg model can be baked in through the build argument below,
but the web and sidecar model names must always match.

Build and run it locally:

```bash
docker build -f apps/background-removal/Dockerfile -t louez-background-removal .
docker run --rm \
  -e BACKGROUND_REMOVAL_API_TOKEN=replace-with-at-least-32-characters \
  -p 127.0.0.1:7000:7000 \
  louez-background-removal
```

Release tags publish the same image as
`synapsr/louez-background-removal:<version>`. The root Compose stack pulls it
automatically with the same `LOUEZ_IMAGE_TAG` as the web image.

Example for a larger worker:

```bash
docker build \
  --build-arg REMBG_MODEL=birefnet-general-lite \
  -f apps/background-removal/Dockerfile \
  -t louez-background-removal .
```

Then configure the web app:

```dotenv
AI_IMAGE_BACKGROUND_REMOVAL_URL=http://127.0.0.1:7000
AI_IMAGE_BACKGROUND_REMOVAL_TOKEN=replace-with-the-same-32-character-token
# Only when a non-default model was baked into the image:
# AI_IMAGE_BACKGROUND_REMOVAL_MODEL=birefnet-general-lite
```

When `BACKGROUND_REMOVAL_API_TOKEN` is configured, `/api/remove` requires the
same value as a Bearer token. `/health` remains public for container
orchestrators. Tokens shorter than 32 characters make the worker fail fast.

Authentication is optional for backward-compatible private-network installs,
but mandatory operationally whenever the worker is reachable publicly. Prefer
a private application network in production even when Bearer authentication is
enabled.
