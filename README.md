## Εγκατάσταση και εκκίνηση από το VS Code

### 1. Κάνε clone και άνοιξε το project

Στο VS Code, άνοιξε την παλέτα εντολών με **Ctrl+Shift+P**, επίλεξε **Git: Clone** και επικόλλησε:

```text
https://github.com/devbymidnight/lab04-minecraft-ai-agent.git
```

Επίλεξε πού θα αποθηκευτεί το project και πάτησε **Open**. Αν έχεις ήδη κάνει clone, άνοιξε τον φάκελο `lab04-minecraft-ai-agent` με **File → Open Folder**.

### 2. Εγκατάστησε τις εξαρτήσεις μία φορά

Στο VS Code επίλεξε **Terminal → New Terminal** και βεβαιώσου ότι το terminal γράφει **PowerShell**. Τρέξε τις εντολές από τον φάκελο που περιέχει το `package.json`:

```powershell
node --version
npm.cmd ci --ignore-scripts --no-fund
```

Η πρώτη εντολή πρέπει να εμφανίσει `v24.x.x`. Η δεύτερη εγκαθιστά τις εκδόσεις που ορίζει το `package-lock.json`. Χρησιμοποιούμε `npm.cmd` ώστε οι εντολές να εκτελούνται στο PowerShell των Windows χωρίς αλλαγή του execution policy.

### 3. Ρύθμισε τα τρία αρχεία μέσα στο VS Code

Άνοιξε το **Explorer** στην αριστερή πλευρά του VS Code. Τα αρχεία ρυθμίσεων μπαίνουν στον ίδιο φάκελο με το `package.json`. Σε νέο clone, δημιούργησε τα δύο προσωπικά σου αρχεία από τα υποδείγματα:

Τρέξε κάθε εντολή μόνο αν λείπει το αντίστοιχο αρχείο, για να διατηρήσεις τις υπάρχουσες ρυθμίσεις σου.

| Αρχείο | Τι χρειάζεται να κάνεις |
|---|---|
| `student-config.txt` | Άνοιξέ το στο VS Code. Βάλε στο `PLAYER_NAME` το ακριβές όνομα που χρησιμοποιείς μέσα στο Minecraft και στο `BOT_NAME` ένα διαφορετικό όνομα για το bot. Πάτησε **Ctrl+S**. |
| `classroom-config.txt` | Βάλε στον φάκελο το έτοιμο αρχείο που σου δίνει ο εκπαιδευτής. Περιέχει τη διεύθυνση και τη θύρα του Paper, την έκδοση Minecraft και τις ρυθμίσεις AI. |
| `.env` | Αν η τάξη χρησιμοποιεί `gateway` ή `ollama`, άφησέ το όπως είναι. Αν είσαι επιλέξιμος ενήλικος και χρησιμοποιείς απευθείας `openrouter`, βάλε το προσωπικό σου key στη γραμμή `OPENROUTER_API_KEY=` και πάτησε **Ctrl+S**. Κράτησε το αρχείο ιδιωτικό. |

**Παράδειγμα `student-config.txt`** για παίκτη που ονομάζεται `AlexCraft`:

```text
PLAYER_NAME=AlexCraft
BOT_NAME=LabBot01
```

**Για τον εκπαιδευτή:** σε νέο clone, δημιούργησε το `classroom-config.txt` με την παρακάτω εντολή και άνοιξέ το από το Explorer του VS Code:

```powershell
Copy-Item .\classroom-config.example .\classroom-config.txt
```

Για Paper **στον ίδιο υπολογιστή**, έλεγξε αυτές τις γραμμές και κράτησε τις υπόλοιπες ρυθμίσεις AI του αρχείου:

```text
MC_HOST=127.0.0.1
MC_PORT=25565
MC_VERSION=1.21.11
MC_AUTH=offline
```

Η `MC_PORT` πρέπει να ταιριάζει με το `server-port` του Paper. Αν χρησιμοποιείς τον server που ετοίμασε το `teacher/prepare-server.ps1`, η θύρα του είναι **`25585`**.

### 4. Ξεκίνα τον Paper και μετά το bot

Περίμενε να εμφανιστεί `Done (...)!` στην κονσόλα του Paper. Στο **PowerShell του VS Code**, τρέξε:

```powershell
npm.cmd run preflight
```

Μόλις εμφανιστεί `Preflight passed. Minecraft server is reachable.`, ξεκίνα το bot:

```powershell
npm.cmd start
```

Περίμενε το `READY: Joined Minecraft` και κράτησε το terminal ανοιχτό. Μπες από **Minecraft Java 1.21.11 → Multiplayer → Direct Connection** στην ίδια διεύθυνση και θύρα που γράφει το `classroom-config.txt`. Στο chat του παιχνιδιού δοκίμασε `!ai follow me`.

**Αν το preflight περάσει αλλά δεις `Failed to verify username!`:** το bot έφτασε στον Paper, αλλά ο server ζητά επαληθευμένο λογαριασμό ενώ το bot χρησιμοποιεί `MC_AUTH=offline`. Για το lab **στον ίδιο υπολογιστή**, ο εκπαιδευτής γράφει `stop` στην κονσόλα του Paper, ανοίγει το `server.properties` του συγκεκριμένου server στο VS Code και ελέγχει:

```properties
server-port=25565
online-mode=false
enforce-secure-profile=false
```

Αν η τάξη χρησιμοποιεί `25585`, βάλε `25585` και στα δύο αρχεία. Αποθήκευσε το `server.properties`, ξεκίνα ξανά τον Paper και μετά τρέξε `npm.cmd start`. Για κοινό server όπου οι μαθητές συνδέονται από διαφορετικούς υπολογιστές, ο εκπαιδευτής κρατά `online-mode=true` και ρυθμίζει το bot με `MC_AUTH=microsoft` και λογαριασμό Minecraft.

### Εντολές npm στο PowerShell

| Πότε | Εντολή |
|---|---|
| Στην αρχική εγκατάσταση | `npm.cmd ci --ignore-scripts --no-fund` |
| Για έλεγχο ρυθμίσεων και σύνδεσης με τον Paper | `npm.cmd run preflight` |
| Για εκκίνηση του bot σε κάθε μάθημα | `npm.cmd start` |
| Για εκτέλεση των αυτοματοποιημένων unit tests | `npm.cmd test` |