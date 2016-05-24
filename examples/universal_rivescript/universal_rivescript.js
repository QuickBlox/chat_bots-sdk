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
riveScriptGenerator.loadFile("replies.rive", loadingDone, loadingError);

function loadingDone (batch_num) {
	console.log("(RiveScript) Batch #" + batch_num + " has finished loading!");

	// Now the replies must be sorted!
	riveScriptGenerator.sortReplies();
}

function loadingError (batch_num, error) {
	console.log("(RiveScript) Error when loading files: " + error);
}


// Init XMPP CLient
//
var client = new Client({
  jid: QB.chat.helpers.getUserJid(CONFIG.user.id) + "/" + "chatbot_" + Math.floor(Math.random() * 16777216).toString(16),
  password: CONFIG.user.password,
  reconnect: true
});

client.connection.socket.setTimeout(0)
client.connection.socket.setKeepAlive(true, 10000)

client.on('online', function () {
  console.log('online');

	// send initial presence
  client.send('<presence/>');

	// join group chat dialog
	joinGroupChats(CONFIG.dialogIds)
});

client.on('stanza', function (stanza) {
  if (stanza.is('message')){

		var replyStanza = processMessage(stanza)
		if(replyStanza){
			client.send(replyStanza)
		}

  }else if (stanza.is('presence')){
		presencePresence(stanza);
  }
});

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


////

function joinGroupChats(dialogIds){
  dialogIds.forEach(function(dialogId, index){
    var joinPresence = new Client.Stanza('presence', {
  			to: QB.chat.helpers.getRoomJidFromDialogId(dialogId) + "/" + CONFIG.user.id
  	});
  	joinPresence.c('x', {xmlns: 'http://jabber.org/protocol/muc'}).c('history', {maxstanzas: 0});
  	client.send(joinPresence);
  });
}

function presencePresence(stanza){
	var x = stanza.getChild('x');

	// Group chat join response
	if(x && x.attrs.xmlns == "http://jabber.org/protocol/muc#user"){
		var status = x.getChild('status')
		if(status && status.attrs.code == "110"){
			console.log("group chat joined " + stanza.attrs.from);
		}

	// Subscription Request
	}else if(stanza.attrs.type == "subscribe"){
		var fromJid = stanza.attrs.from
		client.send(generatePresenceSubscribed(fromJid))
		client.send(generatePresenceSubscribe(fromJid))
	}
}

function processMessage(stanza){
  if (stanza.attrs.type == 'groupchat') {
		var bodyChild = stanza.getChild('body')
		var fromArray = stanza.attrs.from.split("/")
		var fromResource = fromArray[1]

		// - skip own messages in the group chat, don't replay to them
		// - reply only when someone mentions you. For example: "@YourBotBestFriend how are you?"
		var mentionStartIndex = -1
		var mentionPattern = "@" + CONFIG.user.fullname
		var mentionLength = mentionPattern.length
		if(bodyChild){
			mentionStartIndex = bodyChild.getText().indexOf(mentionPattern)
		}
		if(fromResource != CONFIG.user.id && mentionStartIndex > -1){

			// build a reply
			var realBody
			if(mentionStartIndex == 0 && bodyChild.getText().substring(mentionLength, mentionLength+1) == " "){
				realBody = bodyChild.getText().substring(mentionLength+1);
			}else{
				realBody = "What's up? I react only for commands like this: '@YourBotBestFriend <text>'"
			}

			var extraParamsChild = stanza.getChild('extraParams');
			var dialogId = extraParamsChild.getChild('dialog_id').getText();

			return generateReplyStanza(true, fromArray[0], generateReplyText(realBody), dialogId)
		}
	} else if (stanza.attrs.type == 'chat') {
    	var bodyChild = stanza.getChild('body')
			if(bodyChild){
	      var inputText = bodyChild.getText();

				var extraParamsChild = stanza.getChild('extraParams');
				var dialogId = extraParamsChild.getChild('dialog_id').getText();

				return generateReplyStanza(false, stanza.attrs.from, generateReplyText(inputText), dialogId)
			}
	}
}

function generateReplyStanza(isGroup, toJid, bodyText, dialogId){
	var stanza = new Client.Stanza('message', {to: toJid, type: isGroup ? 'groupchat': 'chat'});

	stanza.c('body', {xmlns: 'jabber:client'}).t(bodyText).up()
	stanza.c('markable', {xmlns: 'urn:xmpp:chat-markers:0'}).up()
	stanza.c('extraParams', {xmlns: 'jabber:client'}).
		c("save_to_history").t('1').up().
		c("date_sent").t(Math.floor(Date.now() / 1000)).up()

	if(isGroup){
		stanza.getChild('extraParams').c("dialog_id").t(dialogId).up()
	}

	stanza.attrs.id = QB.chat.helpers.getBsonObjectId();

	return stanza
}

function generateReplyText(inputText){
  var reply = riveScriptGenerator.reply("local-user", inputText);
  return reply
}

function generatePresenceSubscribed(toJid){
	var stanza = new Client.Stanza('presence', {to: toJid, type: "subscribed"});
	return stanza
}

function generatePresenceSubscribe(toJid){
	var stanza = new Client.Stanza('presence', {to: toJid, type: "subscribe"});
	return stanza
}
