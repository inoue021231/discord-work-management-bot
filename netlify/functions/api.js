const fetch = require('node-fetch');
require('dotenv').config();

exports.handler = async (event, context) => {
  const parsedBody = JSON.parse(event.body);

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 5 }),
  };
  const commandName = parsedBody.data.name;
  const taskName = parsedBody.data.options.find(option => option.name === 'タスク名').value;
  const userId = parsedBody.member.user.id;

  const sheetData = {
    discordToken: parsedBody.token,
    appId: process.env.APP_ID,
    command: commandName,
    task: taskName,
    userId: userId
  };

  fetch('https://discord-work-management-bot.netlify.app/.netlify/functions/writesheet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sheetData),
  })
    .then(response => {
      if (!response.ok) {
        console.error(`Failed to send data: ${response.status} ${response.statusText}`);
      } else {
        console.log('Data successfully sent to the second endpoint');
      }
    })
    .catch(error => {
      console.error('Error sending data to write-to-sheet endpoint:', error);
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    
  return response;
};