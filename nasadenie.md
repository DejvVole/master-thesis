# Najjednoduchšie nasadenie — len aby to bežalo na serveri

Postup pre úplného začiatočníka. Bez HTTPS, bez domény, len IP adresa servera + porty.

---

## 1. Kúp si server (VPS)

Napríklad **Hetzner Cloud** (najlacnejšie, ~5 €/mesiac), DigitalOcean, Contabo, Vultr…

Pri objednávke vyber:

- **Ubuntu 24.04**
- min. **4 GB RAM, 2 CPU, 40 GB disk**
- pridaj svoj **SSH kľúč** (alebo dostaneš heslo emailom)

Po vytvorení dostaneš **IP adresu**, napr. `123.45.67.89`.

---

## 2. Pripoj sa na server

Na svojom Macu otvor Terminal:

```bash
ssh root@123.45.67.89
```

(nahraď IP svojou)

---

## 3. Nainštaluj Docker (jednorazovo)

Na serveri spusti:

```bash
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin
```

Over:

```bash
docker --version
docker compose version
```

---

## 4. Nahraj projekt na server

**Najjednoduchšia možnosť** — z tvojho Macu (nový terminál, **nie** v SSH):

```bash
cd ~/Downloads
scp -r thesis-code-main root@123.45.67.89:/opt/building-rag
```

To nakopíruje celý projekt na server do `/opt/building-rag`.

---

## 5. Vráť sa do SSH na server a vytvor `.env` súbory

```bash
ssh root@123.45.67.89
cd /opt/building-rag
```

Skopíruj šablóny:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
cp backend/.env.example backend/.env
```

Teraz uprav **dve veci**, ostatné default hodnoty stačia. Použi nano:

### a) `server/.env`

```bash
nano server/.env
```

Nájdi a uprav minimálne tieto riadky:

```env
OPENAI_API_KEY=sk-...tvoj-skutočný-kľúč...
BETTER_AUTH_SECRET=hocijaký-dlhý-náhodný-reťazec-aspoň-32-znakov
CLIENT_URL=http://123.45.67.89:5173
CORS_ORIGINS=http://123.45.67.89:5173
```

Náhodný secret vygeneruj príkazom (spusti raz na serveri a výsledok skopíruj):

```bash
openssl rand -base64 48
```

Ulož: `Ctrl+O`, `Enter`, `Ctrl+X`.

### b) `client/.env`

```bash
nano client/.env
```

```env
VITE_API_URL=http://123.45.67.89:3001
```

(IP nahraď svojou)

Ulož a zatvor.

---

## 6. Spusti aplikáciu

```bash
cd /opt/building-rag
docker compose up -d --build
```

`-d` znamená „beží na pozadí". Build potrvá pár minút (Python balíky, Node modules).

Sleduj log:

```bash
docker compose logs -f
```

(`Ctrl+C` zatvorí log, aplikácia beží ďalej.)

---

## 7. Otvor firewall pre potrebné porty

```bash
ufw allow 22/tcp
ufw allow 5173/tcp
ufw allow 3001/tcp
ufw allow 9001/tcp
ufw allow 5050/tcp
ufw --force enable
```

---

## 8. Vytvor admin účet

```bash
docker compose exec server npx tsx src/scripts/create-admin.ts
```

Zadáš email a heslo, ktorým sa budeš prihlasovať.

---

## 9. Otvor v prehliadači

- Aplikácia: `http://123.45.67.89:5173`
- API health-check: `http://123.45.67.89:3001/api/health`
- MinIO konzola: `http://123.45.67.89:9001`
- PgAdmin: `http://123.45.67.89:5050`

Hotovo. Aplikácia beží na serveri.

---

## Užitočné príkazy (keď budeš potrebovať)

```bash
# zastaviť
docker compose down

# reštartovať
docker compose restart

# pozrieť logy konkrétnej služby
docker compose logs -f server
docker compose logs -f client

# po zmene .env súboru treba znova zbuildiť
docker compose up -d --build
```

---

## Časté problémy

- **Nejde sa pripojiť z prehliadača** → skontroluj firewall (krok 7) a či poskytovateľ VPS nemá vlastný cloud-firewall (Hetzner, DO áno → tam treba povoliť porty cez ich web).
- **Login nefunguje, alebo CORS chyba** → zle nastavené `CLIENT_URL` / `CORS_ORIGINS` / `VITE_API_URL`. Po úprave: `docker compose up -d --build`.
- **Nejde build** → málo RAM. Daj si silnejší VPS (8 GB).

To je všetko, čo potrebuješ na rozbeh. HTTPS, doménu a zálohy môžeš doriešiť neskôr.
