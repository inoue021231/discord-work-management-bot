const nacl = require('tweetnacl'); // `tweetnacl` を使って署名検証
require('dotenv').config(); // .envから環境変数を読み込む

// verifyRequest 関数を追加
function verifyRequest(signature, timestamp, body, publicKey) {
  // 署名の検証
  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );
}

exports.handler = async (event, context) => {
  const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

  if (event.httpMethod === 'POST') {
    const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const body = event.body;

    // 署名検証
    const isVerified = verifyRequest(signature, timestamp, body, DISCORD_PUBLIC_KEY);

    if (!isVerified) {
      return {
        statusCode: 401,
        body: 'Invalid request signature'
      };
    }

    const parsedBody = JSON.parse(body);
    
    console.log(parsedBody.data.name === 'hello');
    // ** PINGリクエストへの即時応答 **
    if (parsedBody.type === 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({ type: 1 }),
      };
    }

    // コマンド処理は非同期で行う
    setImmediate(async () => {
      console.log('Handling command:', parsedBody.data.name);
      // 必要に応じて非同期での処理をここで行う
    });

    // すぐにレスポンスを返す
    return {
      statusCode: 200,
      body: JSON.stringify({
        type: 4,
        data: {
          content: 'hello world'
        }
      }),
    };
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};