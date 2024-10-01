exports.handler = async (event, context) => {
  // Discordのコマンドを受け取ったら "hello world" と返す
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      
      // 簡単な検証：特定のコマンドに対して応答する
      if (body.content && body.content === '!hello') {
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
          type: 4, // 応答メッセージのタイプ
          data: {
            content: 'Invalid command'
          }
        }),
      };
    } catch (error) {
      console.error('エラーが発生しました:', error);
      return {
        statusCode: 500,
        body: 'Internal Server Error'
      };
    }
  }

  // POST以外のリクエストに対する応答
  return {
    statusCode: 405,
    body: 'Method Not Allowed'
  };
};