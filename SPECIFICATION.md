# DigiPank API Specification

## Overview

DigiPank on digitaalne pangasüsteem, mis võimaldab rahaülekandeid nii panga siseselt kui ka teiste pankade vahel. Käesolev dokument kirjeldab DigiPank API spetsifikatsiooni, keskendudes eriti pankadevaheliste tehingute töötlemisele.

## Pankadevahelised tehingud (B2B)

### Tehingute allkirjastamine ja verifitseerimine

Kõik pankadevahelised tehingud peavad olema digitaalselt allkirjastatud, kasutades RS256 algoritmi (RSA + SHA-256). Iga pank peab registreerima oma avaliku võtme keskpangas, et teised pangad saaksid tehingute allkirju verifitseerida.

#### JWKS (JSON Web Key Set)

Iga pank peab pakkuma JWKS (JSON Web Key Set) otspunkti, mis sisaldab panga avalikke võtmeid. JWKS otspunkt peab olema kättesaadav URL-il, mis on registreeritud keskpangas.

JWKS peab vastama järgmisele formaadile:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "bank-signing-key-YYYY-MM-DD",
      "use": "sig",
      "alg": "RS256",
      "e": "AQAB",
      "n": "..."
    }
  ]
}
```

### Tehingute töötlemine

#### Sissetuleva tehingu töötlemine

Pank peab suutma töödelda sissetulevaid tehinguid teistest pankadest. Sissetulev tehing saadetakse HTTP POST päringuga panga tehingute otspunkti, mis on registreeritud keskpangas.

**Otspunkt:** `/transactions/b2b`

**Meetod:** `POST`

**Päring:**

```json
{
  "transaction": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Kus `transaction` on JWT (JSON Web Token) formaadis allkirjastatud tehing.

**JWT sisu:**

```json
{
  "referenceId": "unikaalne-tehingu-viide",
  "fromAccount": "saatja-konto-number",
  "toAccount": "saaja-konto-number",
  "amount": 100.00,
  "currency": "EUR",
  "senderBank": "saatja-panga-prefiks",
  "receiverBank": "saaja-panga-prefiks",
  "description": "Tehingu kirjeldus"
}
```

#### Vastuse koodid

Pank peab vastama järgmiste HTTP staatuskoodidega:

- `200 OK` - Tehing on juba edukalt töödeldud (idempotentsus)
- `201 Created` - Tehing on edukalt töödeldud
- `400 Bad Request` - Vigane tehingu andmestruktuur
- `401 Unauthorized` - Vigane tehingu allkiri
- `404 Not Found` - Saaja kontot ei leitud
- `409 Conflict` - Sama referenceId-ga tehing on juba olemas, kuid pole lõpetatud
- `422 Unprocessable Entity` - Valideerimise viga (nt valuuta mittevastavus)
- `500 Internal Server Error` - Serveri viga

**Edukas vastus:**

```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "data": {
    "referenceId": "unikaalne-tehingu-viide",
    "status": "completed"
  }
}
```

**Veaga vastus:**

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description"
}
```

### Idempotentsus

Tehingute töötlemine peab olema idempotentne. See tähendab, et kui sama tehingut (sama `referenceId`-ga) saadetakse mitu korda, siis tehing töödeldakse ainult üks kord. Järgnevad päringud sama tehingu kohta peavad tagastama staatuskoodi `200 OK` ja info, et tehing on juba töödeldud.

### Tehingute verifitseerimine

Sissetuleva tehingu verifitseerimiseks peab pank:

1. Dekodeerima JWT ilma verifitseerimata, et saada saatja panga prefiks
2. Küsima keskpangast saatja panga info, sh JWKS URL
3. Laadima saatja panga JWKS
4. Verifitseerima tehingu allkirja, kasutades saatja panga avalikku võtit
5. Kontrollima, et saaja konto eksisteerib ja kuulub sellele pangale
6. Kontrollima, et saaja konto valuuta vastab tehingu valuutale
7. Töötlema tehingu (lisama raha saaja kontole)
8. Uuendama tehingu staatuse

## Panga registreerimine keskpangas

Enne tehingute töötlemist peab pank end registreerima keskpangas.

**Otspunkt:** `/central-bank/register`

**Meetod:** `POST`

**Päring:**
Autentimistoken peab olema lisatud päisesse `Authorization: Bearer <token>`.

**Vastus:**

```json
{
  "success": true,
  "message": "Bank registered successfully with the central bank",
  "data": {
    "apiKey": "keskpanga-api-võti"
  }
}
```

Saadud API võti tuleb lisada `.env` faili `CENTRAL_BANK_API_KEY` muutujana.

## Tehingute algatamine

Pank peab suutma algatada tehinguid teistesse pankadesse.

**Otspunkt:** `/transactions/external`

**Meetod:** `POST`

**Päring:**

```json
{
  "from_account": "saatja-konto-number",
  "to_account": "saaja-konto-number",
  "amount": 100.00,
  "currency": "EUR",
  "description": "Tehingu kirjeldus"
}
```

## Turvalisus

- Kõik API päringud peavad kasutama HTTPS protokolli
- Panga sisesed tehingud peavad olema autenditud JWT tokeniga
- Pankadevahelised tehingud peavad olema allkirjastatud RS256 algoritmiga
- Keskpanga API päringud peavad sisaldama API võtit

## Veakäsitlus

Kõik vead peavad olema korrektselt käsitletud ja vastama RFC 7231 standardile. Veateated peavad olema informatiivsed ja aitama probleemi lahendada.
