/**
 * Nugen Alignment Project Tracker
 * Checks progress of the training alignment project on api.nugen.in
 * and automatically updates NUGEN_MODEL_ID in .env when completed.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ALIGNMENT_ID = process.argv[2] || 'alignment_01m3gc28vn3gs45q';
const API_KEY = process.env.NUGEN_API_KEY || 'nugen-404275678978f566';
const STATUS_URL = `https://api.nugen.in/api/v3/alignment-projects/${ALIGNMENT_ID}/status`;

async function checkStatus() {
    console.log(`[Nugen Tracker] Checking status for ${ALIGNMENT_ID}...`);
    try {
        const response = await fetch(STATUS_URL, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            console.error(`[Nugen Tracker] Error ${response.status}: ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log(`[Nugen Tracker] Status: ${data.status}`);
        console.log(`[Nugen Tracker] Progress: ${data.progress ?? 'N/A'}, Queue Position: ${data.queue_position ?? 0}`);

        if (data.status === 'COMPLETED' && data.model_id) {
            console.log(`\n🎉 Training Completed! Model ID: ${data.model_id}`);

            // Update .env automatically
            const envPath = path.join(__dirname, '../.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            envContent = envContent.replace(
                /NUGEN_MODEL_ID=.*/,
                `NUGEN_MODEL_ID=${data.model_id}`
            );
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log(`[Nugen Tracker] Updated NUGEN_MODEL_ID in .env to ${data.model_id}`);
        } else if (data.status === 'PROCESSING' || data.status === 'QUEUED') {
            console.log(`[Nugen Tracker] Project is currently ${data.status}. Run this script again shortly to check completion.`);
        }
    } catch (err) {
        console.error('[Nugen Tracker] Request failed:', err.message);
    }
}

checkStatus();
