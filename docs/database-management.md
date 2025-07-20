# Database Management Guide

## Ülevaade

See dokument kirjeldab Digipank API andmebaasi haldamise funktsioone, sealhulgas:
- SQL transaktsioonid (BEGIN/COMMIT/ROLLBACK)
- Õiguste haldus (CREATE USER, GRANT)
- Eksport/Import protseduurid
- DELETE operatsioonid ja hooldus

## 1. SQL Transaktsioonid

### Eesmärk
SQL transaktsioonid tagavad andmete terviklikkuse pangaoperatsioonide käigus. Kas kõik operatsioonid õnnestuvad või mitte ükski ei teostu.

### Kasutamine koodis

```typescript
import { DatabaseTransaction } from '../database/transactions';

const dbTransaction = new DatabaseTransaction();

// Turvaline raha ülekanne
const result = await dbTransaction.transferMoney(
  'EE123456789', // saatja konto
  'EE987654321', // saaja konto
  100.00,        // summa
  'EUR',         // valuuta
  'Arve nr 123'  // kirjeldus
);
```

### SQL tasemel
```sql
BEGIN;
  -- Kontrolli saldot
  SELECT balance FROM accounts WHERE account_number = 'EE123' FOR UPDATE;
  -- Vähenda saatja kontolt
  UPDATE accounts SET balance = balance - 100 WHERE account_number = 'EE123';
  -- Lisa saaja kontole
  UPDATE accounts SET balance = balance + 100 WHERE account_number = 'EE456';
  -- Loo tehingu kirje
  INSERT INTO transactions (...) VALUES (...);
COMMIT; -- või ROLLBACK vea korral
```

## 2. Õiguste Haldus

### Andmebaasi kasutajad

Süsteem kasutab mitut erinevat andmebaasi kasutajat vastavalt rollile:

#### 2.1 Admin kasutaja
```sql
-- Täisõigused andmebaasile
CREATE USER 'digipank_admin'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON mydb.* TO 'digipank_admin'@'%';
```

#### 2.2 Rakenduse kasutaja
```sql
-- CRUD operatsioonid
CREATE USER 'digipank_app'@'%' IDENTIFIED BY 'app_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'digipank_app'@'%';
```

#### 2.3 Aruandluse kasutaja
```sql
-- Ainult lugemisõigus
CREATE USER 'digipank_reporter'@'%' IDENTIFIED BY 'report_password';
GRANT SELECT ON mydb.* TO 'digipank_reporter'@'%';
```

#### 2.4 Auditor
```sql
-- Piiratud lugemisõigus auditiks
CREATE USER 'digipank_auditor'@'%' IDENTIFIED BY 'audit_password';
GRANT SELECT ON mydb.audit_log TO 'digipank_auditor'@'%';
GRANT SELECT ON mydb.transactions TO 'digipank_auditor'@'%';
```

### Kasutajate loomine
```bash
# Käivita andmebaasi kasutajate skript
docker exec -i Mariadb-container mysql -u root -p123 < scripts/database-users.sql
```

## 3. Eksport/Import Protseduurid

### 3.1 Varukoopiate loomine

#### Täielik varukoopia
```bash
# Käsitsi
./scripts/backup.sh full

# Automaatne (cron)
0 2 * * * /path/to/backup.sh auto
```

#### Ainult struktuur
```bash
./scripts/backup.sh structure
```

#### Ainult andmed
```bash
./scripts/backup.sh data
```

#### Kindlad tabelid
```bash
./scripts/backup.sh tables "users accounts transactions"
```

### 3.2 Taastamine

```bash
# Taastamine varukopiast
./scripts/backup.sh restore backups/digipank_full_backup_20250720_150000.sql.gz

# Käsitsi
docker exec -i Mariadb-container mysql -u root -p123 mydb < backup.sql
```

### 3.3 Varukoopiate haldus

```bash
# Vaata saadaolevaid varukoopiad
./scripts/backup.sh list

# Kustuta vanad varukoopiad (vanemad kui 7 päeva)
./scripts/backup.sh cleanup 7
```

## 4. DELETE Operatsioonid

### 4.1 Turvalisuse põhimõtted

- **Soft Delete eelistatud**: `is_active = FALSE` mitte `DELETE`
- **Backup enne DELETE**: Alati varukoopia enne kustutamist
- **Transaktsioonid**: Kasuta BEGIN/COMMIT/ROLLBACK
- **Auditilogi**: Logi kõik kustutamised

