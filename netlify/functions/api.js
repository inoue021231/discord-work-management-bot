exports.handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    /* const signature = event.headers['x-signature-ed25519'];
    const timestamp = event.headers['x-signature-timestamp'];
    const body = event.body;

    const parsedBody = JSON.parse(body); */
    
    console.log("hello?");
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