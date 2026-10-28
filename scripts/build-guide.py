"""Build the branded Greek PDF. Instructor authoring only; students do not need Python.
Usage: python scripts/build-guide.py --output ../output/pdf/Lab_04_Minecraft_AI_Agent_Guide_GR.pdf
Requires reportlab and the Arial/Consolas fonts on Windows, or DejaVu fonts on Linux.
"""
from pathlib import Path
import argparse
import os
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=ROOT/'guides/student-guide.pdf')
args = parser.parse_args()
args.output.parent.mkdir(parents=True, exist_ok=True)
fontdir = Path(os.environ.get('WINDIR', 'C:/Windows'))/'Fonts'
font_files = [fontdir/'arial.ttf', fontdir/'arialbd.ttf', fontdir/'consola.ttf']
if not all(f.exists() for f in font_files):
    fontdir = Path('/usr/share/fonts/truetype/dejavu')
    font_files = [fontdir/'DejaVuSans.ttf', fontdir/'DejaVuSans-Bold.ttf', fontdir/'DejaVuSansMono.ttf']
for name, file in zip(['Body', 'BodyBold', 'Mono'], font_files):
    pdfmetrics.registerFont(TTFont(name, str(file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='BodyBold')
W, H = 595.28, 841.89
INK, MINT, CYAN, PALE, MUTED = '#061D2B', '#63E6CA', '#79DCEC', '#E9F5F2', '#47616E'
c = canvas.Canvas(str(args.output), pagesize=(W,H), pageCompression=1)
c.setTitle('Lab 04 - Minecraft AI Agent | Οδηγός βήμα προς βήμα')
c.setAuthor('DevByMidnight / Minecraft Tech Labs')
c.setSubject('Ελληνικός οδηγός χρήσης Minecraft AI Agent, OpenRouter και ασφαλούς διαχείρισης API keys')
REPO = 'https://github.com/devbymidnight/lab04-minecraft-ai-agent'
page, y = 0, 0
bottoms = []

def para(text, size=11.3, bold=False, gap=10, color=INK, width=None, x=42):
    global y
    p = Paragraph(text, ParagraphStyle('p', fontName='BodyBold' if bold else 'Body',
        fontSize=size, leading=size*1.45, textColor=HexColor(color), spaceAfter=0))
    aw = width or (W-84)
    _, height = p.wrap(aw, 1000)
    if y-height < 58: raise ValueError(f'Overflow on page {page}: {text[:60]}')
    p.drawOn(c,x,y-height)
    y -= height+gap

def start(title, label):
    global page,y
    if page:
        bottoms.append(round(y,1));c.showPage()
    page += 1
    c.setFillColor(HexColor('#FFFFFF'));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor(INK));c.rect(0,H-83,W,83,fill=1,stroke=0)
    c.setFont('BodyBold',11);c.setFillColor(HexColor(MINT));c.drawString(42,H-35,'DevByMidnight / Minecraft Tech Labs')
    c.setFont('Body',11);c.setFillColor(HexColor('#F7FBFD'));c.drawString(42,H-60,'Lab 04 / Minecraft AI Agent')
    c.setStrokeColor(HexColor('#DDE6E8'));c.line(42,46,W-42,46)
    c.setFillColor(HexColor(INK));c.setFont('Body',8.5);c.drawString(42,29,'DevByMidnight / Οδηγός βήμα προς βήμα / Lab 04')
    c.drawRightString(W-42,29,f'{page:02d}')
    c.bookmarkPage(f'page{page}');c.addOutlineEntry(title,f'page{page}',level=0)
    y = H-105
    para(label,10,True,10,color='#087D70')
    para(title,24,True,16)

def code(text, size=10.5):
    global y
    lines=text.splitlines();h=len(lines)*17+25
    if y-h<58:raise ValueError(f'Code overflow on page {page}')
    for line in lines:
        if pdfmetrics.stringWidth(line,'Mono',size)>W-110:raise ValueError(f'Code too wide: {line}')
    c.setFillColor(HexColor(INK));c.rect(42,y-h,W-84,h,fill=1,stroke=0)
    c.setFont('Mono',size);c.setFillColor(HexColor('#E3F6EE'))
    for i,line in enumerate(lines):c.drawString(55,y-22-i*17,line)
    y-=h+14

def note(title,body):
    global y
    st=ParagraphStyle('note',fontName='Body',fontSize=10.5,leading=15.3,textColor=HexColor(INK))
    p=Paragraph(f'<b>{title}</b><br/>{body}',st);_,h=p.wrap(W-112,1000);h+=24
    if y-h<58:raise ValueError(f'Note overflow page {page}')
    c.setFillColor(HexColor(PALE));c.rect(42,y-h,W-84,h,fill=1,stroke=0)
    c.setFillColor(HexColor('#087D70'));c.rect(42,y-h,4,h,fill=1,stroke=0)
    p.drawOn(c,56,y-h+12);y-=h+14

def step(n,title,body):
    para(f'{n}. {title}',14,True,5);para(body)

def checkpoint(text):note('Checkpoint',text)

def link(label,url):return f'<link href="{escape(url)}" color="#087D70">{label}</link>'

def flow(labels):
    global y
    gap=17;w=(W-84-gap*(len(labels)-1))/len(labels);h=55
    for i,label in enumerate(labels):
        x=42+i*(w+gap)
        c.setFillColor(HexColor(PALE));c.rect(x,y-h,w,h,fill=1,stroke=0)
        p=Paragraph(label,ParagraphStyle('flow',fontName='BodyBold',fontSize=10,leading=14,textColor=HexColor(INK),alignment=1))
        _,ph=p.wrap(w-10,100);p.drawOn(c,x+5,y-h+(h-ph)/2)
        if i<len(labels)-1:
            c.setStrokeColor(HexColor('#087D70'));c.setLineWidth(1.3)
            xx=x+w+3;c.line(xx,y-h/2,xx+10,y-h/2);c.line(xx+7,y-h/2+3,xx+10,y-h/2);c.line(xx+7,y-h/2-3,xx+10,y-h/2)
    y-=h+18

start('Ο δικός σου Minecraft AI Agent','Οδηγός μαθητή / 30-45 λεπτά')
para('Δίνεις μια οδηγία με λόγια. Η AI επιλέγει ένα εργαλείο. Το bot κινείται μέσα στον κόσμο σου.',13,gap=14)
im=ImageReader(str(ROOT/'docs/assets/ai-quests.png'));iw,ih=im.getSize();image_h=260;image_w=image_h*iw/ih
c.drawImage(im,42,y-image_h,image_w,image_h);y-=image_h+9
para('Εικονογράφηση από τη σειρά Minecraft Tech Labs. Δεν είναι screenshot και δεν δείχνει τις πραγματικές δυνατότητες του bot.',8.5,gap=13,color=MUTED)
para('Δεν χρειάζεται να γράψεις κώδικα.',16,True,8)
para('Θα κατεβάσεις το project, θα αλλάξεις δύο ονόματα και θα δοκιμάσεις διαφορετικές προτάσεις στο chat.')
flow(['Κατεβάζω','Ρυθμίζω','Ξεκινώ','Δοκιμάζω'])
para(link('Άνοιξε το repository του Lab 04',REPO),11,True,9)
para('Πριν αρχίσεις: ο εκπαιδευτής ετοιμάζει τον Minecraft server και την κατάλληλη πρόσβαση στην AI. Οι οδηγίες API key της σελίδας 5 απευθύνονται σε επιλέξιμους ενηλίκους.',10,color=MUTED)

start('Τι κάνει η AI και τι κάνει το bot;','01 / Πώς λειτουργεί')
para('Γράφεις στο Minecraft: <b>!ai come here</b>. Η φράση δεν είναι JavaScript. Είναι μία οδηγία σε φυσική γλώσσα.',12)
flow(['Minecraft<br/>chat','Bot','LLM','Tool','Action'])
step('1','Το LLM ερμηνεύει την πρόταση','Το μοντέλο AI προσπαθεί να καταλάβει τι ζητάς. Για το «come here» μπορεί να επιλέξει το εργαλείο <b>follow</b>.')
step('2','Το πρόγραμμα ελέγχει την επιλογή','Δέχεται μόνο συγκεκριμένα εργαλεία και έγκυρες συντεταγμένες. Δεν εκτελεί κώδικα που έγραψε το μοντέλο.')
step('3','Το Mineflayer κάνει την κίνηση','Το bot ακολουθεί τη διαδρομή μέσα στο παιχνίδι. Το μοντέλο δεν πατάει πλήκτρα και δεν αλλάζει μόνο του τον κόσμο.')
step('4','Επιστρέφει feedback','Το πρόγραμμα αναφέρει αν ξεκίνησε, αν έφτασε ή γιατί σταμάτησε. Το «περπατάω προς τα εκεί» δεν σημαίνει ακόμη «έφτασα».')
note('Τα διαθέσιμα tools','<b>follow:</b> ακολουθεί τον παίκτη.<br/><b>stop:</b> σταματά την κίνηση.<br/><b>goto:</b> πηγαίνει σε συντεταγμένες.<br/><b>unsupported:</b> εξηγεί ότι δεν έχει αυτή τη δυνατότητα.')
checkpoint('Μπορείς να ξεχωρίσεις την επιλογή του LLM από την πραγματική κίνηση στο Minecraft;')

start('Κατεβάζουμε το project','02 / Προετοιμασία και λήψη')
para('Ο εκπαιδευτής έχει ήδη ετοιμάσει: <b>Minecraft Java 1.21.11</b>, <b>Node.js 24</b>, server και πρόσβαση στην AI. Το Bedrock και το Education Edition δεν λειτουργούν με αυτό το project.')
step('1','Άνοιξε το repository',link('github.com/devbymidnight/lab04-minecraft-ai-agent',REPO))
step('2','Διάλεξε έναν τρόπο λήψης','<b>Χωρίς Git:</b> πάτησε <b>Code &gt; Download ZIP</b>. Κάνε δεξί κλικ στο ZIP και <b>Extract All / Εξαγωγή όλων</b>. Άνοιξε τον φάκελο που δημιουργήθηκε.')
para('<b>Με Git:</b> άνοιξε terminal στον φάκελο όπου θέλεις να αποθηκεύσεις το project. Το terminal είναι το παράθυρο όπου γράφουμε εντολές στον υπολογιστή.')
code('git clone https://github.com/devbymidnight/lab04-minecraft-ai-agent.git\ncd lab04-minecraft-ai-agent',8.8)
para('Η πρώτη εντολή κατεβάζει τον φάκελο. Η δεύτερη σε μεταφέρει μέσα σε αυτόν. Δεν χρειάζεται να αλλάξεις τις εντολές.')
step('3','Τρέξε την αρχική εγκατάσταση','Κάνε διπλό κλικ στο <b>setup.bat</b>. Περίμενε το <b>Setup complete</b>. Αυτό γίνεται μία φορά και χρειάζεται Internet.')
note('Πού πρέπει να βρίσκομαι;','Μέσα στον φάκελο βλέπεις τα <b>START-BOT.bat</b>, <b>setup.bat</b> και <b>package.json</b>. Μην τρέχεις το project μέσα από το ZIP.')
checkpoint('Υπάρχουν τώρα τα student-config.txt και .env. Ο εκπαιδευτής σου δίνει το classroom-config.txt.')

start('Ρυθμίζουμε δύο ονόματα','03 / Το δικό σου bot')
step('1','Άνοιξε το student-config.txt','Χρησιμοποίησε το <b>Notepad / Σημειωματάριο</b>. Δεν ανοίγουμε τα αρχεία JavaScript του φακέλου src.')
step('2','Γράψε το Minecraft username σου','Άλλαξε μόνο την τιμή μετά το <b>PLAYER_NAME=</b>. Το παράδειγμα παρακάτω είναι φανταστικό· γράψε το δικό σου ακριβές username.')
code('PLAYER_NAME=AlexCraft\nBOT_NAME=LabBot01')
step('3','Διάλεξε όνομα για το bot','Το <b>BOT_NAME</b> πρέπει να διαφέρει από το δικό σου όνομα. Χρησιμοποίησε 3-16 λατινικά γράμματα, αριθμούς ή <b>_</b>, χωρίς κενά.')
step('4','Αποθήκευσε','Πάτησε <b>Ctrl+S</b>. Κλείσε το αρχείο. Μην προσθέσεις εισαγωγικά γύρω από τα ονόματα.')
note('Το αρχείο της τάξης','Το <b>classroom-config.txt</b> περιέχει τη διεύθυνση του server και τον τρόπο σύνδεσης με την AI. Το ετοιμάζει ο εκπαιδευτής. Δεν το μοιράζεσαι με άλλους.')
para('Σε κοινό server με Microsoft authentication, το bot έχει το όνομα του λογαριασμού που έδωσε ο εκπαιδευτής. Το BOT_NAME δεν μετονομάζει εκείνον τον λογαριασμό.',10,color=MUTED)
checkpoint('Το PLAYER_NAME ταιριάζει ακριβώς με το όνομα που χρησιμοποιείς στο παιχνίδι. Το όνομα του bot είναι διαφορετικό.')

start('API key: δημιουργία και ασφάλεια','04 / Μόνο για εκπαιδευτές και επιλέξιμους ενηλίκους')
note('Ηλικίες 10-15','Το OpenRouter απαιτεί χρήστες <b>18+</b>. Οι ανήλικοι δεν δημιουργούν προσωπικό λογαριασμό. Ο εκπαιδευτής επιλέγει επιτρεπόμενη λύση για την τάξη. Ένα gateway δεν παρακάμπτει από μόνο του τους όρους.')
step('1','Σύνδεση και δημιουργία key','Ο επιλέξιμος ενήλικος συνδέεται στο '+link('OpenRouter API Keys','https://openrouter.ai/settings/keys')+' και επιλέγει <b>Create Key</b>. Όνομα: <b>Minecraft Lab</b>.')
step('2','Μικρό όριο χρήσης','Θέτει μικρό συνολικό όριο, π.χ. <b>$1</b>, και ελέγχει τα διαθέσιμα credits. Το όριο δεν αγοράζει credits. Αγορές γίνονται μόνο από τον υπεύθυνο λογαριασμού.')
step('3','Αποθήκευση στο .env','Το setup.bat έχει δημιουργήσει το αρχείο. Άνοιξέ το με Notepad και βάλε το ιδιωτικό key μετά το <b>=</b>. Το παρακάτω είναι μόνο υπόδειγμα:')
code('OPENROUTER_API_KEY=your_private_key_here',10)
para('Ctrl+S. Το όνομα πρέπει να είναι ακριβώς <b>.env</b>, χωρίς επιπλέον <b>.txt</b>. Κλείσε το αρχείο πριν κάνεις screen sharing.',10.5)
note('Δεν το ανεβάζουμε πουθενά','Όχι chat, screenshots, GitHub ή ZIP του προσωπικού φακέλου. Το <b>.gitignore</b> το εξαιρεί από το κανονικό Git, αλλά <b>δεν το κρυπτογραφεί</b>. Το <b>.env.example</b> είναι το ασφαλές, κενό υπόδειγμα.')
para('<b>Αν αποκαλυφθεί:</b> ανάκληση στη σελίδα API Keys και δημιουργία νέου. Η διαγραφή του μηνύματος δεν αρκεί. Στο τέλος του lab, έλεγξε τη χρήση και ανάκλησε το προσωρινό key.',10.5)
para(link('Όροι OpenRouter','https://openrouter.ai/terms')+' / '+link('Όρια και credits','https://openrouter.ai/docs/api/reference/limits'),9.5,color=MUTED)

start('Ξεκινάμε και μπαίνουμε στον κόσμο','05 / Από τον φάκελο στο Minecraft')
step('1','Ο εκπαιδευτής ξεκινά τον server','Ο server δεν περιλαμβάνεται στο GitHub download. Πρέπει να έχει προετοιμαστεί πριν το μάθημα. Η πίστα των παραδειγμάτων βρίσκεται στο <b>Y=64</b>.')
step('2','Κάνε διπλό κλικ στο START-BOT.bat','Κράτησε το παράθυρο ανοιχτό. Περίμενε την παρακάτω γραμμή:')
code('READY: Joined Minecraft')
para('Αν εμφανιστεί SETUP ή σφάλμα σύνδεσης, διάβασε το μήνυμα και δες τη σελίδα 9. Δεν αλλάζουμε firewall ή Windows security settings.')
step('3','Άνοιξε Minecraft Java 1.21.11','Επίλεξε <b>Multiplayer &gt; Direct Connection</b>. Για τον τοπικό server του υπολογιστή σου γράψε:')
code('127.0.0.1:25585')
step('4','Πάτησε Join Server','Στον κόσμο πρέπει να φαίνεται και το bot. Αν η τάξη χρησιμοποιεί κοινό server, γράψε τη διεύθυνση που έδωσε ο εκπαιδευτής αντί για τη διεύθυνση παραπάνω.')
note('Τι σημαίνει 127.0.0.1;','Είναι ο <b>δικός σου υπολογιστής</b>. Δεν είναι η διεύθυνση ενός άλλου μαθητή ή του εκπαιδευτή.')
checkpoint('Είσαι πάνω στην πίστα. Βλέπεις το bot. Το παράθυρο START-BOT παραμένει ανοιχτό.')

start('Οι τρεις πρώτες εντολές','06 / Γράφουμε στο chat με T')
para('Πάτησε <b>T</b>, γράψε μία εντολή και πάτησε <b>Enter</b>. Περίμενε την απάντηση και τουλάχιστον τέσσερα δευτερόλεπτα πριν από την επόμενη.')
para('1. Ακολούθησέ με',15,True,7)
code('!ai follow me')
para('Περπάτησε λίγα blocks πάνω στο έδαφος. Το bot πρέπει να σε ακολουθήσει και να κρατήσει μικρή απόσταση. Το follow διαρκεί έως δύο λεπτά.')
para('2. Σταμάτα',15,True,7)
code('!ai stop')
para('Το LLM επιλέγει stop και το bot σταματά. Για <b>άμεσο σταμάτημα</b>, ακόμη κι αν η AI αργεί, γράψε <b>!stop</b>. Αυτό λειτουργεί χωρίς LLM.')
para('3. Πήγαινε σε συντεταγμένες',15,True,7)
code('!ai go to 10 64 10')
para('Στην πίστα του εκπαιδευτή, το bot περπατά κοντά στο X=10, Y=64, Z=10. Περιμένεις το <b>Arrived at the destination</b>. Αν δεν υπάρχει ασφαλές μονοπάτι, πρέπει να το πει.')
note('Μικρές, ελεγχόμενες κινήσεις','Μένουμε εντός <b>64 blocks</b> από το bot και το αρχικό του σημείο. Μία προσπάθεια μετάβασης διαρκεί έως <b>45 δευτερόλεπτα</b>. Το bot δεν σπάει ούτε τοποθετεί blocks.')

start('Η ίδια ιδέα, με άλλα λόγια','07 / Πειράματα χωρίς κώδικα')
para('Δοκίμασε μία πρόταση τη φορά. Στο παράθυρο του bot, η γραμμή <b>TOOL:</b> δείχνει την επιλογή του μοντέλου. Σύγκρινέ τη με αυτό που έγινε πραγματικά.')
for command,question in [
    ('!ai come here','Επέλεξε follow; Σε πλησίασε;'),
    ('!ai follow me please','Κατάλαβε την πιο ευγενική διατύπωση;'),
    ('!ai can you stop moving?','Ερμήνευσε την ερώτηση ως οδηγία stop;'),
    ('!ai walk to x 15 y 64 z 20','Διάβασε σωστά τις τρεις συντεταγμένες;'),
    ('!ai collect diamonds','Παραδέχτηκε ότι δεν έχει αυτό το εργαλείο;')]:
    code(command,10.2);para(question,10.5,gap=11)
note('Μικρή πρόκληση','Δοκίμασε μία σύντομη ελληνική οδηγία. Σημείωσε την πρόταση, το TOOL και την κίνηση. Η επιτυχία στα ελληνικά είναι πείραμα, όχι εγγύηση.')
para('Μην γράφεις προσωπικά στοιχεία ή κωδικούς. Οι οδηγίες μετά το !ai στέλνονται στην υπηρεσία AI.',10,color=MUTED)

start('Αν κάτι δεν λειτουργεί','08 / Διάβασε το μήνυμα, κάνε ένα βήμα')
for title,body in [
    ('Δεν βρίσκει το Node.js','Ο εκπαιδευτής εγκαθιστά το Node.js 24 πριν το μάθημα. Άνοιξε ξανά τον φάκελο/launcher μετά την εγκατάσταση.'),
    ('Minecraft server is unavailable','Ο εκπαιδευτής ελέγχει ότι ο server τρέχει. Εσύ ελέγχεις τη διεύθυνση και την έκδοση Java 1.21.11.'),
    ('Δεν απαντά στο chat','Έλεγξε το PLAYER_NAME και το κενό μετά το !ai. Περίμενε τουλάχιστον τέσσερα δευτερόλεπτα και να τελειώσει η προηγούμενη οδηγία.'),
    ('AI unavailable ή HTTP 429','Η υπηρεσία AI απέτυχε ή έφτασε κάποιο όριο. Χρησιμοποίησε !stop. Περίμενε και ενημέρωσε τον εκπαιδευτή. Μην στέλνεις συνεχώς την ίδια εντολή.'),
    ('Stay within 64 blocks','Πλησίασε στο bot και στο αρχικό του σημείο. Διάλεξε κοντινότερο προορισμό.'),
    ('I cannot find a safe path','Διάλεξε σημείο με έδαφος και ανοιχτή διαδρομή. Δεν μπορεί να χτίσει γέφυρα ή να σπάσει εμπόδια.'),
    ('Disconnected','Περίμενε να λειτουργήσει ξανά ο server. Μετά ξεκίνα πάλι το START-BOT.bat.')]:
    para(title,12.5,True,4);para(body,10.6,gap=12)
note('Δεν κρύβουμε το σφάλμα','Στις δοκιμές εμφανίστηκαν σφάλματα υπηρεσίας AI και μη διαθέσιμο μονοπάτι. Το σωστό feedback είναι χρήσιμο: μας λέει τι πρέπει να διορθώσουμε.')
para(link('Πλήρης οδηγός αντιμετώπισης προβλημάτων',REPO+'/blob/main/docs/TROUBLESHOOTING-GR.md'),10)

start('Τι μάθαμε;','09 / Παρατήρηση, εξήγηση, ασφαλές κλείσιμο')
for title,body in [
    ('LLM','Ερμηνεύει την πρόταση και επιλέγει ένα επιτρεπόμενο tool.'),
    ('Tool','Μία συγκεκριμένη δυνατότητα: follow, stop ή goto.'),
    ('Action','Η πραγματική κίνηση μέσα στο παιχνίδι.'),
    ('Feedback','Το μήνυμα για το τι συνέβη ή γιατί κάτι δεν έγινε.')]:
    para(title,14,True,4);para(body,11,gap=11)
para('Μία απλή αυτοματοποίηση μπορεί να αντιδρά μόνο σε μια συγκεκριμένη λέξη. Εδώ το LLM προσπαθεί να καταλάβει διαφορετικές προτάσεις. Μπορεί να κάνει λάθος, γι’ αυτό το πρόγραμμα ελέγχει την επιλογή του.')
note('Συζήτηση δύο λεπτών','Ποια δύο διαφορετικά μηνύματα επέλεξαν το ίδιο tool;<br/>Ποιο αίτημα δεν μπορούσε να εκτελέσει;<br/>Ποια είναι η διαφορά ανάμεσα στο «επέλεξε goto» και στο «έφτασε»;')
para('Κλείνουμε σωστά',16,True,8)
para('<b>1.</b> Στο Minecraft γράψε <b>!stop</b>.<br/><b>2.</b> Στο παράθυρο του bot γράψε <b>stop</b> και πάτησε Enter.<br/><b>3.</b> Ο εκπαιδευτής σταματά τον server.<br/><b>4.</b> Ο υπεύθυνος ελέγχει τη χρήση και ανακαλεί προσωρινά keys/tokens.')
checkpoint('Το bot αποσυνδέθηκε. Δεν έμειναν μυστικά σε chat, screenshots ή αρχεία που πρόκειται να μοιραστείς.')

start('Πριν το δώσεις στην τάξη','10 / Σύντομη σελίδα εκπαιδευτή')
para('Η εγκατάσταση του server και η επιλογή υπηρεσίας AI είναι δουλειά του εκπαιδευτή. Οι μαθητές ακολουθούν τις σελίδες 3-4 και 6-10 αφού αυτά είναι έτοιμα.',11.5)
para('Checklist πριν το μάθημα',15,True,8)
for text in [
    'Minecraft Java 1.21.11, Node.js 24 και εξαρτήσεις εγκατεστημένα.',
    'Επιτρεπόμενη πρόσβαση AI για τις ηλικίες της τάξης. Όχι προσωπικοί λογαριασμοί OpenRouter για ανηλίκους.',
    'Τοπικός server στο 127.0.0.1:25585 και πίστα στο Y=64. Offline server δεν εκτίθεται στο δίκτυο.',
    'Σωστό classroom-config.txt ανά υπολογιστή. Provider keys εκτός Git. Μικρά όρια χρήσης.',
    'Πραγματική δοκιμή στο γραφικό Minecraft: join, follow, stop, coordinates, unsupported, restart.'
]:para('□ '+text,10.5,gap=8)
note('Τι έχει επαληθευτεί','9 αυτοματοποιημένα tests, 21 έλεγχοι με πραγματικό Minecraft/OpenRouter και 14 έλεγχοι καθαρής εγκατάστασης/restart πέρασαν. Οι game clients ήταν αυτοματοποιημένοι. Η δοκιμή με το γραφικό Minecraft και η καταλληλότητα πρόσβασης για ηλικίες 10-15 παραμένουν εκκρεμή.')
para('Χρόνος μαθήματος',14,True,6)
para('5΄ εξήγηση / 7΄ ρύθμιση / 8΄ πρώτες εντολές / 10΄ πειράματα / 5΄ συζήτηση / 5΄ κλείσιμο. Προετοιμασία λογαριασμών και υποδομών πριν το μάθημα.',10.5)
para('Οδηγοί και επίσημες πηγές',14,True,6)
for label,url in [
    ('Teacher guide',REPO+'/blob/main/docs/TEACHER-GUIDE.md'),
    ('Test report και περιορισμοί',REPO+'/blob/main/docs/TEST-REPORT.md'),
    ('OpenRouter: όροι και ηλικιακές προϋποθέσεις','https://openrouter.ai/terms'),
    ('OpenRouter: API limits','https://openrouter.ai/docs/api/reference/limits'),
    ('Mineflayer: επίσημη τεκμηρίωση','https://github.com/PrismarineJS/mineflayer')
]:para(link(label,url),9.5,gap=4)
para('Έκδοση οδηγού: 28 Οκτωβρίου 2026. Ανεξάρτητο εκπαιδευτικό project, χωρίς επίσημη σύνδεση με Mojang ή Microsoft.',8.5,gap=0,color=MUTED)
bottoms.append(round(y,1))
c.save()
print(f'Created {page} pages: {args.output}')
print(f'Bottom content positions: {bottoms}')
