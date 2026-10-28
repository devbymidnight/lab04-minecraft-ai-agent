# Engineering validation — 28 October 2026

**Readiness: NOT YET APPROVED FOR CLASSROOM USE.** The real-server, real-LLM and fresh-clone Windows-launcher tests pass. The visible Minecraft client check remains unverified because the user stopped Computer Use with Escape. OpenRouter's 18+ eligibility requirement also prevents recommending personal accounts for the intended 10–15 audience. Do not infer a graphical/student usability pass from protocol clients.

## Candidate and environment

New isolated repository `techlabs-minecraft-ai-agent`, branch `main`, version 1.0.0. Runtime candidate **4f94754** was cloned and tested; subsequent changes strengthen the test harness and update documentation/evidence without changing that runtime. No prior starter ZIP was found in the inspected workspace, Downloads or Desktop; this was not an exhaustive search of every disk. Existing Minecraft-Auth-Lab server binaries/cache were reused, without its plugins, worlds, player identities, credentials or configuration. No original server was modified. No Git remote was created or pushed.

| Component | Exact inspected/tested version |
|---|---|
| Windows | Windows 11, NT 10.0.26300, x64 |
| Node.js | 24.14.0 |
| npm | 11.9.0 |
| Git | 2.53.0.windows.2 |
| Java | Oracle Java 25.0.4+7-LTS-189, 64-bit |
| Paper | 1.21.11-132, commit c5eb079 |
| Mineflayer | 4.39.0 |
| mineflayer-pathfinder | 2.4.5 |
| minecraft-protocol | 1.68.0, locked transitive dependency |
| minecraft-data | 3.117.0, locked transitive dependency |
| Final LLM | OpenRouter `openai/gpt-4.1-mini`, live hosted alias tested on this date |
| Earlier LLM | OpenRouter `google/gemini-2.5-flash-lite`; partial gameplay passes, intermittent provider errors/rate limiting |

The paper.jar SHA-256 is `5ffef465eeeb5f2a3c23a24419d97c51afd7dbb4923ff42df9a3f58bba1ccfba`. Hosted model weights/provider internals are not pinned by this repository. Node 24 is maintained, but this existing patch version is not claimed to be the latest patch. A runtime upgrade needs a repeat smoke test.

The machine reported approximately 31.84 GiB RAM and an Intel i7-13700KF. GPU/CIM inspection was blocked by the sandbox; no GPU capacity claim is made. No Ollama runtime, usable model or active local inference endpoint was found. Minecraft client versions including 1.21.11 were present. Ports 11434, 1234, 25565, 25566, 25575 and 25585 accepted no loopback connection during initial inspection. The actual tests bound only 127.0.0.1.

## Commands executed

Environment inspection used Node/npm/Git/Java version commands, targeted file searches, loopback TCP probes and official documentation. The broken default Java launcher was avoided by selecting the existing Java executable in ignored runtime configuration.

```text
npm install --ignore-scripts --no-fund --fetch-retries=0 --fetch-timeout=30000
npm audit --json
npm test
teacher/prepare-server.ps1 -SourceServer <existing server> -JavaExe <existing Java>
node teacher/provision.js
node scripts/live-test.js --movement-only
node scripts/live-test.js
git check-ignore -- .env .local/teacher.json classroom-config.txt
```

Network operations were rerun with approved network access after sandbox DNS/loopback restrictions blocked them. No firewall/security settings were changed. The personal-key workflow superseded the initial gateway default; the provisioned teacher files remain private and optional.

## Automated tests

`npm test`: **9 tests passed, 0 failed** after the final safety changes. Coverage includes explicit tool/argument allowlisting, coordinate bounds, offline loopback restriction, URL credential protection, schema request contract, provider-error redaction, cancellation, authorization, spoofed system messages, duplicate request suppression, runtime limits, disconnects, UUID checks, gateway authentication/cooldown/expiry and persistent quota after restart.

