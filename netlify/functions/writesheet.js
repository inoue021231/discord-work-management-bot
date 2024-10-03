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

  if (command === "newtask") {
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
  } else if (command === "taskstart") {
    try {
      // タスク一覧から該当のタスクを取得
      const taskSheetRange = 'タスク一覧!A:B';
      const taskSheetResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: taskSheetRange,
      });
      const taskRows = taskSheetResponse.data.values || [];
      
      // ユーザーが作成した該当タスクを確認
      const taskMatch = taskRows.find(row => row[0] === task && row[1] === userId);
      if (!taskMatch) {
        await sendMessage(webhookUrl, `タスク名「${task}」が存在しないか、操作権限がありません。`);
        return {
          statusCode: 200,
          body: 'Invalid task or no permission.',
        };
      }
      
      // 実行中タスクシートにタスクが存在するか確認
      const execTaskRange = '実行中タスク!A:A';
      const execTaskResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: execTaskRange,
      });
      const execTaskRows = execTaskResponse.data.values || [];
      const isAlreadyRunning = execTaskRows.some(row => row[0] === task);

      if (isAlreadyRunning) {
        await sendMessage(webhookUrl, `タスク「${task}」は既に開始されています。`);
        return {
          statusCode: 200,
          body: 'Task is already running.',
        };
      }

      // 上から見て一番最初の空白行を探す
      let firstEmptyRow = execTaskRows.length + 1;
      for (let i = 0; i < execTaskRows.length; i++) {
        if (!execTaskRows[i][0]) {
          firstEmptyRow = i + 1;
          break;
        }
      }

      // 実行中タスクに追加
      const now = new Date().toISOString(); // 変換せずに保存
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `実行中タスク!A${firstEmptyRow}:B${firstEmptyRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[task, now]],
        },
      });

      await sendMessage(webhookUrl, `タスク「${task}」が開始されました。`);
      return {
        statusCode: 200,
        body: 'Task started.',
      };
    } catch (error) {
      console.error('Error during task start:', error);
      await sendMessage(webhookUrl, "エラーが発生しました。");
      return {
        statusCode: 200,
        body: 'Data processed',
      };
    }
  } else if (command === "taskend") {
    try {
      // 実行中タスクシートから該当タスクを取得
      const execTaskRange = '実行中タスク!A:B';
      const execTaskResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: execTaskRange,
      });
      const execTaskRows = execTaskResponse.data.values || [];
      const execTaskMatchIndex = execTaskRows.findIndex(row => row[0] === task);

      if (execTaskMatchIndex === -1) {
        await sendMessage(webhookUrl, `タスク「${task}」は開始されていません。`);
        return {
          statusCode: 200,
          body: 'Task not started.',
        };
      }

      // 開始時刻の取得
      const startTime = new Date(execTaskRows[execTaskMatchIndex][1]);
      const endTime = new Date();
      const startTimeStr = startTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const endTimeStr = endTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

      // 経過時間を計算
      const diffTimeMs = endTime - startTime;
      const diffDays = Math.floor(diffTimeMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffTimeMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // 経過時間の文字列を構成
      let diffTimeStr = '';
      if (diffDays > 0) diffTimeStr += `${diffDays}日`;
      if (diffHours > 0) diffTimeStr += `${diffHours}時間`;
      diffTimeStr += `${diffMinutes}分`;

      // タスク名シートに記録
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${task}!A:C`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[startTimeStr, endTimeStr, diffTimeStr]],
        },
      });

      // 実行中タスクシートからタスクを削除
      const deleteRowIndex = execTaskMatchIndex + 1; // スプレッドシートは1行目から開始
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `実行中タスク!A${deleteRowIndex}:B${deleteRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['', '']], // 空白で上書き
        },
      });

      await sendMessage(webhookUrl, `タスク「${task}」が終了しました。合計時間: ${diffTimeStr}`);
      return {
        statusCode: 200,
        body: 'Task ended.',
      };
    } catch (error) {
      console.error('Error during task end:', error);
      await sendMessage(webhookUrl, "エラーが発生しました。");
      return {
        statusCode: 200,
        body: 'Data processed',
      };
    }
  } else if (command === "showtask") {
    try {
      // タスク一覧から該当のタスクを取得
      const taskSheetRange = 'タスク一覧!A:B';
      const taskSheetResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: taskSheetRange,
      });
      const taskRows = taskSheetResponse.data.values || [];
      
      // ユーザーが作成した該当タスクを確認
      const taskMatch = taskRows.find(row => row[0] === task && row[1] === userId);
      if (!taskMatch) {
        await sendMessage(webhookUrl, `タスク名「${task}」が存在しないか、操作権限がありません。`);
        return {
          statusCode: 200,
          body: 'Invalid task or no permission.',
        };
      }

      // タスク名シートから履歴を取得
      const taskSheetHistoryRange = `${task}!A:C`;
      const taskHistoryResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: taskSheetHistoryRange,
      });
      const taskHistoryRows = taskHistoryResponse.data.values || [];

      let totalMinutes = 0;

      // 各行の合計時間を集計
      let historyMessage = "【タスク履歴】\n";
      taskHistoryRows.forEach((row, index) => {
        if (index === 0) return; // ヘッダー行をスキップ

        const startTime = row[0];
        const endTime = row[1];
        const duration = row[2];
        historyMessage += `開始: ${startTime}, 終了: ${endTime}, 時間: ${duration}\n`;

        // 合計時間の計算
        const timeParts = duration.match(/(\d+)日|(\d+)時間|(\d+)分/g) || [];
        let minutes = 0;
        timeParts.forEach(part => {
          if (part.includes('日')) minutes += parseInt(part) * 24 * 60;
          if (part.includes('時間')) minutes += parseInt(part) * 60;
          if (part.includes('分')) minutes += parseInt(part);
        });
        totalMinutes += minutes;
      });

      // 合計時間を文字列に変換
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const minutes = totalMinutes % 60;

      let totalDurationStr = "";
      if (days > 0) totalDurationStr += `${days}日`;
      if (hours > 0 || days > 0) totalDurationStr += `${hours}時間`;
      totalDurationStr += `${minutes}分`;

      historyMessage += `【合計時間】${totalDurationStr}`;

      await sendMessage(webhookUrl, historyMessage);
      return {
        statusCode: 200,
        body: 'Task history shown.',
      };
    } catch (error) {
      console.error('Error during task history display:', error);
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
