# Teacher guide

## Before class

This is a Java Edition lab for ages 10–15. Students change names and a private credential; they do not edit source code. The requested default now uses each student's own OpenRouter API key. This adds supervised account/credit preparation. A teacher gateway remains available when individual provider accounts are inappropriate.

Do not distribute the lab as classroom-ready until the critical checks in [TEST-REPORT.md](TEST-REPORT.md) are complete. In particular, automated protocol players are distinct from observing a student use the graphical Minecraft client.

Use legally obtained Minecraft Java installations and appropriate accounts. Review [Minecraft's EULA](https://www.minecraft.net/en-us/eula), school rules, and provider account requirements before enrolling children. Do not ask children to bypass age restrictions or enter payment details unsupervised. No server or game binaries are included in this repository.

Prepare on each Windows workstation:

1. Minecraft Java **1.21.11**, already able to launch. Bedrock and Education Edition are incompatible.
2. Node.js **24 LTS**, npm and Git. The exact tested versions appear in the report. Install/update these through the school's normal process, before class.
3. The repository, installed once with `setup.bat`. The script downloads only pinned project dependencies and does not execute dependency lifecycle scripts.
4. A teacher-prepared Minecraft practice server. Students never install Java or configure this server themselves.
5. A `classroom-config.txt` copied from the example. Keep the default local address and version for the workstation server.
6. A supervised OpenRouter key with a small **non-resetting per-key credit limit**, or a teacher gateway token. The key belongs in `.env` only.

Internet access is needed for initial npm downloads, Minecraft account services as applicable, and OpenRouter at runtime. Local gameplay uses TCP **127.0.0.1:25585**. The repository never changes firewall rules or opens router ports.

## Prepare and start a local server

The preparation script copies an existing Paper 1.21.11 distribution and its already-accepted EULA into a new `.local/server` directory. It deliberately leaves existing worlds, plugins, identities and settings behind. It refuses to overwrite an existing lab server.

From PowerShell in this project folder, use your actual existing server folder and Java executable:

```powershell
.\teacher\prepare-server.ps1 -SourceServer '<EXISTING_PAPER_1.21.11_FOLDER>' -JavaExe '<JAVA_EXECUTABLE>'
```

Replace the angle-bracket placeholders. This is instructor setup, not a student command. If no suitable source server exists, obtain Paper 1.21.11 from [PaperMC](https://papermc.io/downloads/paper), follow its installation instructions and personally review/accept the Minecraft EULA. Do not download a different protocol version and assume it is compatible. An existing Java 25 installation was used here; no Java installation was performed by this task.

The resulting server is bound to **127.0.0.1 only**, with offline authentication for isolated local testing, RCON/query/management disabled, peaceful difficulty and adventure mode. It is not a classroom LAN server. The bot configuration refuses offline connections to any other hostname/address.

Start it in a teacher terminal:

```text
node teacher/start-server.js
```

Wait for `Done`. For a new flat world, type these commands **in the server console**, one at a time:

```text
forceload add -40 -40 40 40
fill -40 63 -40 40 63 40 minecraft:grass_block
setworldspawn 0 64 0
time set day
```

Wait a few seconds after `forceload` before `fill`. Confirm a successful fill; if it says the position is not loaded, wait and repeat `fill`. The platform is intentionally at Y=64 so the student examples work. Join it before class and check that players stand on the grass, not fall through empty space. This exact setup error was encountered and fixed during testing.

For this PC, the isolated server is already prepared. Use `.local/runtime.json` to locate it. That ignored file records the actual Java executable, avoiding a hanging Java launcher found on PATH. Do not distribute this machine-specific file unchanged to other PCs.

## Individual OpenRouter keys — default requested workflow

Students follow the Greek guide with instructor/guardian supervision:

1. Use [OpenRouter API Keys](https://openrouter.ai/settings/keys) to create a key dedicated to this lab.
2. Set a small non-resetting credit cap, for example $1. Confirm it before using the key. Arrange credits through the responsible adult/school account.
3. `setup.bat` creates `.env` from the safe example. Save the private key as `OPENROUTER_API_KEY=...` there. Never paste it into Minecraft chat, AI chat, a terminal command, README or GitHub.
4. Keep `AI_MODE=openrouter` in the teacher-prepared `classroom-config.txt`. The URL and model are already specified. `AI_TOKEN` stays empty in this mode.
5. Double-click `START-BOT.bat`. If it says AI unavailable, check credits, key validity, the provider service and connectivity.

The selected model is `openai/gpt-4.1-mini`. On the documentation check date, its listed token prices were $0.40/million input and $1.60/million output. For illustration, 500 input + 100 output tokens is approximately $0.00036 before any additional charges. This is an estimate, not a spending guarantee. Check current pricing and actual usage. [Model](https://openrouter.ai/openai/gpt-4.1-mini) · [Credit limits](https://openrouter.ai/docs/api/reference/limits)

Each accepted instruction makes one request; there are no automatic retries. Input is limited to 240 characters and output to 180 tokens. One request can be in flight per bot, with a four-second interval. A provider key's dollar cap is the authoritative spending control in direct mode; a student can edit their own local code, so local client limits are not an account security boundary.

The `.env` file is plaintext, excluded from normal Git tracking. Use separate OS accounts with private folders. Do not sync or hand out the instructor's working directory. A key shared in chat must be revoked and replaced, even if the code never logs it. The development key supplied during this task needs that rotation after testing.

## Optional teacher-managed AI gateway

Use this when students should have no provider key/account/payment setup. Run the gateway on a teacher-controlled machine. The `.env` on that machine contains the teacher's capped OpenRouter key. Only the gateway reads it.

In a fresh teacher copy with no existing `classroom-config.txt` or `.local/teacher.json`, run:

```text
node teacher/provision.js
npm run gateway
```

Provisioning creates an eight-hour access token, `.local/teacher.json`, `.local/usage.json`, and a private `classroom-config.txt` for one local seat. It refuses to overwrite existing credentials or budgets. Existing direct-mode configurations can be kept in a separate private copy when preparing the gateway.

For additional seats:

```text
node teacher/add-seat.js seat01 https://ai.school.example/interpret
```

Replace the URL with a real school-managed HTTPS endpoint. The script writes `.local/seats/seat01/classroom-config.txt` and stores only its token hash in the teacher configuration. Transfer that seat file privately to the workstation; never transfer the teacher `.env`. Stop and restart the gateway to load added/revoked credentials. The included gateway listens on **127.0.0.1:8787**. A trusted, school-managed HTTPS reverse proxy is necessary for remote workstations; this repository does not install, expose or deploy one. Do not bind the HTTP gateway directly to a LAN interface to skip TLS.

Gateway controls:

- Explicit token allowlist and a fixed expiration; no anonymous interpretation.
- One request in flight per token, at most two globally, four-second per-token cooldown.
- Fixed model/prompt/tool schema; clients cannot choose models or provider URLs.
- 100 requests per seat and 100 globally by default. Edit teacher limits deliberately before a class (e.g. 20 seats × 30 instructions = 600 requests). Limits are counts, not dollars; also cap the real provider key.
- A persistent usage ledger, reserved before calling the provider. Failed paid attempts still consume a request. Missing/corrupt ledgers fail startup instead of silently resetting usage.
- Validated output and bounded request/response sizes. No arbitrary tools, code or game commands.

Run a single gateway process per ledger. Do not reset the ledger during a lesson to bypass a limit. Revoke a seat by removing its token hash and restarting the gateway. Expiry applies on the next request; an already-running request may finish. A copied token grants that seat's remaining quota, so treat seat files as private too.

## Multiple students and Minecraft authentication

**Simplest default:** a teacher-prepared loopback server per workstation. Each student sees their own bot; offline identities cannot be impersonated by a remote workstation because the server never listens on the network. The logged-in OS user and local software are trusted. Use distinct player and bot names. The student should not have administrative server-console access in a managed class.

**Shared classroom world:** use an authenticated Minecraft server (`online-mode=true`), a whitelist and a controlled school network. Configure each bot with `MC_AUTH=microsoft`, a unique `BOT_ACCOUNT`, and the authorized student's `PLAYER_UUID`. Mineflayer's account sign-in must be completed by the account owner before class. The cached account data under `.local/auth-cache` is private. The bot's display identity comes from that account; `BOT_NAME` cannot rename an authenticated account.

A simultaneous bot is a separate game client. Plan distinct valid Java accounts for the human players and bot identities; do not assume one account can join twice. Verify licensing/provisioning with the school before purchasing anything. Online-mode behavior and a multi-student classroom load were not validated by the loopback tests.

The agent trusts the server's protocol sender UUID, not text that looks like a username. A forged system chat message cannot control it. Keep servers/plugin administrators trusted. Students are not operators. Adventure mode and disabled bot digging/building help protect the practice area; world protections and classroom supervision remain the teacher's responsibility.

Start with 2–4 seats, then test your actual class size. Each local server is capped at a 2 GB Java heap; the game client and Node process need additional RAM. A 32 GB workstation was inspected, but that is not a measured class capacity claim. Shared server sizing, HTTPS proxy capacity and school Wi-Fi reliability require a pilot.

## Reset, troubleshoot and shut down

- Use `!stop` immediately if behavior is confusing. It works without OpenRouter.
- End a bot with Ctrl+C. Restart `START-BOT.bat`; the new spawn establishes its movement boundary.
- The bot stops on lost player visibility, death/disconnection, timeout or distance violation. Reconnection is deliberate, using the launcher; there is no endless login/retry loop.
- Stop a server cleanly by typing `stop` in its console. Wait for Java to finish saving before moving/resetting a world.
- To reset the disposable lab, stop services and make a backup of `.local/server` first. Prepare a new lab directory or move the old world aside; keep credentials and provider quotas separate. Never delete an existing personal Minecraft world.
- Check [Greek troubleshooting](TROUBLESHOOTING-GR.md) for the failures observed here. Transient provider errors are surfaced without crashing; the user retries deliberately.
- At the end, stop the gateway, revoke temporary provider keys/seat tokens, remove unnecessary private config copies and auth caches through the school's cleanup process, and clear transient chat/server logs containing student identifiers. Do not include those files in Git or the distribution ZIP.

## Pre-class checklist

- [ ] Test report's critical gaps closed on the target classroom setup.
- [ ] Minecraft 1.21.11 opens; multiplayer is permitted for the student accounts.
- [ ] Local server starts, floor exists at Y=64, and port 25585 is free.
- [ ] Fresh `setup.bat` succeeds or the teacher already installed dependencies.
- [ ] Student names and private `.env` or seat credentials are prepared.
- [ ] OpenRouter key limits, credits and current model access verified.
- [ ] Follow, stop, coordinates, unsupported request and restart verified in the graphical client.
- [ ] No offline server is exposed to the LAN/internet; shared services use authentication/TLS.
- [ ] A shutdown/reset plan and backup are available.

## Suggested 40-minute lesson

| Time | Activity |
|---|---|
| 0–5 min | Explain instruction → model → tool → action → feedback. |
| 5–12 min | Configure names and private key; supervised security check. |
| 12–20 min | Start, join, follow, stop, coordinates. |
| 20–30 min | Try alternative phrasing, Greek, unsupported actions and blocked paths. |
| 30–35 min | Compare what the model chose with what actually happened. |
| 35–40 min | Discuss limitations, stop services, review usage and revoke temporary keys. |

Account creation and credit purchasing should happen before the lesson. If that is impractical, use the teacher gateway option.
