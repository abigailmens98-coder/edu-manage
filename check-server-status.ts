import 'dotenv/config';
import { storage } from './server/storage';

async function checkStatus() {
    const status = storage.getStorageStatus();
    console.log('Storage Status:', JSON.stringify(status, null, 2));
}

checkStatus().catch(console.error);
