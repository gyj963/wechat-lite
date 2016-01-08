var crypto = require('crypto');
var jstoxml = require('jstoxml');

var msgQueue = [];

var getFirst = function(arr){
  return arr[0];
};

var parseMsg = function(data){
  for(var key in data){
    data[key] = getFirst(data[key]);
  }
  return data;
};

var getReplyMsg = function(msg, type, message){
  var replyMsg = {
    FromUserName: msg['ToUserName'],
    ToUserName  : msg['FromUserName'],
    CreateTime  : parseInt(+new Date / 1000)
  };
  switch(type){
    case 'text':
      replyMsg['Content'] = message;
      break;
    case 'image':
      replyMsg['Image'] = {
        MediaId: message
      };
      break;
    case 'voice':
      replyMsg['Voice'] = {
        MediaId: message
      };
      break;
    case 'music':
      replyMsg['Music'] = {
        Title: message['title'],
        Description: message['description'],
        ThumbMediaId: message['pic'],
        MusicUrl: message['url'],
        HQMusicUrl: message['hq_url']
      };
      break;
    case 'video':
      replyMsg['Video'] = {
        Title: message['title'],
        Description: message['description'],
        MediaId: message['MediaId']
      };
      break;
    case 'news':
      var articles = [];
      message.forEach(function(article){
        var item = {
          Title: article['title'],
          Description: article['description'],
          PicUrl: article['pic'],
          Url: article['url']
        };
        articles.push({ item: item });
      });
      replyMsg['Articles'] = articles;
      replyMsg['ArticleCount'] = articles.length;
      break;
    default:
      message = type;
      type = 'text';
      replyMsg['Content'] = message;
      break;
  }
  replyMsg['MsgType'] = type;
  return replyMsg;
};

var wechat = function(token, callback){
  return function(req, res){
    checkSignature(token, req, res, function(){
      var body = req.body;
      var data = req.body['xml'];
      var msg = parseMsg(data);
      res.reply = function(type, message){
        var replyMsg = getReplyMsg(msg, type, message);
        var xml = jstoxml.toXML({ xml: replyMsg });
        res.send(xml);
      };
      var seed  = msg.CreateTime;
      if(!~msgQueue.indexOf(seed)){
        msgQueue.push(seed);
        req.msg = msg;
        callback(req, res);
      }
    });
  };
};

module.exports = wechat;
