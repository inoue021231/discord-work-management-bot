const { google } = require('googleapis');
require('dotenv').config();

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
// スプレッドシートへのアクセス権を設定するためのスコープ
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

// 認証用のJWTクライアントを作成
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key.replace(/\\n/g, '\n'),
  SCOPES
);

// Google Sheets APIのクライアントを作成
const sheets = google.sheets({ version: 'v4', auth });

// スプレッドシートIDとワークシートの範囲を設定
const spreadsheetId = process.env.SPREAD_SHEET_ID;

exports.handler = async (event, context) => {
  const { task } = JSON.parse(event.body);

  // スプレッドシートへの書き込み
  try {
    const range = `Sheet1!A1`; // 書き込み範囲
    const values = [[task, new Date().toISOString()]];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: values,
      },
    });

    console.log('Successfully wrote to spreadsheet');
  } catch (error) {
    console.error('Error writing to spreadsheet:', error);
  }

  // スプレッドシートへの書き込み後の適当なレスポンス
  return {
    statusCode: 200,
    body: 'Data processed',
  };
};
