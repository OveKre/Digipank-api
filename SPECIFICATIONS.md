# Pangavaheline Tehinguprotokoll - Spetsifikatsioon

## Ülevaade

See dokument kirjeldab pankadevaheliste tehingute protokolli, mis võimaldab turvaliselt ja standardiseeritult raha ülekandeid erinevate pangarakenduste vahel läbi keskpanga süsteemi.

## Protokolli Üldpõhimõtted

### 1. Turvaline Autentimine
- Kõik pangavahelised teatised allkirjastatakse JWT tokenitega
- Iga pank omab unikaalset RSA võtmepaari
- Avalikud võtmed on kättesaadavad läbi JWKS (JSON Web Key Set) endpoint-i
- Keskpank hoiab registrit kõigi pankade avalikest võtmetest

### 2. Standardiseeritud Formaadid
- Kõik tehinguandmed edastatakse struktureeritud JSON formaadis
- Kasutatatakse ISO standardeid valuutakoodide ja kuupäevade jaoks
- Kontonumbrid järgivad riigispetsiifilist standardit

### 3. Olekujälgimine
- Iga tehing omab unikaalset identifikaatorit
- Tehingu olek uuendatakse reaalajas
- Veaolukorrad logitakse ja edastatakse asjaosalistele

## JWT Token Formaat

### Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "bank-key-id-2025"
}
```

### Payload
```json
{
  "iss": "DIGI",              // Saatja panga prefiks
  "aud": "CENTRAL_BANK",      // Alati keskpank
  "iat": 1641234567,          // Token genereerimise aeg
  "exp": 1641238167,          // Token kehtivusaeg (1h)
  "jti": "uuid-v4",           // Unikaalne token ID
  "accountFrom": "DIGI1234567890",
  "accountTo": "SWED9876543210",
  "currency": "EUR",
  "amount": 10050,            // Sentides (100.50 EUR)
  "explanation": "Invoice payment",
  "senderName": "John Doe",
  "transactionId": "uuid-v4"  // Saatja panga sisene ID
}
```

## API Endpoint-id

### 1. JWKS Endpoint
**URL:** `GET /jwks.json`

Iga pank peab pakkuma JWKS endpoint-i oma avalike võtmete jagamiseks.

**Vastuse formaat:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "digipank-2025",
      "n": "base64url-encoded-rsa-modulus",
      "e": "AQAB"
    }
  ]
}
```

### 2. B2B Transaction Endpoint
**URL:** `POST /transactions/b2b`

Seda endpoint-i kasutab keskpank teiste pankade tehingute edastamiseks.

