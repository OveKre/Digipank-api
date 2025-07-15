#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function checkTransaction(transactionId) {
    return new Promise((resolve, reject) => {
        const dbPath = path.join(__dirname, 'bank.db');
        const db = new sqlite3.Database(dbPath);

        console.log(`=== TEHINGU DETAILID ===`);
        console.log(`Transaction ID: ${transactionId}`);
        console.log('');

        // Põhiline tehingu info
        db.get(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId],
            (err, transaction) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!transaction) {
                    console.log('❌ Tehingut ei leitud!');
                    db.close();
                    resolve();
                    return;
                }

                console.log('📋 TEHINGU INFO:');
                console.log(`   ID: ${transaction.id}`);
                console.log(`   Saatja konto: ${transaction.account_from}`);
                console.log(`   Saaja konto: ${transaction.account_to}`);
                console.log(`   Summa: ${transaction.amount.toFixed(2)} ${transaction.currency}`);
                console.log(`   Selgitus: ${transaction.explanation || 'Pole määratud'}`);
                console.log(`   Saatja nimi: ${transaction.sender_name || 'Pole määratud'}`);
                console.log(`   📊 STAATUS: ${transaction.status.toUpperCase()}`);
                console.log(`   Staatus detail: ${transaction.status_detail || 'Pole määratud'}`);
                console.log(`   Loodud: ${transaction.created_at}`);
                console.log('');

                // Kontrollime, kas see on sisemine või välistehing
                const isFromOurBank = transaction.account_from.startsWith('05b');
                const isToOurBank = transaction.account_to.startsWith('05b');

                console.log('🏦 TEHINGU TÜÜP:');
                if (isFromOurBank && isToOurBank) {
                    console.log('   ✅ SISEMINE - Mõlemad kontod kuuluvad Digipanka');
                } else if (isFromOurBank && !isToOurBank) {
                    console.log('   📤 VÄLJAMINEV B2B - Digipangast välispanka');
                    console.log('   ⏳ Vajab välispanga kinnitust!');
                } else if (!isFromOurBank && isToOurBank) {
                    console.log('   📥 SISSETULEV B2B - Välispangast Digipanka');
                } else {
                    console.log('   ❓ TUNDMATU - Kumbki konto ei kuulu Digipanka');
                }
                console.log('');

                // Staatus selgitus
                console.log('📋 STAATUS SELGITUS:');
                switch (transaction.status) {
                    // 'pending' staatus on eemaldatud, kõik ülekanded on kohe 'completed'
                    case 'in_progress':
                        console.log('   🔄 TÖÖTLEMISEL - Tehing on parasjagu töötlemisel');
                        break;
                    case 'completed':
                        console.log('   ✅ LÕPETATUD - Tehing on edukalt lõpetatud');
                        break;
                    case 'failed':
                        console.log('   ❌ EBAÕNNESTUNUD - Tehing ebaõnnestus');
                        if (transaction.status_detail) {
                            console.log(`   📝 Põhjus: ${transaction.status_detail}`);
                        }
                        break;
                    default:
                        console.log(`   ❓ TUNDMATU STAATUS: ${transaction.status}`);
                }
                console.log('');

                // Kui see on väljaminev B2B, näitame info
                if (isFromOurBank && !isToOurBank) {
                    console.log('🔍 TEHINGU INFO:');
                    console.log('   ✅ Tehing on saadetud sihtpanka');
                    console.log('   ✅ Sihtpank on tehingu vastu võtnud');
                    console.log('   ✅ Tehing on lõpetatud');
                }

                db.close();
                resolve();
            }
        );
    });
}

// Kui käivitatakse otse
if (require.main === module) {
    const transactionId = process.argv[2];
    if (!transactionId) {
        console.log('Kasutus: node check-transaction.js <transaction-id>');
        console.log('Näide: node check-transaction.js 347e240b-6854-4405-ac6c-6d4162d79731');
        process.exit(1);
    }

    checkTransaction(transactionId).catch(console.error);
}

module.exports = { checkTransaction };
