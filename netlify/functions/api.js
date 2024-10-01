const nacl = require('tweetnacl'); // Discordの署名検証用
require('dotenv').config(); // .envファイルから環境変数を読み込む

// verifyRequest関数: Discordのリクエスト署名を検証する
function verifyRequest(signature, timestamp, body, publicKey) {
  // 署名の検証
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );
}

exports.handler = async (event, context) => {
  const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY; // Discordの公開鍵

  if (event.httpMethod === 'POST') {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const body = event.body;

    // 署名の検証
    const isVerified = verifyRequest(signature, timestamp, body, DISCORD_PUBLIC_KEY);
    console.log('Is request verified:', isVerified);

    if (!isVerified) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 1 }), // PONG応答
      };
    }

    // /hello コマンドへの応答
    if (parsedBody.data && parsedBody.data.name === 'hello') {
      console.log('Received hello command');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 4, // 4は応答メッセージのタイプ
          data: {
            content: 'hello world' // 返すメッセージ
          }
        }),
      };
    }

    // 不明なコマンドが来た場合の応答
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

  // POST以外のリクエストに対する応答
  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};
