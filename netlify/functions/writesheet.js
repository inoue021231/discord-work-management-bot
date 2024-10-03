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

async function sendMessage(webhookUrl, message) {
  try {
    await fetch(webhookUrl, {
      method: 'PATCH', // メッセージを更新
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message, // フォローアップメッセージ
      }),
    });
  } catch (error) {
    console.error('Error sending follow-up message:', error);
  }
}


exports.handler = async (event, context) => {
  const { discordToken, appId, command, task, userId, userName } = JSON.parse(event.body);
  const webhookUrl = `https://discord.com/api/v10/webhooks/${appId}/${discordToken}/messages/@original`;

  if(command === "newtask") {
    try {
      // === Step 1: タスク一覧にタスクを追加 ===
      const taskSheetRange = 'タスク一覧!A:A';
      const taskSheetResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: taskSheetRange,
      });
  
      const taskRows = taskSheetResponse.data.values || [];
      let taskExists = false;
      let firstEmptyRow = null;
  
      // タスク名の重複チェックと最初の空行の取得
      for (let i = 0; i < taskRows.length; i++) {
        const rowValue = taskRows[i][0]; // A列（タスク名）
  
        // 重複タスク名が存在する場合
        if (rowValue === task) {
          taskExists = true;
          break;
        }
  
        // 最初の空の行を取得
        if (!firstEmptyRow && (!rowValue || rowValue === "")) {
          firstEmptyRow = i + 1; // 行番号は1から始まる
        }
      }
  
      // 重複タスク名がある場合は処理を中断してメッセージを返す
      if (taskExists) {
        await sendMessage(webhookUrl, `タスク名「${task}」は既に存在します。別の名前を使用してください。`);
        return {
          statusCode: 200,
          body: JSON.stringify({ message: `タスク名「${task}」は既に存在します。別の名前を使用してください。` }),
        };
      }
  
      // 空の行が見つからなければ最後尾に追加
      if (!firstEmptyRow) {
        firstEmptyRow = taskRows.length + 1;
      }
  
      // タスク一覧にデータを追加
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `タスク一覧!A${firstEmptyRow}:B${firstEmptyRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[task, userId]],
        },
      });
  
      // === Step 2: ユーザー一覧にユーザーを追加 ===
      const userSheetRange = 'ユーザー一覧!A:A';
      const userSheetResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: userSheetRange,
      });
  
      const userRows = userSheetResponse.data.values || [];
      let userExists = false;
      let firstEmptyUserRow = userRows.length + 1;
  
      // ユーザーIDの重複チェック
      for (let i = 0; i < userRows.length; i++) {
        const rowValue = userRows[i][0]; // A列（ユーザーID）
  
        // 重複ユーザーIDが存在する場合
        if (rowValue === userId) {
          userExists = true;
          break;
        }
  
        // 最初の空の行を取得
        if (!userExists && (!rowValue || rowValue === "")) {
          firstEmptyUserRow = i + 1; // 行番号は1から始まる
        }
      }
  
      // 重複していない場合のみユーザーを追加
      if (!userExists) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `ユーザー一覧!A${firstEmptyUserRow}:B${firstEmptyUserRow}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[userId, userName]],
          },
        });
      }
  
      // === Step 3: 新規シートの作成（タスク名をシート名として追加） ===
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: task,
                  gridProperties: {
                    rowCount: 100,
                    columnCount: 26,
                  },
                },
              },
            },
          ],
        },
      });
  
      // 新規シートに初期値を書き込む
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${task}!A1:C1`, // A1からC1までの範囲
        valueInputOption: 'RAW',
        requestBody: {
          values: [['開始時間', '終了時間', '合計時間']],
        },
      });
  
      // 成功メッセージ
      await sendMessage(webhookUrl, "タスクが登録されました！");
      return {
        statusCode: 200,
        body: 'Data processed',
      };
    } catch (error) {
      console.error('Error during task creation:', error);
      await sendMessage(webhookUrl, "エラーが発生しました。");
      return {
        statusCode: 200,
        body: 'Data processed',
      };
    }
  } else {
    await sendMessage(webhookUrl, "コマンドが違います");
    return {
      statusCode: 200,
      body: 'Data processed',
    };
  }
};
