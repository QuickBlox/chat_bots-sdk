'use strict'

var CONFIG = require('./config').CONFIG;
var Client= require('node-xmpp-client');
var QB = require('quickblox');

QB.init(CONFIG.appId, CONFIG.authKey, CONFIG.authSecret);

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

    var body = stanza.getChild('body')

    if(body){

      // Swap addresses...
      stanza.attrs.to = stanza.attrs.from
      delete stanza.attrs.from

      var extraParams = stanza.getChild('extraParams')
      var dateSent = extraParams.getChild('date_sent')

      stanza.attrs.id = QB.chat.helpers.getBsonObjectId();

      dateSent.text = Math.floor(Date.now() / 1000)

      // and send back
      client.send(stanza)
    }
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
