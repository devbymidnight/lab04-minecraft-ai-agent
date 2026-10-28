# Tech Labs · Minecraft AI Agent

Run a Minecraft bot. Give it a natural-language request. Watch an LLM choose a permitted tool and Mineflayer perform the action.

**Classroom readiness is governed by [the test report](docs/TEST-REPORT.md). Do not treat an automated unit-test pass as classroom approval.**

OpenRouter currently requires users to be **18+**. The personal-key tutorial is for eligible adults/instructors. For the intended ages 10–15, the instructor must establish an appropriate provider-approved classroom arrangement or a suitable local-model option; merely adding a gateway does not waive service terms. [Eligibility](https://openrouter.ai/terms)

## Students

Your teacher prepares Minecraft Java **1.21.11**, Node.js **24**, a local practice server and private classroom access before class. Minecraft Bedrock and Education Edition do not work with this project.

1. Clone the classroom repository URL supplied by your teacher, or extract its ZIP. No public repository has been published yet.
2. Double-click `setup.bat` once. Keep the folder together.
3. Open `student-config.txt` in Notepad. Set `PLAYER_NAME` to your exact Minecraft name. Choose a different `BOT_NAME`. Follow the [Greek key tutorial](docs/STUDENT-GUIDE-GR.md#5-ρυθμίζουμε-τον-agent) to create your own capped OpenRouter key and save it in `.env`.
4. Your teacher supplies `classroom-config.txt`. Do not share it.
5. Double-click **START-BOT.bat**. Wait for `READY: Joined Minecraft`.
6. Join the teacher's Minecraft world. In the local configuration, use Multiplayer → Direct Connection → `127.0.0.1:25585`.
7. Open chat with **T** and try:

```text
!ai follow me
!ai stop
!ai go to 10 64 10
```

Wait at least four seconds between instructions. Coordinates must be on a safe walking route, within 64 blocks of the bot and its starting point. The teacher's practice floor is at Y=64.

**Emergency stop:** `!stop` works without the LLM and cancels a pending request. Close the bot by typing `stop` then Enter in its window (Ctrl+C also works). Follow lasts at most two minutes; one navigation attempt lasts at most 45 seconds.

[Ελληνικός οδηγός μαθητή](docs/STUDENT-GUIDE-GR.md) · [Προβλήματα](docs/TROUBLESHOOTING-GR.md) · [Teacher setup](docs/TEACHER-GUIDE.md) · [Architecture](docs/ARCHITECTURE.md)

## Instructors

Read the teacher guide before handing this to students. The default is a teacher-provisioned loopback Minecraft server per workstation and each student's own OpenRouter key in an ignored `.env` file, as requested. Account/payment preparation needs teacher or guardian supervision. An optional teacher-managed gateway avoids distributing provider keys. Shared Minecraft servers require Microsoft authentication and separately provisioned bot accounts.

```text
npm test
npm run preflight
npm start
```

Dependencies are pinned in `package-lock.json`. `setup.bat` uses `npm ci --ignore-scripts`. Do not run `npm audit fix --force`; see the documented dependency advisory first. No firewall changes or public service exposure are part of setup.

The repository contains original lab code only. Minecraft/Paper binaries, worlds, local credentials, account caches, and personal settings are excluded. Do not upload the entire working folder as a ZIP; use `git archive` after inspecting the tracked files.
