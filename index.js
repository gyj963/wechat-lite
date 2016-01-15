'use strict';
const crypto        = require('crypto');
const EventEmitter  = require('events');
const qs            = require('querystring');
const request       = require('superagent');
const debug         = require('debug')('wechat');
const ERROR_CODES   = require('./errcode');
const promiseify    = require('./promiseify');
/**
 * WechatAuth
 */
class WechatAuth extends EventEmitter {
  /**
   * [constructor description]
   * @param  {[type]} appId     [description]
   * @param  {[type]} appSecret [description]
   * @return {[type]}           [description]
   */
  constructor(appId, appSecret){
    super();
    this.options = {
      appId     : appId,
      appSecret : appSecret,
      timeout   : 2000
    };
  }
  /**
   * [throwError description]
   * @param  {[type]}   err      [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  throwError(msg, err){
    if(err){
      err.msg = msg;
    }else{
      err = new Error(msg);
    }
    // err.msg = msg;
    this.emit('error', err);
    throw err;
  }
  /**
   * [handleResponse description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  handleResponse(callback){
    var self = this;
    return function(err, res){
      try{
        if(err)       return self.throwError(`network error: ${err}`);
        if(!res.ok)   return self.throwError(`server response status code is not ok (${res.statusCode})`);
        if(Object.keys(res.body)) res.body = JSON.parse(res.text);
          // return self.throwError(`can not parse body from server response: ${res.text}`);
        //
        var errcode = res.body[ 'errcode' ];
        var errmsg  = res.body[ 'errmsg'  ] || ERROR_CODES[ errcode ];
        if(!!errcode) return self.throwError(`server receive an error: ${errmsg}`);
        //
        debug(res.body);
        callback(null, res.body);
      }catch(e){
        debug(e);
        callback(e);
      }
    };
  }
  /**
   * [getToken description]
   * @param  {[type]} grantType [description]
   * @return {[type]}           [description]
   * @docs http://mp.weixin.qq.com/wiki/11/0e4b294685f817b95cbed85ba5e82b8f.html
   */
  getToken(grantType){
    var self = this;
    return promiseify(function(callback){
      request
      .get(`https://api.weixin.qq.com/cgi-bin/token`)
      .query({
        appid     : self.options.appId     ,
        secret    : self.options.appSecret ,
        grant_type: grantType || 'client_credential'
      })
      .timeout(self.options.timeout)
      .end(self.handleResponse(callback));
    });
  }
  /**
   * [getTicket description]
   * @param  {[type]} token [description]
   * @return {[type]}       [description]
   */
  getTicket(token){
    var self = this;
    return promiseify(function(callback){
      request
      .get(`https://api.weixin.qq.com/cgi-bin/ticket/getticket`)
      .query({
        type         : 'jsapi',
        access_token : token
      })
      .timeout(self.options.timeout)
      .end(self.handleResponse(callback));
    });
  }
  /**
   * [genSignature description]
   * @param  {[type]} ticket [description]
   * @return {[type]}        [description]
   */
  genSignature(ticket){
    function signature(params){
      var shasum = crypto.createHash('sha1');
      shasum.update(Object.keys(params).sort().map(function(key){
        return [ key , params[ key ] ].join('=');
      }).join('&'));
      params.signature = shasum.digest('hex');
      return params;
    }
    return function(url){
      var nonce     = Math.random().toString(36).substr(2);
      var timestamp = parseInt(new Date / 1000);
      return signature({
        jsapi_ticket : ticket   ,
        noncestr     : nonce    ,
        timestamp    : timestamp,
        url          : url
      });
    }
  }
  /**
   * [checkSignature description]
   * @param  {[type]} params    [description]
   * @param  {[type]} signature [description]
   * @return {[type]}           [description]
   * @docs http://mp.weixin.qq.com/wiki/4/2ccadaef44fe1e4b0322355c2312bfa8.html
   */
  checkSignature(token, timestamp, nonce, signature, echostr){
    var sha1 = crypto.createHash('sha1');
    sha1.update([ token, timestamp, nonce ].sort().join(''));
    return (sha1.digest('hex') == signature) && (echostr || true);
  }
  /**
   * [getCallbackIP description]
   * @param  {[type]} token [description]
   * @return {[type]}       [description]
   * @docs http://mp.weixin.qq.com/wiki/0/2ad4b6bfd29f30f71d39616c2a0fcedc.html
   */
  getCallbackIP(token){
    var self = this;
    return promiseify(function(callback){
      request
      .get(`${this.options.api}/getcallbackip`)
      .query({ access_token: token })
      .end(self.handleResponse(callback));
    });
  }
  /**
   * [getAuthorizeToken description]
   * @param  {[type]} code [description]
   * @return {[type]}      [description]
   * @docs https://mp.weixin.qq.com/wiki/17/c0f37d5704f0b64713d5d2c37b468d75.html
   */
  getAuthorizeToken(code){
    var self = this;
    return promiseify(function(callback){
      request
      .get('https://api.weixin.qq.com/sns/oauth2/access_token')
      .query({
        appid : self.options.appId,
        secret: self.options.appSecret,
        code  : code,
        grant_type: 'authorization_code'
      })
      .end(self.handleResponse(callback));
    });
  }
  checkAuthorizeToken(){
    //https://api.weixin.qq.com/sns/auth?access_token=ACCESS_TOKEN&openid=OPENID
  }
  refreshAuthorizeToken(){
    //https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=APPID&grant_type=refresh_token&refresh_token=REFRESH_TOKEN
  }
  getUser(token, openId, language){
    var self = this;
    return promiseify(function(callback){
      request
      .get('https://api.weixin.qq.com/sns/userinfo')
      .query({
        access_token  : token ,
        openid        : openId,
        lang          : language || 'zh_CN'
      })
      .end(self.handleResponse(callback));
    });
  }
  getAuthorizeURL(callbackURL, scope, state){
    var api = 'https://open.weixin.qq.com/connect/oauth2/authorize';
    var querystring = qs.stringify({
      appid         : this.options.appId  ,
      redirect_uri  : callbackURL         ,
      response_type : 'code'              ,
      scope         : scope               ,
      state         : state
    });
    return [ api, '?' ,querystring ,'#wechat_redirect' ].join('');
  }
}

module.exports = WechatAuth;
