require('dotenv').config();

const { google } = require('googleapis');
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

// JSON文字列をJavaScriptオブジェクトに変換
const credentials = JSON.parse(serviceAccountJson);

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

async function addNewSheet(sheetTitle) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
                gridProperties: {
                  rowCount: 100,
                  columnCount: 26
                }
              }
            }
          }
        ]
      }
    });
    console.log(`新しいシート「${sheetTitle}」が作成されました。`);
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// create
// A列の最初に空いている行番号を取得
async function getFirstEmptyRow(sheetName) {
  try {
    // A列のすべてのデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    // 取得したデータを確認
    const rows = response.data.values || [];

    // 最初の空の行番号を探す
    for (let i = 0; i < rows.length; i++) {
      // A列の値が空（undefined, null, または空文字列）の場合、その行番号を返す
      if (!rows[i][0]) {
        console.log(`最初に空いている行番号は: ${i + 1}`);
        return i + 1; // 1行目から始まるため、+1
      }
    }

    // 全部埋まっている場合は、次の空の行を返す
    const emptyRow = rows.length + 1;
    console.log(`最初に空いている行番号は: ${emptyRow}`);
    return emptyRow;
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// 書き込み： A1セルに「Hello World」を書き込む
async function writeToCell() {
  try {
    // A1セルに値を書き込む
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'メインシート!A1', // ワークシート名!セル範囲
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Hello World']],
      },
    });
    console.log('セルに「Hello World」を書き込みました。');

    // 行の末尾にデータを書き込む
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'メインシート', // ワークシート名
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [
          ['Name', 'Age', 'City'],
          ['John Doe', 25, 'New York'],
        ],
      },
    });
    console.log('行にデータを追加しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// addNewSheet("newtask");

getFirstEmptyRow("タスク一覧");