**Päringu formaat:**
```json
{
  "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Vastuse formaat:**
```json
{
  "status": "completed",
  "transactionId": "internal-uuid",
  "timestamp": "2025-01-08T12:34:56.789Z"
}
```

## Tehingu Töövoog

### 1. Välise Tehingu Algatamine

1. **Kasutaja** algatab tehingu oma pangas
2. **Saatja pank** valideerib tehingu ja kasutaja kontojääki
3. **Saatja pank** genereerib ja allkirjastab JWT tokeni
4. **Saatja pank** saadab tehingu keskpanka
5. **Keskpank** valideerib allkirja ja tehingu andmeid
6. **Keskpank** edastab tehingu saaja pangale

### 2. Tehingu Vastuvõtmine

1. **Saaja pank** saab tehingu keskpangalt
2. **Saaja pank** valideerib JWT allkirja kasutades saatja avalikku võtit
3. **Saaja pank** kontrollib saaja konto olemasolu
4. **Saaja pank** krediteerib saaja kontot
5. **Saaja pank** saadab kinnituse keskpanka
6. **Keskpank** edastab kinnituse saatja pangale

## Veakäsitlus

### Vigade Tüübid

1. **Validation Errors (400)**
   - Puuduvad kohustuslikud väljad
   - Vigased andmeformaadid
   - Kehtetud allkiri

2. **Authentication Errors (401)**
   - Aegunud JWT token
   - Tundmatu panga prefiks
   - Allkirja valideerimine ebaõnnestus

3. **Not Found Errors (404)**
   - Sihtkontonumber puudub
   - Pank ei ole registreeritud

4. **Business Logic Errors (422)**
   - Ebapiisav kontojääk
   - Konto on blokeeritud
   - Keelatud valuuta

5. **System Errors (500)**
   - Andmebaasi ühenduse viga
   - Sisemised süsteemi vead

### Vea Vastuse Formaat
```json
{
  "error": "Validation Error",
  "message": "Invalid account number format",
  "code": "INVALID_ACCOUNT_FORMAT",
  "timestamp": "2025-01-08T12:34:56.789Z"
}
```

## Turvalisuse Meetmed

### 1. JWT Allkirjad
- Kasutage RS256 algoritmi (RSA + SHA-256)
- Minimaalne võtme pikkus: 2048 bitti
- Avalikud võtmed peavad olema kättesaadavad JWKS kaudu

### 2. Token Kehtivusaeg
- Maksimaalne kehtivusaeg: 1 tund
- Soovituslik kehtivusaeg: 15 minutit
- Ära kasutage sama tokeneid korduvalt

### 3. Rate Limiting
- Maksimaalselt 100 päringut 15 minuti jooksul panga kohta
- Burst limit: 10 päringut sekundi jooksul

### 4. IP Whitelisting
- Registreerige keskpangas oma serverite IP aadressid
- Lubatud on ainult registreeritud IP-delt päringud

## Andmete Formaadid

### Kontonumbrid
- **DIGI-prefiksiga kontod:** `DIGI` + 10 numbrit (nt: DIGI1234567890)
- **Teiste pankade kontod:** Vastavalt nende panga prefiksile

### Summad
- Alati sentides (väikseim valuuta ühik)
- EUR: 1 euro = 100 senti
- USD: 1 dollar = 100 senti

### Kuupäevad
- ISO 8601 formaat: `2025-01-08T12:34:56.789Z`
- Alati UTC ajavööndis

### Valuutakoodid
- ISO 4217 standard
- Kolmekohalised koodid: EUR, USD, GBP jne.

## Testimine

### Test Environment
- **URL:** `https://test-api.centralbank.ee`
- **JWKS URL:** `https://test-api.centralbank.ee/jwks.json`

### Mock Panga Andmed
```json
{
  "bankPrefix": "TEST",
  "name": "Test Bank",
  "jwksUrl": "https://testbank.example.com/jwks.json"
}
```

## Näited

### Tehingu JWT Payload Näide
```json
{
  "iss": "DIGI",
  "aud": "CENTRAL_BANK",
  "iat": 1641234567,
  "exp": 1641238167,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "accountFrom": "DIGI1234567890",
  "accountTo": "SWED9876543210",
  "currency": "EUR",
  "amount": 150075,
  "explanation": "Monthly salary",
  "senderName": "Acme Corporation",
  "transactionId": "tx-550e8400-e29b-41d4-a716-446655440001"
}
```

### B2B API Kõne Näide
```bash
curl -X POST https://bankapi.example.com/transactions/b2b \
  -H "Content-Type: application/json" \
  -d '{
    "jwt": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJESUdJIiwiYXVkIjoiQ0VOVFJBTF9CQU5LIiwiYWNjb3VudEZyb20iOiJESUdJMTIzNDU2Nzg5MCIsImFjY291bnRUbyI6IlNXRUQ5ODc2NTQzMjEwIn0.signature"
  }'
```

## Versioonimine

- **Praegune versioon:** v1.0
- **API versioonimine:** URL path-is (/v1/transactions/b2b)
- **Tagasiühilduvus:** Säilitatakse vähemalt 12 kuud

## Compliance

See protokoll vastab järgmistele standarditele:
- ISO 20022 (Financial Services Messages)
- PCI DSS (Payment Card Industry Data Security Standard)
- GDPR (General Data Protection Regulation)
- PSD2 (Payment Services Directive 2)

## Kontakt ja Tugi

- **Tehnilise toe email:** tech-support@centralbank.ee
- **Ametlik dokumentatsioon:** https://docs.centralbank.ee
- **Status leht:** https://status.centralbank.ee
