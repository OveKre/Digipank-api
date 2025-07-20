# Digipank API - MariaDB Setup

## Andmebaasi käivitamine Docker-iga

### 1. MariaDB konteiner käivitamine

```bash
# Käivita MariaDB konteiner
docker-compose up -d

# Kontrolli, et konteiner töötab
docker-compose ps
```

### 2. Andmebaasi ühenduse test

```bash
# Ühenda andmebaasiga
docker exec -it digipank-mariadb mysql -u digipank_user -p123 digipank
```

### 3. Rakenduse käivitamine

```bash
# Kopeeri keskkonnamuutujad
cp .env.example .env

# Installi sõltuvused (kui pole veel tehtud)
npm install

# Käivita rakendus arendusrežiimis
npm run dev
```

## Keskkonnamuutujad (.env fail)

Loo `.env` fail järgmiste muutujatega:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Bank Configuration
BANK_PREFIX=05b
BANK_NAME=Digipank
CENTRAL_BANK_URL=https://henno.cfd/central-bank/
API_KEY=your-api-key-here

# Database Configuration (MariaDB)
DB_HOST=localhost
DB_PORT=3308
DB_NAME=digipank
DB_USER=digipank_user
DB_PASSWORD=123

# JWT Configuration
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRES_IN=24h

# Cryptography
PRIVATE_KEY_PATH=./keys/private.pem
PUBLIC_KEY_PATH=./keys/public.pem

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Andmebaasi haldamine

### MariaDB käsklused

```bash
# Konteiner seiskamine
docker-compose down

# Andmete kustutamine (koos kõigi andmetega)
docker-compose down -v

# Logide vaatamine
docker-compose logs mariadb

# MariaDB konsolisse sisenemine
docker exec -it digipank-mariadb mysql -u root -p123
```

### Andmebaasi varukoopia

```bash
# Varukoopia loomine
docker exec digipank-mariadb mysqldump -u root -p123 digipank > digipank_backup.sql

# Varukoopia taastamine
docker exec -i digipank-mariadb mysql -u root -p123 digipank < digipank_backup.sql
```

## Muudatused

### Mis muutus?

1. **SQLite asendati MariaDB-ga** - parema jõudluse ja autentimise tugi
2. **Docker-compose setup** - lihtne arenduskeskkonna seadistamine
3. **Uued keskkonnamuutujad** - andmebaasi ühenduse konfiguratsioon
4. **SQL süntaksi muudatused** - MariaDB-spetsiifilised andmetüübid

### Andmetüüpide muudatused

- `TEXT` → `VARCHAR(255)` või `TEXT`
- `REAL` → `DECIMAL(15,2)` 
- `DATETIME` → `TIMESTAMP`
- `datetime("now")` → `NOW()`

## Veaotsing

### Ühenduse probleemid

1. Kontrolli, et Docker töötab
2. Kontrolli, et port 3308 on vaba
3. Kontrolli .env faili seadistusi

### Andmebaasi probleemid

1. Kontrolli MariaDB konteiner töötab: `docker-compose ps`
2. Vaata logisid: `docker-compose logs mariadb`
3. Testi ühendust: `docker exec -it digipank-mariadb mysql -u digipank_user -p123 digipank`
