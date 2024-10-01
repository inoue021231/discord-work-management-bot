const nacl = require('tweetnacl');
require('dotenv').config();

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

    // 署名の検証
    if (!verifyRequest(signature, timestamp, body, DISCORD_PUBLIC_KEY)) {
      return {
        statusCode: 401,
        body: 'Invalid request signature'
      };
    }
    const parsedBody = JSON.parse(body);

    // DiscordからのPINGリクエストへの応答（初回検証用）
    if (parsedBody.type === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({ type: 1 }) // PONG応答
      };
    }

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

function verifyRequest(signature, timestamp, body, publicKey) {
  if (!signature || !timestamp || !body) {
    console.error('署名検証に必要な値が不足しています:', { signature, timestamp, body });
    return false;
  }

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );
}