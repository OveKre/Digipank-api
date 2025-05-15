DigiPank - Pangaülekannete Süsteem
DigiPank on täielikult funktsioneeriv harupanga rakendus, mis suhtleb keskpangaga ja võimaldab nii sise- kui välisülekannete tegemist. Süsteem kasutab RS256 krüptograafilisi võtmeid tehingute turvaliseks allkirjastamiseks, tagades turvalisuse pankadevahelistes ülekannetesa.

Funktsioonid
✅ Kasutajate registreerimine ja autentimine
✅ Mitme valuutakonto haldamine ühel kasutajal
✅ Siseülekanded sama panga kontode vahel
✅ Välisülekanded teiste pankade kontodele
✅ Tehingute turvaline allkirjastamine RS256 algoritmiga
✅ Tehingute olekute jälgimine (pending, in_progress, completed, failed)
✅ Sissetulevate tehingute töötlemine teistest pankadest
✅ Panga registreerimine keskpangas
✅ Põhjalik API dokumentatsioon (Swagger UI)
Tehnoloogiad
Backend: Node.js, Express.js
Andmebaas: SQLite3
Autentimine: JWT (jsonwebtoken) RS256 algoritmiga
Dokumentatsioon: Swagger UI
Testimine: Jest, Supertest
Paigaldamine
Eeldused
Node.js (versioon 14.x või uuem)
npm (versioon 6.x või uuem)
Sammud
Klooni repositoorium:
bash
git clone <repositooriumi-url>
cd digipank
Paigalda sõltuvused:
bash
npm install
Seadista keskkonna muutujad:
bash
# Kopeeri näidisfail
cp .env.example .env

# Muuda vajalikud seaded
# Pank tuleb registreerida keskpangas, peale registreerimist saad keskpanga API võtme
Genereeri RS256 võtmepaar:
bash
npm run keygen
Käivita andmebaasi migratsioonid:
bash
npm run migrate
(Valikuline) Lisa testikasutaja andmebaasi:
bash
npm run seed
Käivita rakendus:
bash
# Arenduskeskkonnas
npm run dev

# Tootmiskeskkonnas
npm start
Rakendus on nüüd saadaval aadressil http://localhost:3001
API dokumentatsiooni leiad aadressilt http://localhost:3001/docs
Panga registreerimine keskpangas
Pärast rakenduse käivitamist tuleb pank registreerida keskpangas:

Loo kasutaja ja logi sisse, et saada JWT autentimistoken
Kasuta saadud tokenit keskpangas registreerimiseks:
bash
curl -X POST \
  -H "Authorization: Bearer <sinu-token>" \
  http://localhost:3001/central-bank/register
Pärast edukat registreerimist saad keskpanga API võtme
Lisa saadud võti .env faili CENTRAL_BANK_API_KEY muutujasse:
CENTRAL_BANK_API_KEY=<saadud-võti>
Taaskäivita rakendus, et muudatused jõustuksid
API ülevaade
Autentimine
POST /auth/register - Uue kasutaja registreerimine
POST /auth/login - Sisselogimine
POST /auth/logout - Väljalogimine
GET /auth/profile - Kasutaja profiili vaatamine
Pangakontod
POST /accounts - Uue pangakonto loomine
GET /accounts - Kasutaja pangakontode nimekiri
GET /accounts/:id - Pangakonto detailid ID järgi
GET /accounts/number/:accountNumber - Pangakonto detailid kontonumbri järgi
GET /accounts/number/:accountNumber/transactions - Pangakonto tehingute ajalugu
Tehingud
POST /transactions/internal - Sisemise tehingu tegemine
POST /transactions/external - Välise tehingu tegemine teise panka
POST /transactions/b2b - Sissetuleva tehingu töötlemine teisest pangast
GET /transactions/jwks - Panga avalike võtmete allalaadimine (JWKS)
GET /transactions/:referenceId - Tehingu detailid viite ID järgi
GET /transactions - Kasutaja tehingute nimekiri
Keskpank
POST /central-bank/register - Panga registreerimine keskpangas
GET /central-bank/banks - Kõikide registreeritud pankade nimekiri
GET /central-bank/banks/:prefix - Panga info prefiksi järgi
Tehingute töövoog
Sisemine tehing (sama pank)
Kasutaja algatab tehingu
Süsteem kontrollib kontode olemasolu ja piisavat saldot
Süsteem vähendab lähtekontor saldot
Süsteem suurendab sihtkontor saldot
Tehing märgitakse staatusega "completed"
Väline tehing (teise panka)
Kasutaja algatab tehingu
Süsteem kontrollib lähtekontor olemasolu ja piisavat saldot
Süsteem pärib sihtpanga info keskpangast
Süsteem vähendab lähtekontor saldot
Süsteem allkirjastab tehinguandmed ja saadab need sihtpanka
Sihtpank kontrollib allkirja ja töötleb tehingu
Sihtpank saadab tagasi kinnituse
Süsteem märgib tehingu staatusega "completed"
Testimine
Rakenduse testimiseks on loodud automatiseeritud testid:

bash
# Kõikide testide käivitamine
npm test

# Konkreetse testi käivitamine
npm test tests/auth.test.js
Turvalisus
Kõik paroolid on krüpteeritud bcrypt-iga
Tehingud allkirjastatakse RS256 algoritmiga
JWT tokenid on allkirjastatud RS256 algoritmiga
Kõik API päringud kontrollitakse autentimisega
Kasutajad näevad ainult oma kontosid ja tehinguid
Litsents
Vabavara, kõikidele vaba kasutamiseks

Kontakt
Autor: Ove

© 2025 DigiPank. Kõik õigused kaitstud.

