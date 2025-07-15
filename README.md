# Digipank API

Pangarakendus, mis ühildub keskpangaga ja võimaldab teiste pankadega rahaülekandeid teha.

## Funktsioonid

### Kasutajahaldus ja Autentimine
- ✅ Kasutaja registreerimine kehtiva kasutajanime ja parooliga
- ✅ Registreerimisel nõutud väljade kontroll ja duplikaatide vältimine
- ✅ Kasutaja sisselogimine sessiooni tokeniga (JWT)
- ✅ Kasutaja väljalogimine (sessiooni token kustutatakse)
- ✅ Kasutajad pääsevad ligi ainult oma andmetele

### Kontohaldus
- ✅ Igal kasutajal võib olla mitu kontot erinevates valuutades
- ✅ Kontod luuakse unikaalse kontonumbriga, kasutades panga prefiksit
- ✅ Kasutajad saavad vaadata oma kontojääke
- ✅ Kontojäägid uuendatakse õigesti pärast tehinguid
- ✅ Uued kontod luuakse 1000 euro algbalanssiga

### Tehingud
- ✅ Sisemised tehingud sama panga kontode vahel
- ✅ Välised tehingud teiste pankade kontodele
- ✅ Tehingud sisaldavad vajalikke välju (fromAccount, toAccount, amount, currency)
- ✅ Tehingu olekut jälgitakse täpselt (pending, inProgress, completed, failed)
- ✅ Kasutajad saavad vaadata oma tehinguajalugu

### Keskpanga Integratsioon
- ✅ Pank on registreeritud panga prefiksiga (konfiguratsioonifailis)
- ✅ Pank suudab töödelda sissetulevaid tehinguid teistest pankadest
- ✅ JWT-allkirjastatud andmepakettide tugi
- ✅ JWKS lõpp-punkt avalike võtmete avaldamiseks

### API Dokumentatsioon
- ✅ SwaggerUI aadressil /docs
- ✅ Kõik API lõpp-punktid dokumenteeritud
- ✅ Asjakohased HTTP staatusekoodid
- ✅ Robustne vigade käsitlemine
- ✅ Korrektne autentimise nõudmine

### Turvalisus
- ✅ Paroolide räsimine (bcrypt)
- ✅ JWT tokenite haldamine
- ✅ Input valideerimine
- ✅ Rate limiting
- ✅ Error handling

## Tehnoloogiad

- **Backend:** Node.js, TypeScript, Express.js
- **Andmebaas:** SQLite
- **Autentimine:** JWT (JSON Web Tokens)
- **Dokumentatsioon:** Swagger/OpenAPI
- **Valideerimine:** Joi
- **Testid:** Jest
- **Turvalisus:** bcrypt, helmet, cors

## Paigaldamine

1. Kloonige repositoorium:
```bash
git clone <repository-url>
cd digipank-api
```

2. Installige sõltuvused:
```bash
npm install
```

3. Konfigureerige keskkonnamuutujad:
```bash
cp .env.example .env
# Redigeerige .env faili vastavalt vajadusele
```

4. Käivitage arendusrežiimis:
```bash
npm run dev
```

## Kasutamine

### API Endpointid

#### Autentimine
- `POST /sessions` - Sisselogimine
- `DELETE /sessions` - Väljalogimine

#### Kasutajad
- `POST /users` - Kasutaja registreerimine
- `GET /users/current` - Praeguse kasutaja andmed
- `POST /users/accounts` - Uue konto loomine
- `GET /users/accounts` - Kasutaja kontode loetelu

#### Kontod
- `GET /accounts/{id}/balance` - Konto jääk
- `GET /accounts/{id}/transactions` - Konto tehingud

#### Tehingud
- `POST /transactions` - Uue tehingu loomine
- `GET /transactions` - Kasutaja tehingud
- `GET /transactions/{id}` - Tehingu detailid

#### B2B (Pangavaheline)
- `POST /transactions/b2b` - Välise tehingu vastuvõtmine

#### Turvalisus
- `GET /jwks.json` - JWKS avalikud võtmed

### API Dokumentatsioon

API dokumentatsioon on kättesaadav aadressil: https://pank.digikaup.online/docs

## Konfiguratsioon

Peamised keskkonnamuutujad `.env` failis:

```env
# Keskpanga ja panga konfiguratsioon
CENTRAL_BANK_URL=https://api.testbank.ee
BANK_PREFIX=DIGI
BANK_NAME=Digipank

# Server konfiguratsioon
PORT=3000
NODE_ENV=development

# Andmebaasi konfiguratsioon
DATABASE_PATH=./bank.db

# JWT konfiguratsioon
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
```

## Testimine

Käivitage testid:
```bash
npm test
```

Käivitage testid watch režiimis:
```bash
npm run test:watch
```

## Arhitektuur

```
src/
├── config/          # Konfiguratsioon
├── database/        # Andmebaasi haldus
├── middleware/      # Express middleware
├── routes/          # API marsruudid
├── services/        # Äriloogika
├── types/          # TypeScript tüübid
└── utils/          # Abifunktsioonid
```

## Arendamine

1. Käivitage arendusserver:
```bash
npm run dev
```

2. Ehitage produktsiooniks:
```bash
npm run build
```

3. Käivitage produktsiooniversioon:
```bash
npm start
```

## Turvaline Juurutamine

Produktsioonis tuleb:

1. Muuta kõik paroolid ja võtmed turvaliseiks
2. Kasutada HTTPS-i
3. Seadistada proper rate limiting
4. Konfigureerida monitoring ja logging
5. Kasutada real krüptograafilisi võtmeid
6. Seadistada backup süsteem andmebaasile

## Valuuta Formaat

**Oluline:** Kõik summad on salvestatud eurodes kahe kümnendkohaga:
- 1000.00 EUR = 1000.00 EUR
- 0.50 EUR = 0.50 EUR
- 1.50 EUR = 1.50 EUR

Summad salvestatakse otse eurodes, et lihtsustada kasutaja kogemust.

## Litsents

MIT License

## Kontakt

Support: support@digipank.ee
