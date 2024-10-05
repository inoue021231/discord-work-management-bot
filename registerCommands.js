const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'newtask',
    description: 'タスク新規作成',
    options: [
      {
        name: 'タスク名',
        type: 3, // 文字列型
        description: '他タスクと重複不可',
        required: true,
      }
    ]
  },
  {
    name: 'starttask',
    description: 'タスク開始',
    options: [
      {
        name: 'タスク名',
        type: 3, // 文字列型
        description: '開始するタスク名',
        required: true,
      }
    ]
  },
  {
    name: 'endtask',
    description: 'タスク終了',
    options: [
      {
        name: 'タスク名',
        type: 3, // 文字列型
        description: '終了するタスク名',
        required: true,
      }
    ]
  },
  {
    name: 'showtask',
    description: 'タスク履歴を表示',
    options: [
      {
        name: 'タスク名',
        type: 3, // 文字列型
        description: '表示するタスク名',
        required: true,
      }
    ]
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
