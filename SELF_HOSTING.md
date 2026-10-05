# Self-host Wordfeud Helper behind your existing Caddy

This setup builds **one Wordfeud Helper container** containing the Expo **web** app and its API. Your existing Caddy terminates HTTPS and forwards all paths to the same container; `/api/*` is handled by the API, and other paths by the web app. The browser UI works on a phone or desktop on your network. This container is **not** an Android APK or iOS IPA, and it does not install the app into Expo Go. Native packages require a separate Expo build.

The container does not run an LLM or need GPU access. It connects to your existing OpenAI-compatible model server. Ollama's `qwen3.6:27b` tag includes image input; its Q4_K_M weights and vision projector need most of a 24 GB GPU. Keep the model context modest (try 4K–8K) and test the reviewed screenshots before depending on its OCR. Do not assume its output matches the current model.

## 1. Prerequisites

- Linux Docker Engine with Docker Compose v2.
- A running Caddy, either on the host or connected to a Docker network shared with this container.
- An Ollama server (or another OpenAI-compatible **vision** server) reachable from the app container. With Ollama, pull the model where Ollama is running: `ollama pull qwen3.6:27b`.
- A hostname that resolves to your Caddy machine on your network, with HTTPS usable on the devices that will open the app. For an internal-only hostname, Caddy's `tls internal` requires trusting its CA on those devices.

The Ollama service can be the same one OpenHands uses, but **OpenHands' model setting does not configure this app**. Both clients must reach the model server independently. Do not expose Ollama port 11434 to the internet.

## 2. Clone and configure

```sh
git clone https://github.com/kooijmanknoworries/WFHelper.git
cd WFHelper
cp .env.selfhost.example .env.selfhost
docker network ls
```

Edit `.env.selfhost` (ignored by Git):

| Setting | Purpose |
| --- | --- |
| `CADDY_NETWORK` | Existing Docker network your Caddy container uses; the Compose file defaults to `caddy`. If Caddy runs on the host instead, create/use a private Docker network for the app and let host Caddy connect to `127.0.0.1:8787`. |
| `SCAN_API_BASE_URL` | Model API URL **from inside the app container**, including `/v1`, for example `http://ollama:11434/v1`. |
| `SCAN_API_KEY` | Required by the OpenAI client. Local Ollama ignores it, so `ollama` is a harmless placeholder; if using an authenticated server, set its actual credential locally and do not commit it. |
| `SCAN_MODEL` | Exact model ID served by that endpoint; the Compose example uses `qwen3.6:27b`. |
| `APP_PORT` | Port for host-based Caddy and local health checks; default `8787`. |
| `APP_BIND` | Host interface for the published port. Default `127.0.0.1` (loopback only, for a host Caddy route). Set `0.0.0.0` to expose the web app and `/api/*` on your LAN for browsers and Expo Go. Never publish the model API the same way. |

If your model server runs in Docker on the default `bridge` network, connect it to the shared network so its name resolves for the app: `docker network connect <CADDY_NETWORK> <model-container>`. Docker's embedded DNS only works on user-defined networks; `http://<container-name>:8080/v1` will not resolve if the containers are not on a common user-defined network.

If Caddy runs on the host and no suitable Docker network exists, run `docker network create wfhelper-private` and set `CADDY_NETWORK=wfhelper-private`. This network is for the app and its model connection; host Caddy uses the loopback port instead of Docker DNS.

**If Ollama is in Docker:** connect its *existing* container to the Caddy network if it is not already attached:

```sh
docker network connect YOUR_CADDY_NETWORK YOUR_EXISTING_OLLAMA_CONTAINER
```

Then set `SCAN_API_BASE_URL=http://YOUR_EXISTING_OLLAMA_CONTAINER:11434/v1` (use a name/alias that resolves on that Docker network). Do not start a second Ollama or download the model into the Wordfeud Helper image.

**If Ollama runs on the Linux host:** use `SCAN_API_BASE_URL=http://host.docker.internal:11434/v1`. Docker's host-gateway mapping is configured, but Ollama must listen on an address reachable from the Docker bridge, not only `127.0.0.1` on the host. Limit access to the bridge/firewall; do not open port 11434 to the wider network. Check connectivity from the app container below before diagnosing scan failures.

## 3. Build and start

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yaml up -d --build
docker compose --env-file .env.selfhost -f compose.selfhost.yaml ps
curl -f http://127.0.0.1:8787/api/healthz
curl -I http://127.0.0.1:8787/
```

If `APP_PORT` was changed, replace `8787` in the checks. Verify the model connection from inside the container:

```sh
docker compose --env-file .env.selfhost -f compose.selfhost.yaml exec wordfeud-helper \
  node -e 'fetch(new URL("models", process.env.SCAN_API_BASE_URL.replace(/\/?$/, "/"))).then(r => { console.log("Model API HTTP", r.status); if (!r.ok) process.exit(1) }).catch(e => { console.error(e.message); process.exit(1) })'