These use simulated AI responses where appropriate; they do not establish model quality. The real-server tests below provide that separate evidence. The initial gateway unit test failed with sandbox `EACCES` to loopback; the same test passed with permitted networking. This environmental failure is retained here rather than concealed.

## Real Minecraft tests

The harness starts the actual Paper Java server. Real Mineflayer clients join as synthetic `LabTester`, `LabBot01` and `LabIntruder`. Chat is sent over Minecraft's protocol. Position observations come from entities in the running game, not mocked movement functions. No graphical player was used for these automated runs.

The deterministic-AI run is explicitly labelled **REAL MINECRAFT / SIMULATED AI**: **21 passed observations**, across two bot launches. The successful final real-AI run used **REAL MINECRAFT / REAL OPENROUTER / DIRECT**: **21 passed observations**, matching the default direct AI connection. It ran on 28 October 2026, approximately 15:11–15:13 in Asia/Nicosia. A separate optional-gateway smoke test with the final model returned the valid follow decision through authenticated local HTTP. This is not a remote TLS deployment or class-load test.

| Acceptance case | Evidence | Result |
|---|---|---|
| Server/agent connection | Paper startup and spawned player/bot at Y=64 | PASS, real server |
| Follow | Bot moved from X≈0.5 to X≈9.09 toward player at X=12.5 | PASS, real LLM + physical motion |
| Stop | Measured movement after stopping: 0 blocks over one second | PASS |
| Go to 10 64 10 | Actual position approximately (10.5,64,9.5), arrival feedback | PASS |
| `come here` | Real model chose follow; bot approached player | PASS |
| `follow me please` | Second launch: follow selected and motion measured | PASS |
| `can you stop moving?` | Second launch: stop selected, zero measured drift | PASS |
| `walk to x 15 y 64 z 20` | Reached approximately (15.49,64,19.36) | PASS |
| Collect diamonds | `unsupported`, explicit limitation, no fabricated collection | PASS |
| Unauthorized player | Zero additional tool decisions | PASS |
| Forged `<LabTester>` system message | Zero additional tool decisions | PASS |
| Distant coordinates | LLM selected goto; application rejected distance >64 | PASS |
| Malformed/nonfinite coordinates | Unit cases reject invalid types, fractions, NaN, Infinity and world bounds | PASS, automated validation |
| Unreachable destination (0,90,0) | No safe path, stopped and reported limitation | PASS, real terrain |
| LLM unavailable | Deliberately unreachable API endpoint, clear error, connected bot remained alive | PASS, real socket failure |
| Emergency stop | Cancels movement; unit case also rejects delayed pending result | PASS |
| Disconnect | Actual server shutdown, agent ready state false | PASS |
| Restart | New client connections and repeated essential actions | PASS, real server/client |
| Graphical Minecraft join/chat/visible motion | Computer Use stopped by user with Escape | UNVERIFIED |

Local machine-readable evidence: `.local/live-movement.json`, `.local/live-openrouter.json`, archived previous reports and server logs. They are intentionally excluded from Git because operational logs may contain identities/chat. The summary above contains synthetic test identities only.

## Failures encountered and fixes

1. The initial practice-floor `fill` failed because chunks were not loaded. Clients fell; those observations were not accepted as following. Fixed with `forceload`, a confirmed fill and assertions that clients stand at Y=64 and walk horizontally. A new disposable test world was used. The failed first run timed out on coordinates.
2. The first real gateway run failed on its first provider request; a second reached follow/stop/coordinates/unsupported/come-here before a later provider failure. A direct diagnostic confirmed the requested coordinate/variation outputs. The initial Google-model direct gameplay run later received **HTTP 429**. These incomplete runs are not passes. The final default was changed to `openai/gpt-4.1-mini`; its complete direct gameplay run passed. No automatic retry loop was added.
3. Feedback could be dropped if arrival occurred very soon after a movement-start message. Changed to a bounded delayed latest message so final feedback can reach chat without spam.
4. Default Mineflayer chat patterns derive usernames from rendered text. The agent instead consumes protocol player-chat sender UUIDs; a real `tellraw` spoof was ignored.
5. The native client launcher was opened for inspection, but the user stopped Computer Use. No subsequent app input was attempted and no graphical result is claimed.

