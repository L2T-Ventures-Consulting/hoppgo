# Background removal service

Private CPU sidecar used by Louez to remove product-image backgrounds with
MIT-licensed `rembg`. Its small FastAPI wrapper intentionally excludes rembg's
optional Gradio UI and dependencies.

The worker owns its model choice: the web app only sends image bytes. The default
`isnet-general-use` model handles product details such as wheel spokes and
transparent openings more reliably than the former lightweight default. A
different rembg model can be baked into the image with the single build argument
below.

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

Example with a different model:

```bash
docker build \
  --build-arg REMBG_MODEL=u2netp \
  -f apps/background-removal/Dockerfile \
  -t louez-background-removal .
```

Then configure the web app:

```dotenv
AI_IMAGE_BACKGROUND_REMOVAL_URL=http://127.0.0.1:7000
AI_IMAGE_BACKGROUND_REMOVAL_TOKEN=replace-with-the-same-32-character-token
```

The model is deliberately absent from the web configuration and from the HTTP
request. In EasyPanel, `REMBG_MODEL` is the only model setting and belongs to the
background-removal service's build arguments. The Dockerfile persists that same
value for the worker runtime and preloads its weights while building.

When `BACKGROUND_REMOVAL_API_TOKEN` is configured, `/api/remove` requires the
same value as a Bearer token. `/health` remains public for container
orchestrators. Tokens shorter than 32 characters make the worker fail fast.

Authentication is optional for backward-compatible private-network installs,
but mandatory operationally whenever the worker is reachable publicly. Prefer
a private application network in production even when Bearer authentication is
enabled.