```

The web app and API run together on port **8080 inside Docker**. There is no need to give this container GPU access. The public web bundle uses same-origin `/api` requests; the HTTPS dictionary updater uses that same origin, so the Docker image does not embed your hostname.

## 4. Add a route to your existing Caddy

For **Caddy in Docker on `CADDY_NETWORK`**, add a site block to its existing config (do not replace your other sites):

```caddyfile
wordfeud.home.arpa {
    tls internal
    reverse_proxy wordfeud-helper:8080
}
```

For **Caddy installed directly on the host**, use `reverse_proxy 127.0.0.1:8787` instead. If you have a public DNS name and a normal trusted certificate, use that hostname and let your existing Caddy TLS setup handle it; `tls internal` is only an example for private-network names. Point your LAN DNS/hosts entries at the Caddy machine, reload Caddy, and visit `https://wordfeud.home.arpa/` from a device that trusts the certificate.

Restrict access to your LAN or add authentication in Caddy if you make the site reachable more widely. This app does **not** provide user accounts or impose a scan-count limit, so access control must be handled by your network or proxy. Unrestricted scan requests can consume GPU resources or incur charges when using a paid model endpoint. The app port is bound to host loopback by default, and Ollama must not be reverse-proxied publicly.

## 5. Native Android app through Expo Go (development)

The self-hosted container serves the **web** app. For the native app on a phone, run Metro on the machine that hosts the backend, in Expo Go/LAN mode:

```sh
pnpm install --frozen-lockfile
EXPO_PUBLIC_DEV_BACKEND_URL=http://<host-LAN-IP>:<APP_PORT> \
  pnpm --filter @workspace/crosslex run dev:local
```

`dev:local` starts `expo start --go --lan` on port 8081 (override with `EXPO_DEV_PORT`) with no Replit login, Replit domains, or proxy variables. Scan calls and dictionary updates both go to `EXPO_PUBLIC_DEV_BACKEND_URL`; the QR code advertises the machine's LAN address, so open it from a phone on the same network.

HTTP is a development-only option: it is only accepted while `EXPO_PUBLIC_DEV_BACKEND_URL` is set (see `artifacts/crosslex/lib/dev-backend.ts`). Committed and production builds keep the HTTPS-only behaviour of `EXPO_PUBLIC_DOMAIN`, the same-origin pack check, and dictionary checksum validation. Prefer a trusted certificate (e.g. your Caddy hostname) if you can install it on the phone; do not assume Expo Go trusts an internal CA automatically. Never put model credentials in `EXPO_PUBLIC_*` variables.

## 6. Check actual scan quality

The app sends the original screenshot as an image to the configured vision server, then makes a second V/W verification request where needed. It asks for structured JSON (15×15 board plus rack) and expects image input, JSON-format responses, and enough output tokens. OpenAI-compatible implementations vary; in particular, check how your server handles `response_format`, `max_completion_tokens`, and image `detail`. An incomplete V/W audit safely asks for manual confirmation rather than silently solving the wrong board.

The repo contains reviewed screenshots under `attached_assets/scan-fixtures/` (the original private upload is not committed). On the **development machine**, with Node.js 24 and pnpm 10 installed, run:

```sh
pnpm install --frozen-lockfile
SCAN_API_BASE_URL=http://127.0.0.1:11434/v1 \
SCAN_API_KEY=ollama \
SCAN_MODEL=qwen3.6:27b \
pnpm --filter @workspace/api-server run eval:scan-fixtures
```

Use a model-server URL reachable **from the development machine** for this command; Docker service names such as `ollama` may only resolve *inside* the Docker network. This evaluation makes multiple real vision requests and checks I/T, V/W, rack letters, and board consensus; it is not a mock test. Do not treat a successful build or health check as proof that Qwen reads small Wordfeud tiles accurately. If it fails, inspect the mismatches before relying on move advice.

If you want to keep the existing Replit scan service, leave the scanner overrides unset: the code still defaults to `gpt-5.6-terra` with the existing AI integration variables. For self-hosting, **set both** `SCAN_API_BASE_URL` and `SCAN_API_KEY`; partial configuration fails at startup rather than sending a key to the wrong provider.

The optional TaalTik word check contacts that external site. Using local Ollama for screenshots does not make the entire app offline.

## Operations

```sh
# Rebuild from newer repository code:
git pull --ff-only
docker compose --env-file .env.selfhost -f compose.selfhost.yaml up -d --build

# Inspect startup and scan errors:
docker compose --env-file .env.selfhost -f compose.selfhost.yaml logs -f wordfeud-helper
```

If `/api/healthz` works but scanning fails, check connectivity to `/v1/models` from the container, the Ollama model ID, GPU memory, and API logs. If `/settings` fails on a direct browser refresh, check that the container is serving the web export rather than an old image. Avoid pointing the app at `localhost:11434` **inside** the container: that address would refer to the app container, not Ollama.

## Handoff prompt for an assistant on the self-hosted box

> Clone `https://github.com/kooijmanknoworries/WFHelper.git` and read `SELF_HOSTING.md`, `.env.selfhost.example`, `compose.selfhost.yaml`, and `Dockerfile.selfhost`. Build the existing Wordfeud Helper web+API image, not a new app. Discover the existing Caddy Docker network and existing Ollama/OpenAI-compatible vision endpoint; do not create a second Caddy or Ollama instance. Create a local uncommitted `.env.selfhost` with a model endpoint reachable from inside the app container, run the Compose service, add only the required route to the existing Caddy configuration, and verify health, browser access, model connectivity, and a real reviewed screenshot scan. Keep port 11434 private and report any model OCR differences rather than weakening the scanner's checks. The container provides the browser app; native APK/IPA packaging is separate.