(function (global, factory) {
  if (typeof define === 'function' && (define.amd || define.cmd)) {
    define(function() {
      return factory(global);
    });
  } else {
    factory(global, true);
  }
}(this, function (window, isGlobal) {
  if (window.jWeixin) return;

  function _invokeMethod(name, args, ext) {
    if (window.WeixinJSBridge) {
      WeixinJSBridge.invoke(name, _addVerifyParams(args), function (res) {
        _methodCallback(name, res, ext);
      });
    } else {
      _log(name, ext);
    }
  }

  function _onMethod(name, ext, innerInvokeArgs) {
    if (window.WeixinJSBridge) {
      WeixinJSBridge.on(name, function (res) {
        innerInvokeArgs && innerInvokeArgs.trigger && innerInvokeArgs.trigger(res);
        _methodCallback(name, res, ext);
      });
    } else {
      if (innerInvokeArgs) {
        _log(name, innerInvokeArgs);
      } else {
        _log(name, ext);
      }
    }
  }

  function _addVerifyParams(args) {
    args = args || {};
    args.appId = config.appId;
    args.verifyAppId = config.appId;
    args.verifySignType = 'sha1';
    args.verifyTimestamp = config.timestamp + '';
    args.verifyNonceStr = config.nonceStr;
    args.verifySignature = config.signature;
    return args;
  }

  function _getPayVerifyParams(args) {
    return {
      timeStamp: args.timestamp + '',
      nonceStr: args.nonceStr,
      package: args.package,
      paySign: args.paySign,
      signType: args.signType || 'SHA1'
    }
  }

  function _getAddressResult(res) {
    res.postalCode = res.addressPostalCode;
    delete res.addressPostalCode;
    res.provinceName = res.proviceFirstStageName;
    delete res.proviceFirstStageName;
    res.cityName = res.addressCitySecondStageName;
    delete res.addressCitySecondStageName;
    res.countryName = res.addressCountiesThirdStageName;
    delete res.addressCountiesThirdStageName;
    res.detailInfo = res.addressDetailInfo;
    delete res.addressDetailInfo;
    return res;
  }

  function _methodCallback(name, res, ext) {
    if (name == 'openEnterpriseChat') {
      res.errCode = res.err_code;
    }
    delete res.err_code;
    delete res.err_desc;
    delete res.err_detail;
    var errMsg = res.errMsg;
    if (!errMsg) {
      errMsg = res.err_msg;
      delete res.err_msg;
      errMsg = _formatErrMsg(name, errMsg);
      res.errMsg = errMsg;
    }
    ext = ext || {};
    if (ext._complete) {
      ext._complete(res);
      delete ext._complete;
    }
    errMsg = res.errMsg || '';
    if (config.debug && !ext.isInnerInvoke) {
      alert(JSON.stringify(res));
    }
    var index = errMsg.indexOf(':');
    var keyword = errMsg.substring(index + 1);
    switch (keyword) {
      case 'ok':
        ext.success && ext.success(res);
        break;
      case 'cancel':
        ext.cancel && ext.cancel(res);
        break;
      default:
        ext.fail && ext.fail(res);
        break;
    }
    ext.complete && ext.complete(res);
  }

  function _formatErrMsg(name, errMsg) {
    var jsApiName = name;
     var apiSdkName = sdkApiMethods[jsApiName];
     if (apiSdkName) {
       jsApiName = apiSdkName;
     }
    var keyword = 'ok';
    if (errMsg) {
      var index = errMsg.indexOf(':');
      keyword = errMsg.substring(index + 1);
      if (keyword == 'confirm') {
        keyword = 'ok';
      }
      if (keyword == 'failed') {
        keyword = 'fail';
      }
      if (keyword.indexOf('failed_') != -1) {
        keyword = keyword.substring(7);
      }
      if (keyword.indexOf('fail_') != -1) {
        keyword = keyword.substring(5);
      }
      keyword = keyword.replace(/_/g, ' ');
      keyword = keyword.toLowerCase();
      if (keyword == 'access denied' || keyword == 'no permission to execute') {
        keyword = 'permission denied';
      }
      if (jsApiName == 'config' && keyword == 'function not exist') {
        keyword = 'ok';
      }
      if (keyword == '') {
        keyword = 'fail';
      }
    }
    errMsg = jsApiName + ':' + keyword;
    return errMsg;
  }

  function _getRealJsApiList(jsApiList) {
    if (!jsApiList) return;
    for (var i = 0, length = jsApiList.length; i < length; ++i) {
      var jsApiName = jsApiList[i];
      var realJsApiName = apiSdkMethods[jsApiName];
      if (realJsApiName) {
        jsApiList[i] = realJsApiName;
      }
    };
    return jsApiList;
  }

  function _log(name, args) {
    if (!config.debug || (args && args.isInnerInvoke)) return;
    var apiSdkName = sdkApiMethods[name];
    if (apiSdkName) {
      name = apiSdkName;
    }
    if (args && args._complete) {
      delete args._complete;
    }
    console.log('"' + name + '",', args || '');
  }

  function _report(args) {
    if (isPc || isDebugger || config.debug || clientVersion < '6.0.2' || reportData.systemType < 0) return;
    var img = new Image;
    reportData.appId = config.appId;
    reportData.initTime = timeRecorder.initEndTime - timeRecorder.initStartTime;
    reportData.preVerifyTime = timeRecorder.preVerifyEndTime - timeRecorder.preVerifyStartTime;
    jWeixin.getNetworkType({
      isInnerInvoke: true,
      success: function(res) {
        reportData.networkType = res.networkType;
        var url = 'https://open.weixin.qq.com/sdk/report?v=' + reportData.version + '&o=' + reportData.isPreVerifyOk + '&s=' + reportData.systemType + '&c=' + reportData.clientVersion + '&a=' + reportData.appId + '&n=' + reportData.networkType + '&i=' + reportData.initTime + '&p=' + reportData.preVerifyTime + '&u=' + reportData.url;
        img.src = url;
      }
    });
  }

  function _getTime() {
    return (new Date).getTime();
  }

  function _bindReadyEvent(fn) {
    if (!isWeixin) return;

    if (!window.WeixinJSBridge) {
      document.addEventListener && document.addEventListener('WeixinJSBridgeReady', fn, false);
    } else {
      fn();
    }
  }

  function _registerInvokeAndOnEvent() {
    if (jWeixin.invoke) return;
    jWeixin.invoke = function(name, args, fn) {
      window.WeixinJSBridge && WeixinJSBridge.invoke(name, _addVerifyParams(args), fn);
    }
    jWeixin.on = function(name, fn) {
      window.WeixinJSBridge && WeixinJSBridge.on(name, fn);
    }
  }

  function _addHTMLToPath(url) {
    if (typeof url === 'string' && url.length > 0) {
      var path = url.split('?')[0];
      var query = url.split('?')[1];

      path += '.html';
      if (typeof query !== 'undefined') {
        return path + '?' + query;
      } else {
        return path;
      }
    } else {
      return undefined
    }
  }

  var apiSdkMethods = {
    config: 'preVerifyJSAPI',
    onMenuShareTimeline: 'menu:share:timeline',
    onMenuShareAppMessage: 'menu:share:appmessage',
    onMenuShareQQ: 'menu:share:qq',
    onMenuShareWeibo: 'menu:share:weiboApp',
    onMenuShareQZone: 'menu:share:QZone',
    // playMusic: 'musicPlay',
    previewImage: 'imagePreview',
    getLocation: 'geoLocation',
    openProductSpecificView: 'openProductViewWithPid',
    addCard: 'batchAddCard',
    openCard: 'batchViewCard',
    chooseWXPay: 'getBrandWCPayRequest',
    // bindCardWithWXPay: 'getBrandWCPayBindCardRequest',
    // transferMoney: 'getTransferMoneyRequest',
    // openWXPaySpecificView: 'openWCPaySpecificView',
    // createWXCreditCard: 'getBrandWCPayCreateCreditCardRequest',
    openEnterpriseRedPacket: 'getRecevieBizHongBaoRequest',
    startSearchBeacons: 'startMonitoringBeacons',
    stopSearchBeacons: 'stopMonitoringBeacons',
    onSearchBeacons: 'onBeaconsInRange',
    consumeAndShareCard: 'consumedShareCard',
    openAddress: 'editAddress',
  }
  var sdkApiMethods = (function() {
    var _sdkApiMethods = {};
    for (var i in apiSdkMethods) {
      _sdkApiMethods[apiSdkMethods[i]] = i;
    }
    return _sdkApiMethods;
  })();
  var document = window.document;
  var title = document.title;
  var ua = navigator.userAgent.toLowerCase();
  var platform = navigator.platform.toLowerCase();
  var isPc = !!(platform.match('mac') || platform.match('win'));
  var isDebugger = ua.indexOf('wxdebugger') != -1;
  var isWeixin = ua.indexOf('micromessenger') != -1;
  var isAndroid = ua.indexOf('android') != -1;
  var isIos = (ua.indexOf('iphone') != -1) || (ua.indexOf('ipad') != -1);
  var clientVersion = (function() {
    var regVersionResult = ua.match(/micromessenger\/(\d+\.\d+\.\d+)/) || ua.match(/micromessenger\/(\d+\.\d+)/);
    return regVersionResult ? regVersionResult[1] : '';
  })();
  var timeRecorder = {
    initStartTime: _getTime(),
    initEndTime: 0,
    preVerifyStartTime: 0,
    preVerifyEndTime: 0
  }
  var reportData = {
    version: 1,
    appId: '',
    initTime: 0,
    preVerifyTime: 0,
    networkType: '',
    isPreVerifyOk: 1,
    systemType: isIos ? 1 : (isAndroid ? 2 : -1),
    clientVersion: clientVersion,
    url: encodeURIComponent(location.href)
  }
  var config = {};
  var preVerifyArgs = {
    _completes: []
  };
  var preVerifyResult = {
    state: 0,
    data: {}
  };
  _bindReadyEvent(function() {
    timeRecorder.initEndTime = _getTime();
  });

  var getLocalImgDataLock = false
  var getLocalImgDataQueue = []
  var jWeixin = {
    // 1 基础接口
    // 1.1 注入配置接口
    config: function(args) {
      config = args;
      _log('config', args);
      var isPreVerify = config.check === false ? false : true;
      _bindReadyEvent(function() {
        if (isPreVerify) {
          _invokeMethod(apiSdkMethods.config, {
            verifyJsApiList: _getRealJsApiList(config.jsApiList)
          }, (function() {
            preVerifyArgs._complete = function(res) {
              timeRecorder.preVerifyEndTime = _getTime();
              preVerifyResult.state = 1;
              preVerifyResult.data = res;
            }
            preVerifyArgs.success = function(res) {
              reportData.isPreVerifyOk = 0;
            }
            preVerifyArgs.fail = function(res) {
              if (preVerifyArgs._fail) {
                preVerifyArgs._fail(res);
              } else {
                preVerifyResult.state = -1;
              }
            }
            var _completes = preVerifyArgs._completes;
            _completes.push(function() {
              _report();
            });
            preVerifyArgs.complete = function(res) {
              for (var i = 0, length = _completes.length; i < length; ++i) {
                _completes[i]();
              };
              preVerifyArgs._completes = [];
            }
            return preVerifyArgs;
          })());
          timeRecorder.preVerifyStartTime = _getTime();
        } else {
          preVerifyResult.state = 1;
          var _completes = preVerifyArgs._completes;
          for (var i = 0, length = _completes.length; i < length; ++i) {
            _completes[i]();
          };
          preVerifyArgs._completes = [];
        }
      });
      _registerInvokeAndOnEvent();
    },
    // 1.2 config验证后会执行ready方法
    ready: function(fn) {
      if (preVerifyResult.state != 0) {
        fn();
      } else {
        preVerifyArgs._completes.push(fn);
        if (!isWeixin && config.debug) {
          fn();
        }
      }
    },
    // 1.3 域名没有权限或者签名失败时执行
    error: function(fn) {
      if (clientVersion < '6.0.2') return;
      if (preVerifyResult.state == -1) {
        fn(preVerifyResult.data);
      } else {
        preVerifyArgs._fail = fn;
      }
    },
    // 1.4 判断当前版本是否支持指定JS接口,支持批量判断
    checkJsApi: function(args) {
      var _getCheckResult = function(res) {
        var checkResult = res.checkResult;
        for (var i in checkResult) {
          var jsSdkName = sdkApiMethods[i];
          if (jsSdkName) {
            checkResult[jsSdkName] = checkResult[i];
            delete checkResult[i];
          }
        }
        return res;
      }
      _invokeMethod('checkJsApi', {
        jsApiList: _getRealJsApiList(args.jsApiList)
      }, (function(){
        args._complete = function(res) {
          if (isAndroid) {
            var checkResult = res.checkResult;
            if (checkResult) {
              res.checkResult = JSON.parse(checkResult);
            }
          }
          res = _getCheckResult(res);
        }
        return args;
      })());
    },

    // 2 分享接口
    // 2.1 监听“分享到朋友圈”按钮点击、自定义分享内容及分享结果接口
    onMenuShareTimeline: function(args) {
      _onMethod(apiSdkMethods.onMenuShareTimeline, {
        complete: function() {
          _invokeMethod('shareTimeline', {
            title: args.title || title,
            desc: args.title || title,
            img_url: args.imgUrl || '',
            link: args.link || location.href,
            type: args.type || 'link',
            data_url: args.dataUrl || ''
          }, args);
        }
      }, args);
    },
    // 2.2 监听“分享给朋友”按钮点击、自定义分享内容及分享结果接口
    onMenuShareAppMessage: function(args) {
      _onMethod(apiSdkMethods.onMenuShareAppMessage, {
        complete: function(res) {
          if (res.scene === 'favorite') {
            // 收藏，不给调用回调
            _invokeMethod('sendAppMessage', {
                title: args.title || title,
                desc: args.desc || '',
                link: args.link || location.href,
                img_url: args.imgUrl || '',
                type: args.type || 'link',
                data_url: args.dataUrl || ''
            });
          } else {
            // 不是收藏，走原来的逻辑
            _invokeMethod('sendAppMessage', {
                title: args.title || title,
                desc: args.desc || '',
                link: args.link || location.href,
                img_url: args.imgUrl || '',
                type: args.type || 'link',
                data_url: args.dataUrl || ''
            }, args);
          }
        }
      }, args);
    },
    // 2.3 监听“分享到QQ”按钮点击分享状态及自定义分享内容
    onMenuShareQQ: function(args) {
      _onMethod(apiSdkMethods.onMenuShareQQ, {
        complete: function() {
          _invokeMethod('shareQQ', {
            title: args.title || title,
            desc: args.desc || '',
            img_url: args.imgUrl || '',
            link: args.link || location.href
          }, args);
        }
      }, args);
    },
    // 2.4 监听“分享到微博”按钮点击分享状态及自定义分享内容
    onMenuShareWeibo: function(args) {
      _onMethod(apiSdkMethods.onMenuShareWeibo, {
        complete: function() {
          _invokeMethod('shareWeiboApp', {
            title: args.title || title,
            desc: args.desc || '',
            img_url: args.imgUrl || '',
            link: args.link || location.href
          }, args);
        }
      }, args);
    },
    // 2.5 监听“分享到QZone”按钮点击分享状态及自定义分享内容
    onMenuShareQZone: function(args) {
      _onMethod(apiSdkMethods.onMenuShareQZone, {
        complete: function() {
          _invokeMethod('shareQZone', {
            title: args.title || title,
            desc: args.desc || '',
            img_url: args.imgUrl || '',
            link: args.link || location.href
          }, args);
        }
      }, args);
    },

    // 3 音频接口
    // 3.1 开始录音
    startRecord: function(args) {
      _invokeMethod('startRecord', {}, args);
    },
    // 3.2 停止录音
    stopRecord: function(args) {
      _invokeMethod('stopRecord', {}, args);
    },
    // 3.3 监听录音自动停止
    onVoiceRecordEnd: function(args) {
      _onMethod('onVoiceRecordEnd', args);
    },
    // 3.4 播放音频
    playVoice: function(args) {
      _invokeMethod('playVoice', {
        localId : args.localId
      }, args);
    },
    // 3.5 暂停播放音频
    pauseVoice: function(args) {
      _invokeMethod('pauseVoice', {
        localId : args.localId
      }, args);
    },
    // 3.6 停止播放音频
    stopVoice: function(args) {
      _invokeMethod('stopVoice', {
        localId : args.localId
      }, args);
    },
    // 3.7 监听音频播放自动停止
    onVoicePlayEnd: function(args) {
      _onMethod('onVoicePlayEnd', args);
    },
    // 3.8 上传语音
    uploadVoice: function(args) {
      _invokeMethod('uploadVoice', {
        localId : args.localId,
        isShowProgressTips: args.isShowProgressTips == 0 ? 0 : 1
      }, args);
    },
    // 3.9 下载语音
    downloadVoice: function(args) {
      _invokeMethod('downloadVoice', {
        serverId: args.serverId,
        isShowProgressTips: args.isShowProgressTips == 0 ? 0 : 1
      }, args);
    },
    // 3.10 用微信音乐播放器播放音乐
    // playMusic: function(args) {
    //   _invokeMethod(apiSdkMethods.playMusic, {
    //     title: args.title,
    //     singer: args.singer,
    //     epname: args.epName,
    //     coverImgUrl: args.imgUrl,
    //     dataUrl: args.dataUrl,
    //     lowbandUrl: args.lowbandUrl || args.dataUrl,
    //     webUrl: args.link
    //   }, args);
    // },

    // 4 智能接口
    // 4.1 识别音频并返回识别结果
    translateVoice: function(args) {
      _invokeMethod('translateVoice', {
        localId: args.localId,
        isShowProgressTips: args.isShowProgressTips == 0 ? 0 : 1
      }, args);
    },

    // 5 图片接口
    // 5.1 拍照、本地选图
    chooseImage: function(args) {
      _invokeMethod('chooseImage', { 
        scene: '1|2',
        count: args.count || 9,
        sizeType: args.sizeType || ['original', 'compressed'],
        sourceType: args.sourceType || ['album', 'camera']
      }, (function(){
        args._complete = function(res) {
          if (isAndroid) {
            var localIds = res.localIds;
            try {
              if (localIds) {
                res.localIds = JSON.parse(localIds);
              }
            }
            catch (e) {

            }
          }
        }
        return args;
      })());
    },
    getLocation: function(args) {
    },
    // 5.2 图片预览
    previewImage: function(args) {
      _invokeMethod(apiSdkMethods.previewImage, {
        current: args.current,
        urls: args.urls   
      }, args);
    },
    // 5.3 上传图片
    uploadImage: function(args) {
      _invokeMethod('uploadImage', {
        localId: args.localId,
        isShowProgressTips: args.isShowProgressTips == 0 ? 0 : 1
      }, args);
    },
    // 5.4 下载图片
    downloadImage: function(args) {
      _invokeMethod('downloadImage', {
        serverId: args.serverId,
        isShowProgressTips: args.isShowProgressTips == 0 ? 0 : 1
      }, args);
    },
    // 5.5 获取本地图片 base64 数据
    getLocalImgData: function (args) {
      if (getLocalImgDataLock === false) {
        getLocalImgDataLock = true
        _invokeMethod('getLocalImgData', {
          localId: args.localId
        }, (function () {
          args._complete = function (res) {
            getLocalImgDataLock = false
            if (getLocalImgDataQueue.length > 0) {
              var args = getLocalImgDataQueue.shift()
              wx.getLocalImgData(args)
            }
          }
          return args
        })())
      } else {
        getLocalImgDataQueue.push(args)
      }
    },

    // 6 设备信息接口
    // 6.1 获取当前网络类型
    getNetworkType: function(args) {
      var _getNetworType = function(res) {
        var errMsg = res.errMsg;
        res.errMsg = 'getNetworkType:ok';
        var subtype = res.subtype;
        delete res.subtype;
        if (subtype) {
          res.networkType = subtype;
        } else {
          var index = errMsg.indexOf(':');
          var keyword = errMsg.substring(index + 1);
          switch (keyword) {
            case 'wifi':
            case 'edge':
            case 'wwan':
              res.networkType = keyword;
              break;
            default:
              res.errMsg = 'getNetworkType:fail';
              break;
          }
        }
        return res;
      }
      _invokeMethod('getNetworkType', {}, (function(){
        args._complete = function(res) {
          res = _getNetworType(res);
        }
        return args;
      })());
    },

    // 7 地理位置接口
    // 7.1 打开当前地理位置地图
    openLocation: function(args) {
      _invokeMethod('openLocation', {
        latitude: args.latitude,
        longitude: args.longitude,
        name: args.name || '',
        address: args.address || '',
        scale: args.scale || 28,
        infoUrl: args.infoUrl || ''
      }, args);
    },
    // 7.2 获取当前地理位置
    getLocation: function(args) {
      args = args || {};
      _invokeMethod(apiSdkMethods.getLocation, {
        type: args.type || 'wgs84'
      }, (function(){
        args._complete = function(res) {
          delete res.type;
        }
        return args;
      })());
    },

    // 8 界面操作接口
    // 8.1 隐藏菜单栏
    hideOptionMenu: function(args) {
      _invokeMethod('hideOptionMenu', {}, args);
    },
    // 8.2 显示菜单栏
    showOptionMenu: function(args) {
      _invokeMethod('showOptionMenu', {}, args);
    },
    // 8.3 关闭当前窗口
    closeWindow: function(args) {
      args = args || {};
      _invokeMethod('closeWindow', {}, args);
    },
    // 8.4 批量隐藏菜单项
    hideMenuItems: function(args) {
      _invokeMethod('hideMenuItems', {
        menuList: args.menuList
      }, args);
    },
    // 8.5 批量显示菜单项
    showMenuItems: function(args) {
      _invokeMethod('showMenuItems', {
        menuList: args.menuList
      }, args);
    },
    // 8.6 隐藏所有非基本菜单项
    hideAllNonBaseMenuItem: function(args) {
      _invokeMethod('hideAllNonBaseMenuItem', {}, args);
    },
    // 8.7 显示所有非基本菜单项
    showAllNonBaseMenuItem: function(args) {
      _invokeMethod('showAllNonBaseMenuItem', {}, args);
    },

    // 9 微信原生接口
    // 9.1 扫描二维码
    scanQRCode: function(args) {
      args = args || {};
      _invokeMethod('scanQRCode', {
        needResult : args.needResult || 0,
        scanType: args.scanType || ["qrCode","barCode"]
      }, (function() {
        args._complete = function(res) {
          if (isIos) {
            var resultStr = res.resultStr;
            if (resultStr) {
              var resultStrData = JSON.parse(resultStr);
              res.resultStr = resultStrData && resultStrData.scan_code && resultStrData.scan_code.scan_result;
            }
          }
        }
        return args;
      })());
    },

    // 10 微信购物接口
    // 10.1 打开收货地址
    openAddress: function(args) {
      _invokeMethod(apiSdkMethods.openAddress, {}, (function(){
        args._complete = function(res) {
          res = _getAddressResult(res);
        }
        return args;
      })());
    },

    // 11 微信小店接口
    // 11.1 跳转到微信商品特定界面
    openProductSpecificView: function(args) {
      _invokeMethod(apiSdkMethods.openProductSpecificView, {
        pid: args.productId,
        view_type: args.viewType || 0,
        ext_info: args.extInfo
      }, args);
    },
    // // 11.2 微信购物添加商品到收藏
    // addGoodsToFav: function(args) {
    //   _invokeMethod('addGoodsToFav', {
    //     title: args.title,
    //     link: args.link,
    //     desc: args.desc || '',
    //     thumbimg: args.imgUrl || ''
    //   }, args);
    // },

    // 12 微信卡券接口
    // 12.1 添加卡券
    addCard: function(args) {
      var rawCardList = args.cardList;
      var newCardList = [];
      for (var i = 0, length = rawCardList.length; i < length; ++i) {
        var rawCard = rawCardList[i];
        var newCard = {
          card_id: rawCard.cardId,
          card_ext: rawCard.cardExt
        };
        newCardList.push(newCard);
      };
      _invokeMethod(apiSdkMethods.addCard, {
        card_list: newCardList
      }, (function(){
        args._complete = function(res) {
          var cardList = res.card_list;
          if (cardList) {
            cardList = JSON.parse(cardList);
            for (var i = 0, length = cardList.length; i < length; ++i) {
              var card = cardList[i];
              card.cardId = card.card_id;
              card.cardExt = card.card_ext;
              card.isSuccess = card.is_succ ? true : false;
              delete card.card_id;
              delete card.card_ext;
              delete card.is_succ;
            };
            res.cardList = cardList;
            delete res.card_list;
          }
        }
        return args;
      })());
    },
    // 12.2 选择卡券
    chooseCard: function(args) {
      _invokeMethod('chooseCard', {
        app_id: config.appId,
        location_id: args.shopId || '',
        sign_type: args.signType || 'SHA1',
        card_id: args.cardId || '',
        card_type: args.cardType || '',
        card_sign: args.cardSign,
        time_stamp: args.timestamp + '',
        nonce_str: args.nonceStr
      }, (function(){
        args._complete = function(res) {
          res.cardList = res.choose_card_info;
          delete res.choose_card_info;
        }
        return args;
      })());
    },
    // 12.3 打开卡券
    openCard: function(args) {
      var rawCardList = args.cardList;
      var newCardList = [];
      for (var i = 0, length = rawCardList.length; i < length; ++i) {
        var rawCard = rawCardList[i];
        var newCard = {
          card_id: rawCard.cardId,
          code: rawCard.code
        };
        newCardList.push(newCard);
      };
      _invokeMethod(apiSdkMethods.openCard, {
        card_list: newCardList
      }, args);
    },
    // 12.4 核销并分享卡券
    consumeAndShareCard: function(args) {
      _invokeMethod(apiSdkMethods.consumeAndShareCard, {
        consumedCardId: args.cardId,
        consumedCode: args.code
      }, args);
    },

    // 13 微信支付接口
    // 13.1 发起微信支付
    chooseWXPay: function(args) {
      _invokeMethod(apiSdkMethods.chooseWXPay, _getPayVerifyParams(args), args);
    },
    // // 13.2 发起微信支付绑卡流程
    // bindCardWithWXPay: function(args) {
    //   _invokeMethod(apiSdkMethods.bindCardWithWXPay, _getPayVerifyParams(args), args);
    // },
    // // 13.3 拉起转账服务
    // transferMoney: function(args) {
    //   _invokeMethod(apiSdkMethods.transferMoney, _getPayVerifyParams(args), args);
    // },
    // // 13.4 打开微信支付特定界面
    // openWXPaySpecificView: function(args) {
    //   _invokeMethod(apiSdkMethods.openWXPaySpecificView, _getPayVerifyParams(args), args);
    // },
    // // 13.5 开通微信信用卡
    // createWXCreditCard: function(args) {
    //   _invokeMethod(apiSdkMethods.createWXCreditCard, _getPayVerifyParams(args), args);
    // },
    // 13.6 领取企业红包
    openEnterpriseRedPacket: function(args) {
      _invokeMethod(apiSdkMethods.openEnterpriseRedPacket, _getPayVerifyParams(args), args);
    },

    // 14 微信摇周边接口
    // 14.1 开始搜索Beacon设备
    startSearchBeacons: function(args) {
      _invokeMethod(apiSdkMethods.startSearchBeacons, {
        ticket: args.ticket
      }, args);
    },
    // 14.2 停止搜索Beacon设备
    stopSearchBeacons: function(args) {
      _invokeMethod(apiSdkMethods.stopSearchBeacons, {}, args);
    },
    // 14.3 监听搜索到的Beacon设备
    onSearchBeacons: function(args) {
      _onMethod(apiSdkMethods.onSearchBeacons, args);
    },

    // 15 微信企业号接口
    // 15.1 打开企业会话
    openEnterpriseChat: function(args) {
      _invokeMethod('openEnterpriseChat', {
        useridlist: args.userIds,
        chatname: args.groupName
      }, args);
    },

    // 16 小程序接口
    launchMiniProgram: function(args) {
      _invokeMethod('launchMiniProgram', {
        targetAppId: args.targetAppId,
        path: _addHTMLToPath(args.path),
        envVersion: args.envVersion
      }, args);
    },

    // 17 小程序环境特有接口
    miniProgram: {
      // 17.1 返回小程序上一层页面
      navigateBack: function(args) {
        args = args || {}
        _bindReadyEvent(function() {
          _invokeMethod('invokeMiniProgramAPI', {
            name: 'navigateBack',
            arg: {delta: args.delta || 1}
          }, args);
        })
      },
      // 17.2 跳转到小程序其它页面
      navigateTo: function(args) {
        _bindReadyEvent(function() {
          _invokeMethod('invokeMiniProgramAPI', {
            name: 'navigateTo',
            arg: {url: args.url}
          }, args);
        })
      },
      // 17.3 关闭当前页面，跳转到小程序其它页面
      redirectTo: function(args) {
        _bindReadyEvent(function() {
          _invokeMethod('invokeMiniProgramAPI', {
            name: 'redirectTo',
            arg: {url: args.url}
          }, args);
        })
      },
      // 17.4 跳转到 tabBar 页面，并关闭其他所有非 tabBar 页面
      switchTab: function(args) {
        _bindReadyEvent(function() {
          _invokeMethod('invokeMiniProgramAPI', {
            name: 'switchTab',
            arg: {url: args.url}
          }, args);
        })
      },
      // 17.5 关闭所有页面，跳转到小程序其它页面
      reLaunch: function(args) {
        _bindReadyEvent(function() {
          _invokeMethod('invokeMiniProgramAPI', {
            name: 'reLaunch',
            arg: {url: args.url}
          }, args);
        })
      },
      // 17.6 向小程序发送消息
      postMessage: function(args) {
        _bindReadyEvent(function() {
          _invokeMethod('invokeMiniProgramAPI', {
            name: 'postMessage',
            arg: args.data || {}
          }, args);
        })
      },
      // 17.7 获取当前是否为小程序环境
      getEnv: function(cb) {
        _bindReadyEvent(function() {
          cb({
            miniprogram: window.__wxjs_environment === "miniprogram"
          })
        })
      },
      // 17.7 获取当前是否为小程序环境
      onLifeCycleEvent: function(cb) {
        _bindReadyEvent(function() {
          _onMethod("onDataFromAppService", {
            complete: function(onRes) {
              var data = onRes.data;
              data = JSON.parse(data);
                cb(data)
            }
          });
        })
      }
    }
  }

  var errorImgCounter = 1
  var errorImgs = {}
  document.addEventListener('error', function(e){
    if (isAndroid) return;
    var element = e.target;
    var tag = element.tagName;
    var src = element.src;

    if (tag == 'IMG' || tag == 'VIDEO' || tag == 'AUDIO' || tag == 'SOURCE') {
      var isLocalId = src.indexOf('wxlocalresource://') != -1;
      if (isLocalId) {
        e.preventDefault();
        e.stopPropagation();
        var imgId = element['wx-id'];
        if (!imgId) {
          imgId = errorImgCounter++;
          element['wx-id'] = imgId;
        }
        if (errorImgs[imgId]) return;
        errorImgs[imgId] = true;
        wx.ready(function () {
          wx.getLocalImgData({
            localId: src,
            success: function (res) {
              element.src = res.localData
            }
          });
        })
      }
    }
  }, true);

  document.addEventListener('load', function(e) {
    if (isAndroid) return;
    var element = e.target;
    var tag = element.tagName;
    var src = element.src;
    if (tag == 'IMG' || tag == 'VIDEO' || tag == 'AUDIO' || tag == 'SOURCE') {
      var imgId = element['wx-id'];
      if (imgId) {
        errorImgs[imgId] = false;
      }
    }
  }, true);

  if (isGlobal) {
    window.wx = window.jWeixin = jWeixin;
  }

  return jWeixin;
}));
