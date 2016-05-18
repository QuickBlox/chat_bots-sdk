'use strict'

var CONFIG = require('./config').CONFIG;
var Client= require('node-xmpp-client');
var QB = require('quickblox');
var RiveScript = require('rivescript');

// Init QuickBlox
//
QB.init(CONFIG.appId, CONFIG.authKey, CONFIG.authSecret);

// Init RiveScript
//
var riveScriptGenerator = new RiveScript();
riveScriptGenerator.loadFile("replies.rive", loading_done, loading_error);

function loading_done (batch_num) {
	console.log("(RiveScript) Batch #" + batch_num + " has finished loading!");

	// Now the replies must be sorted!
	riveScriptGenerator.sortReplies();
}

function loading_error (batch_num, error) {
	console.log("(RiveScript) Error when loading files: " + error);
}

// Init XMPP CLient
//
var client = new Client({
  jid: QB.chat.helpers.getUserJid(CONFIG.user_id, CONFIG.app_id ) + "/" + generateUUID(),
  password: CONFIG.user_password,
  reconnect: true
});

client.connection.socket.setTimeout(0)
client.connection.socket.setKeepAlive(true, 10000)

client.on('online', function () {
  console.log('online')
  client.send('<presence/>')
});

client.on('stanza', function (stanza) {
  if (stanza.is('message') &&
    // Important: never reply to errors!
    (stanza.attrs.type !== 'error')) {

    var bodyChild = stanza.getChild('body')

    if(bodyChild){

      // Swap addresses...
      stanza.attrs.to = stanza.attrs.from
      delete stanza.attrs.from

      var extraParams = stanza.getChild('extraParams')
      var dateSent = extraParams.getChild('date_sent')

      stanza.attrs.id = QB.chat.helpers.getBsonObjectId();

      dateSent.text = Math.floor(Date.now() / 1000)

      // generate a reply and send it back
      var inputText = bodyChild.getText();
      var outputText = generateReply(inputText);
      bodyChild.children[0] = outputText

      // and send back
      client.send(stanza)
    }
  }
});

function generateReply(inputText){
  var reply = riveScriptGenerator.reply("local-user", inputText);
  return reply
}

client.on('offline', function () {
  console.log('Client is offline')
});

client.on('connect', function () {
  console.log('Client is connected')
});

client.on('reconnect', function () {
  console.log('Client reconnects …')
});

client.on('disconnect', function (e) {
  console.log('Client is disconnected', client.connection.reconnect, e)
});

client.on('error', function (e) {
  console.error(e)
  process.exit(1)
});

process.on('exit', function () {
  client.end()
});

///

function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};
