API
===

import [wechat-lite](https://npmjs.org/package/wechat-lite) first .

```js
const WeChat = require('wechat-lite');

const wx = new WeChat({
  appId     : 'wx-your-app-id',
  appSecret : 'xxxx'
});
```

get authorize url

```js
var url = wx.auth_url('http://lsong.org/callback');
```

when user accept request, browser will redirect

```js
var code = req.query[ 'code' ];
wx.auth_token(code).then(function(token){
  console.log(token);
});
```

get user info

```js
wx.auth_user(token.access_token, token.openid).then(function(user){
  console.log(user);
});
```

send template message

```js
var openId = 'xxx';
var templateId = 'iR3pX6CgJe4n1jPTwyIxxjpeJiSqfmBIuqmRoShFo4E';

api.template_send(templateId, {
  name  : {
    color: '#ff0000',
    value: '测试商品'
  },
  remark: {
    color: '#00ff00',
    value: '测试备注'
  }
}, 'https://lsong.org', openId)
.then(function(res){
  console.log(res);
});
```

wxapp send template message

```js
wx.wxopen_template_send(
  'your-wxapp-openid'                          , // openId
  '1e60145c56aa234690f7b3bc0ab140a0'           , // formId
  'ZfBzzxZglGXrozh7erVXJ-OixRmDM6UiHkMGO76hFEI', // templateId
  {
    keyword1: 'keyword1',
    keyword2: 'keyword2',
    keyword3: 'keyword3'
  }
).then(function(res){
  console.log(res);
});
```
