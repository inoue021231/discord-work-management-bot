exports.handler = async (event, context) => {
  const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY; // Discordの公開鍵

  // POSTリクエストのみを処理
  if (event.httpMethod === 'POST') {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const body = event.body;

    // デバッグ用: 値をログ出力
    console.log('Signature:', signature);
    console.log('Timestamp:', timestamp);
    console.log('Body:', body);

    // Discordからのリクエストを検証
    if (!verifyRequest(signature, timestamp, body, DISCORD_PUBLIC_KEY)) {
      return {
        statusCode: 401,
        body: 'Invalid request signature'
      };
    }

    const parsedBody = JSON.parse(body);

    // PINGリクエストへの即時応答
    if (parsedBody.type === 1) {
      console.log('Received PING, responding with PONG');
      return {
        statusCode: 200,
        body: JSON.stringify({ type: 1 }), // PONG応答
      };
    }

    // 以下の処理で時間がかかる場合、Discord側にタイムアウトエラーが出る可能性あり

    // コマンド処理
    if (parsedBody.data && parsedBody.data.name === 'hello') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          type: 4, // 4は応答メッセージのタイプ
          data: {
            content: 'hello world' // 返したいメッセージ内容
          }
        }),
      };
    }

    // 不明なコマンドが来た場合の応答
    return {
      statusCode: 200,
      body: JSON.stringify({
        type: 4,
        data: {
          content: 'Invalid command'
        }
      }),
    };
  }

  // POST以外のリクエストに対する応答
  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};
