const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Path to Google Cloud Service Account credentials key file
const KEY_FILE_PATH = path.join(__dirname, 'service_account.json');

/**
 * Initializes and authenticates the Google Sheets API client
 */
function getSheetsClient() {
  try {
    let authOptions = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    if (fs.existsSync(KEY_FILE_PATH)) {
      console.log("🔑 Using service_account.json for Google Sheets authentication.");
      authOptions.keyFile = KEY_FILE_PATH;
    } else {
      console.log("🔑 service_account.json not found. Attempting Application Default Credentials (ADC)...");
    }

    const auth = new google.auth.GoogleAuth(authOptions);
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error("❌ Google Sheets auth initialization failed:", error.message);
    console.log("⚠️ Sheets client running in MOCK mode due to auth failure.");
    return null;
  }
}

/**
 * Appends or updates rows of post statistics in the Google Sheet.
 * Columns: post_id | platform | content_type | campaign_tag | reach | impressions | likes | comments | shares | saves | data_source | recorded_at
 * @param {Array<object>} rowsData 
 */
async function syncToGoogleSheets(rowsData) {
  const sheets = getSheetsClient();
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !sheetId) {
    console.log("📋 [MOCK SHEETS] Appending/updating rows:");
    console.table(rowsData);
    return true;
  }

  try {
    console.log("💾 Connecting to Google Sheets API...");
    const range = 'Daily Stats!A:L'; // Tab name and column span
    
    // 1. Read existing rows to determine if we should append or update
    let existingRows = [];
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });
      existingRows = response.data.values || [];
    } catch (readError) {
      if (readError.message.includes('Unable to parse range') || readError.message.includes('NOT_FOUND') || readError.status === 400) {
        console.log("📊 'Daily Stats' tab not found in the Google Sheet. Creating it...");
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: 'Daily Stats'
                    }
                  }
                }
              ]
            }
          });
          
          const headers = ['post_id', 'platform', 'content_type', 'campaign_tag', 'reach', 'impressions', 'likes', 'comments', 'shares', 'saves', 'data_source', 'recorded_at'];
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: 'Daily Stats!A1:L1',
            valueInputOption: 'RAW',
            requestBody: {
              values: [headers]
            }
          });
          
          existingRows = [headers];
          console.log("✅ Created 'Daily Stats' tab with default headers.");
        } catch (createError) {
          console.error("❌ Failed to automatically create 'Daily Stats' tab:", createError.message);
          throw createError;
        }
      } else {
        throw readError;
      }
    }
    const headers = existingRows[0] || [];
    
    // Find column index for post_id and recorded_at
    const postIdColIndex = headers.indexOf('post_id');
    const recordedAtColIndex = headers.indexOf('recorded_at');
    
    const valuesToUpdate = [];
    const valuesToAppend = [];
    
    for (const row of rowsData) {
      const newRowValues = [
        row.post_id,
        row.platform,
        row.content_type,
        row.campaign_tag || '',
        row.reach,
        row.impressions || 0,
        row.likes,
        row.comments,
        row.shares,
        row.saves,
        row.data_source,
        row.recorded_at
      ];

      // Check if a row with the same post_id and recorded_at already exists
      let matchIndex = -1;
      if (postIdColIndex !== -1 && recordedAtColIndex !== -1) {
        for (let i = 1; i < existingRows.length; i++) {
          const r = existingRows[i];
          if (r[postIdColIndex] === row.post_id && r[recordedAtColIndex] === row.recorded_at) {
            matchIndex = i + 1; // 1-indexed row number in Sheets (headers are row 1)
            break;
          }
        }
      }
      
      if (matchIndex !== -1) {
        // Prepare to update existing row
        valuesToUpdate.push({
          range: `Daily Stats!A${matchIndex}:L${matchIndex}`,
          values: [newRowValues]
        });
      } else {
        // Prepare to append new row
        valuesToAppend.push(newRowValues);
      }
    }
    
    // 2. Perform Batch Update for existing rows
    if (valuesToUpdate.length > 0) {
      console.log(`📝 Updating ${valuesToUpdate.length} existing rows in Google Sheets...`);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          data: valuesToUpdate,
          valueInputOption: 'RAW'
        }
      });
    }
    
    // 3. Perform Append for new rows
    if (valuesToAppend.length > 0) {
      console.log(`➕ Appending ${valuesToAppend.length} new rows to Google Sheets...`);
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Daily Stats!A2',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: valuesToAppend
        }
      });
    }
    
    console.log("✅ Google Sheets synchronization completed.");
    return true;
  } catch (error) {
    console.error("❌ Google Sheets synchronization failed:", error.message);
    throw error;
  }
}

/**
 * Reads all rows from the Google Sheet
 */
async function readAllRowsFromSheets() {
  const sheets = getSheetsClient();
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !sheetId) {
    console.log("📋 [MOCK SHEETS] Reading all rows (Returning empty list).");
    return [];
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Daily Stats!A:L',
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // Only headers or empty
    
    const headers = rows[0];
    return rows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i];
      });
      return obj;
    });
  } catch (error) {
    console.error("❌ Failed to read rows from Sheets:", error.message);
    return [];
  }
}

module.exports = {
  syncToGoogleSheets,
  readAllRowsFromSheets
};
