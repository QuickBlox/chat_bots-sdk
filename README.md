# Overview
A set of node.js code samples to help you build chat bots for QuickBlox

Also can be used with Q-municate messenger https://qm.quickblox.com 

# How to run
Use next command to run a bot:
```bash
node examples/echo_one_to_one_bot/echo_one_to_one_bot.js 
```

Use next command to run a bot in background:
```bash
nohup node examples/echo_one_to_one_bot/echo_one_to_one_bot.js & 
```

Sometimes it's useful to automatically run a script on a Linux when it boots up.
We prepared the [**init.d**](https://github.com/QuickBlox/chat_bots-sdk/tree/master/init.d) script which can be used to manage the Chat bot.
First of all copy it to **/etc/init.d/** directory on your Linux.

Then make the script executable:
```bash
sudo chmod +x /etc/init.d/qbchatbot
```

Next you can start a chat bot with this command:
```bash
sudo /etc/init.d/qbchatbot start
```

...and stop it again with this one:
```bash
sudo /etc/init.d/qbchatbot stop
```

In order to make the bot run on start up, it's necessary to run this command:
```bash
sudo update-rc.d qbchatbot defaults
```

This creates a link to **/etc/init.d/qbchatbot** in directories from **/etc/rc0.d** through to **/etc/rc6.d**. When Linux boots up or shuts down, it looks in these folders to see if any scripts or programs need to be run. When You restart your server the chat bot starts automatically.

# LICENSE
BSD
