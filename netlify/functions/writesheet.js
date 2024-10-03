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
  const { discordToken, appId, command, task, userId } = JSON.parse(event.body);

  // スプレッドシートへの書き込み
  try {
    const range = `シート1!A1`; // 書き込み範囲
    const values = [[task, new Date().toISOString(), command, userId]];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: values,
      },
    });

    console.log('Successfully wrote to spreadsheet');

    // 3秒待機する Promise を作成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3秒待機後にフォローアップメッセージを送信
    try {
      const webhookUrl = `https://discord.com/api/v10/webhooks/${appId}/${discordToken}/messages/@original`;
      const followUpResponse = await fetch(webhookUrl, {
        method: 'PATCH', // メッセージを更新
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `作成しました！`, // フォローアップメッセージ
        }),
      });

      // レスポンスの確認
      if (!followUpResponse.ok) {
        console.error('Failed to send follow-up message:', followUpResponse.status, followUpResponse.statusText);
      } else {
        console.log('Follow-up message sent');
      }
    } catch (error) {
      console.error('Error sending follow-up message:', error);
    }
  } catch (error) {
    console.error('Error writing to spreadsheet:', error);
  }

  // スプレッドシートへの書き込みおよびメッセージ送信後の適当なレスポンス
  return {
    statusCode: 200,
    body: 'Data processed',
  };
};
