const nacl = require('tweetnacl'); // Discordの署名検証用
const fetch = require('node-fetch');
require('dotenv').config(); // .envファイルから環境変数を読み込む

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

// verifyRequest関数: Discordのリクエスト署名を検証する
function verifyRequest(signature, timestamp, body, publicKey) {
  // 署名の検証
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );
}

/* async function addNewSheet(sheetTitle) {
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

    // 新規シートに初期値を書き込む
    const initialValues = [['開始時間', '終了時間', '合計時間']];
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:C1`, // A1からC1までの範囲
      valueInputOption: 'RAW',
      requestBody: {
        values: initialValues,
      },
    });
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
} */

exports.handler = async (event, context) => {
  const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY; // Discordの公開鍵

  if (event.httpMethod === 'POST') {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const body = event.body;

    // 署名の検証
    const isVerified = verifyRequest(signature, timestamp, body, DISCORD_PUBLIC_KEY);

    if (!isVerified) {
      return {
        statusCode: 401,
        body: 'Invalid request signature'
      };
    }

    const parsedBody = JSON.parse(body);

    // すぐにDiscordにACKを返す
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 5 }), // Deferred response
    };

    // 非同期処理で5秒待機してからフォローアップメッセージを送信
    /* setTimeout(async () => {
      try {
        // DiscordのフォローアップメッセージのURL
        const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.APP_ID}/${parsedBody.token}/messages/@original`;

        // 5秒待機後にフォローアップメッセージを送信
        await fetch(webhookUrl, {
          method: 'PATCH', // PATCHでメッセージを更新
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: 'This is a follow-up message sent after 5 seconds!',
          }),
        });
        console.log('Follow-up message sent');
      } catch (error) {
        console.error('Error sending follow-up message:', error);
      }
    }, 5000); // 5秒待機 */

    return response;

    if (parsedBody.data && parsedBody.data.name === 'newtask') {
      /* const taskName = parsedBody.data.options.find(option => option.name === 'タスク名').value;
      const userId = parsedBody.member.user.id;      

      // 事前に必要なシートデータを1回だけ取得してキャッシュ
      const taskSheetResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'タスク一覧!A:E', // A-D列を取得
      });

      const taskSheetRows = taskSheetResponse.data.values || [];

      // 重複チェックおよび最初の空いている行の検索
      let firstEmptyRow = null;
      let valueExists = false;

      for (let i = 0; i < taskSheetRows.length; i++) {
        const rowValue = taskSheetRows[i][0];

        // タスク名がすでに存在するか確認
        if (rowValue === taskName) {
          valueExists = true;
          break;
        }

        // 最初の空いている行を記録
        if (!firstEmptyRow && (!taskSheetRows[i][0] || !taskSheetRows[i][1])) {
          firstEmptyRow = i + 1; // 行番号は1から始まる
        }
      }

      // 重複している場合は処理を終了
      if (valueExists) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 4,
            data: {
              content: `タスク名「${taskName}」は既に存在します。別の名前を使ってください。`
            }
          }),
        };
      }

      // 空いている行が見つからなかった場合、最後尾に追加
      if (!firstEmptyRow) {
        firstEmptyRow = taskSheetRows.length + 1;
      }
      
      const taskValues = [[taskName, 0, 0, 0, userId]];

      // タスクシートに値を書き込む
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `タスク一覧!A${firstEmptyRow}:E${firstEmptyRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: taskValues,
        },
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 4,
          data: {
            content: `新規タスク「${taskName}」を作成しました。` // 返すメッセージ
          }
        }),
      }; */
    } else if(parsedBody.data && parsedBody.data.name === 'showtask') {
      // show all or task
    } else if(parsedBody.data && parsedBody.data.name === 'start') {
      // start task
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 4,
        data: {
          content: 'Invalid command'
        }
      }),
    };
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};
