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
  jid: QB.chat.helpers.getUserJid(CONFIG.user_id) + "/" + generateUUID(),
  password: CONFIG.user_password,
  reconnect: true
});

client.connection.socket.setTimeout(0)
client.connection.socket.setKeepAlive(true, 10000)

client.on('online', function () {
  console.log('online')
  client.send('<presence/>')

  // join group chat dialog
  var joinPresence = new Client.Stanza('presence', {
      to: QB.chat.helpers.getRoomJidFromDialogId(CONFIG.dialogId) + "/" + CONFIG.user_id
    })
  joinPresence.c('x', {xmlns: 'http://jabber.org/protocol/muc'}).c('history', {maxstanzas: 0})
  client.send(joinPresence)
});

client.on('stanza', function (stanza) {
  if (stanza.is('message')){
    if (stanza.attrs.type == 'groupchat') {
      var bodyChild = stanza.getChild('body')
      var fromArray = stanza.attrs.from.split("/")
      var fromResource = fromArray[1]

      // - skip own messages in the group chat, don't replay to them
      // - reply only when someone mentions you. For example: "@YourBotBestFriend how are you?"
      var mentionStartIndex = -1
      var mentionPattern = "@" + CONFIG.userFullname
      var mentionLength = mentionPattern.length
      if(bodyChild){
        mentionStartIndex = bodyChild.getText().indexOf(mentionPattern)
      }
      if(fromResource != CONFIG.user_id && mentionStartIndex > -1){

        // build a reply
        var realBody
        if(mentionStartIndex == 0 && bodyChild.getText().substring(mentionLength, mentionLength+1) == " "){
          realBody = bodyChild.getText().substring(mentionLength+1);
        }else{
          realBody = "What's up? I react only for commands like this: '@YourBotBestFriend <text>'"
        }

        // Swap addresses...
        stanza.attrs.to = fromArray[0];
        delete stanza.attrs.from

        stanza.attrs.id = QB.chat.helpers.getBsonObjectId();

        var outputText = generateReply(realBody);
        bodyChild.children[0] = outputText

        var extraParams = stanza.getChild('extraParams')
        var dateSentChild = extraParams.getChild('date_sent')
        dateSentChild.text = Math.floor(Date.now() / 1000)

        // and send back
        client.send(stanza)
      }
    }
  }else if (stanza.is('presence')){
    var x = stanza.getChild('x');
    if(x){
      var status = x.getChild('status')
      if(status && status.attrs.code == "110"){
        console.log("group chat joined");
      }
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