## Dependency advisory

`npm audit` reported **six moderate package entries** stemming from **one underlying uuid advisory**, [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), affecting old transitive uuid versions and propagating through authentication libraries. The identified issue concerns buffer handling in v3/v5/v6; inspected authentication callers used v4. This inspection is not a complete exploitability assessment. The local test uses offline authentication; Microsoft online mode remains unverified. npm's suggested forced fix would downgrade Mineflayer to 1.4.0, incompatible with this lab. It was not applied. Review upstream compatible fixes before a wider release.

## Fresh student copy

**PASS: 14 observed checks across two complete server/bot launches**, with the actual `START-BOT.bat` from a local clone of runtime candidate 4f94754 and fresh `npm ci` dependencies. A stricter repeat required both final position and the actual `Arrived at the destination` feedback. Each round passed preflight/startup, follow, stop (zero drift), coordinates/arrival, unsupported request, typed `stop` with exit code 0, and server shutdown with exit code 0.

The first clean clone followed configure → setup → run. A second clean clone also tested the Greek guide's setup → configure → run order: setup generated both `.env` and `student-config.txt` exactly from their examples before private settings were supplied. It is recorded separately in the private evidence. No developer node_modules were copied.

```text
git clone --no-hardlinks . .local/fresh-student
cmd.exe /d /c setup.bat --no-pause
node scripts/student-flow-test.js
git clone --no-hardlinks . .local/student-guide-test
cmd.exe /d /c setup.bat --no-pause
$env:STUDENT_COPY='.local/student-guide-test'
node scripts/student-flow-test.js
```

`--no-pause` skips only the final batch-file pause for automation. It does not bypass checks. The `.env` used for testing was copied privately after clone, never obtained from Git. Test credential copies are removed after verification. Student-flow evidence is `.local/student-flow.json`, with earlier results retained privately. Opening a real graphical Minecraft window and entering chat by hand remain separate unverified steps.

The first local clone attempt was blocked by a sandbox Git helper error (`NtCreateDirectoryObject`, access denied). Repeating the same local clone with approved execution permissions succeeded. This was not a remote repository/authentication failure.

## Remaining gates

- Observe the graphical Minecraft workflow with a legitimate student account, including key entry and startup; try the lesson with a beginner. Computer Use can resume only when the user allows it in a later turn, or the instructor can perform the checkpoint.
- Resolve age eligibility: [OpenRouter terms](https://openrouter.ai/terms), checked 28 October 2026, require users to be at least 18. The key tutorial is restricted to eligible adults/instructors. Confirm an appropriate provider/model-approved classroom arrangement or test a suitable local model before use with ages 10–15. A gateway is not an automatic exception.
- Revoke the development API key shared in chat and replace `.env` with a fresh capped key before continued use/distribution. No key is intended for Git or the ZIP.
- Validate any shared-server Microsoft sign-in, per-student UUID mapping, HTTPS gateway deployment, actual classroom concurrency and account/license arrangements. These are optional architectures, not proven by loopback testing.
- Ollama is an implemented optional adapter, not a tested local model solution. The final optional gateway passed one real-provider follow smoke test; authentication/quota controls have automated coverage. Remote TLS and classroom load remain untested.
- No public repository, remote push, paid software installation, firewall change or external service deployment was performed.

**Overall verdict: BLOCKED for unconditional classroom readiness; working local instructor prototype with real gameplay/LLM evidence.** The visible-client check and a suitable AI access arrangement for ages 10–15 remain critical gates, so this report does not call the lab student-ready yet.
