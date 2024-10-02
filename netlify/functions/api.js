const fetch = require('node-fetch'); // Webhook の送信に使用
require('dotenv').config();

exports.handler = async (event, context) => {
  const parsedBody = JSON.parse(event.body);

  // Discord に対する ACK の応答（3 秒以内）
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 5 }), // Discord への応答
  };

  // スプレッドシートへの書き込み用データ
  const sheetData = {
    task: "test data"
  };

  // 非同期で 2 つ目のエンドポイントにデータを渡す
  fetch('https://discord-work-management-bot.netlify.app/.netlify/functions/writesheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sheetData),
  });
    
  return response;
};