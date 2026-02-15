import { initializeDB } from '../db/database';

async function testLicense() {
    const db = await initializeDB();
    const action = process.argv[2];

    switch (action) {
        case 'reset':
            await db.run("UPDATE settings SET value = datetime('now') WHERE key = 'trial_start_date'");
            await db.run("UPDATE settings SET value = 'false' WHERE key = 'is_activated'");
            await db.run("UPDATE settings SET value = '' WHERE key = 'license_key'");
            console.log('--- License Reset to Fresh Trial (7 days left) ---');
            break;

        case 'expire':
            await db.run("UPDATE settings SET value = datetime('now', '-8 days') WHERE key = 'trial_start_date'");
            await db.run("UPDATE settings SET value = 'false' WHERE key = 'is_activated'");
            console.log('--- Trial Expired (Simulated 8 days ago) ---');
            break;

        case 'activate':
            await db.run("UPDATE settings SET value = 'true' WHERE key = 'is_activated'");
            await db.run("UPDATE settings SET value = 'MB-A1B2-C3D4-E5F6' WHERE key = 'license_key'");
            console.log('--- License Activated (Force) ---');
            break;

        default:
            const status = await db.all("SELECT * FROM settings");
            console.log('Current License Settings:', status);
            console.log('\nUsage: ts-node license-test.ts [reset|expire|activate]');
    }
}

testLicense().catch(console.error);