### 4.2 Tavalisemad DELETE operatsioonid

#### Aegunud sessioonid
```sql
DELETE FROM sessions WHERE expires_at < NOW();
```

#### Vanad auditiloogid (vanemad kui 7 aastat)
```sql
DELETE FROM audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);
```

#### Ebaõnnestunud tehingud (vanemad kui 90 päeva)
```sql
DELETE FROM transactions 
WHERE status = 'failed' 
AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

### 4.3 Kasutajate deaktiveerimine

```typescript
import { MaintenanceService } from '../services/maintenanceService';

const maintenance = new MaintenanceService();

// Turvaliselt deaktiveeri kasutaja
await maintenance.deactivateUser(123, 'Account closure request');
```

### 4.4 Kontode sulgemine

```typescript
// Sule konto (ainult nullsaldoga)
await maintenance.closeAccount(456, 'Customer request');
```

## 5. Regulaarne Hooldus

### 5.1 Automaatne puhastus

```typescript
import { MaintenanceService } from '../services/maintenanceService';

const maintenance = new MaintenanceService();

// Täielik puhastus
const results = await maintenance.runFullCleanup();
console.log('Cleanup results:', results);
```

### 5.2 Hoolduse statistika

```typescript
// Vaata, mida puhastama peaks
const stats = await maintenance.getCleanupStats();
console.log('Items to clean:', stats);
```

### 5.3 Cron Job seadistus

```bash
# /etc/crontab
# Igapäevane varukoopia kell 02:00
0 2 * * * /path/to/scripts/backup.sh auto

# Nädalane puhastus laupäeval kell 03:00
0 3 * * 6 node -e "require('./dist/services/maintenanceService').runFullCleanup()"

# Sessioonide puhastus iga tund
0 * * * * node -e "require('./dist/services/maintenanceService').cleanExpiredSessions()"
```

## 6. Hädaolukorras

### 6.1 Kõigi kasutajate väljalogimine
```typescript
await maintenance.forceLogoutAll('Security incident');
```

### 6.2 Kasutaja kiire blokeerime
```sql
UPDATE users SET is_active = FALSE WHERE username = 'suspicious_user';
```

### 6.3 Varundamise taastamine
```bash
# Kiire taastamine viimasest varukopiast
LATEST_BACKUP=$(ls -t backups/digipank_full_backup_*.sql.gz | head -1)
./scripts/backup.sh restore "$LATEST_BACKUP"
```

## 7. Jälgimine ja Logid

### 7.1 Hoolduse logid
- Kõik operatsioonid logitakse `audit_log` tabelisse
- Backup logid: `backups/backup.log`
- Rakenduse logid: vt Logger utiliiti

### 7.2 Jõudluse jälgimine
```sql
-- Kõige suuremad tabelid
SELECT 
    table_name, 
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM information_schema.tables 
WHERE table_schema = 'mydb'
ORDER BY size_mb DESC;

-- Aeglased päringud
SHOW FULL PROCESSLIST;
```

## 8. Turvalisus

### 8.1 Paroolide turvalisus
- Kasuta tugevaid paroole (min 16 tähemärki)
- Vaheta paroole regulaarselt
- Kasuta environment variable'eid tootmises

### 8.2 Juurdepääsu jälgimine
```sql
-- Kasutajate sessioonid
SELECT user, host, db, command, time, state 
FROM information_schema.processlist;

-- Õiguste kontroll
SHOW GRANTS FOR 'digipank_app'@'%';
```

## 9. Seotud Failid

- `src/database/transactions.ts` - SQL transaktsioonide wrapper
- `src/services/maintenanceService.ts` - Hoolduse teenus
- `scripts/database-users.sql` - Kasutajate loomine
- `scripts/backup.sh` - Varukoopiate skript
- `scripts/maintenance.sql` - DELETE näited ja protseduurid

## 10. Testimine

### 10.1 Testida arenduskeskkonnas
```bash
# Loo test andmebaas
docker exec Mariadb-container mysql -u root -p123 -e "CREATE DATABASE mydb_test;"

# Testi varukoopia taastamist
./scripts/backup.sh restore test_backup.sql
```

### 10.2 Jõudluse test
```bash
# Test suurte DELETE operatsioonide mõju
EXPLAIN DELETE FROM audit_log WHERE created_at < '2020-01-01';
```
