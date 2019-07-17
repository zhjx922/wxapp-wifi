import Taro, { Component, Config } from '@tarojs/taro'
import { View, Text, Image, Button } from '@tarojs/components'
import { AtButton, AtActivityIndicator, AtInput, AtForm, AtSwitch, AtToast, AtModal, AtModalHeader, AtModalContent, AtModalAction } from 'taro-ui'
import '../../custom-variables.scss'
import './index.scss'
import shareConnect from '../../images/share_connect.png'
import shareDefault from '../../images/share_default.png'
import logoWait from '../../images/logo_wait.png'
import logoSuccess from '../../images/logo_success.png'
import logoOk from '../../images/logo_ok.png'
import logoWarning from '../../images/logo_warning.png'


export default class Index extends Component {

  /**
   * 指定config的类型声明为: Taro.Config
   *
   * 由于 typescript 对于 object 类型推导只能推出 Key 的基本类型
   * 对于像 navigationBarTextStyle: 'black' 这样的推导出的类型是 string
   * 提示和声明 navigationBarTextStyle: 'black' | 'white' 类型冲突, 需要显示声明类型
   */
  config: Config = {
    navigationBarTitleText: '小黄豆WiFi'
  }

  constructor (props) {
    super(props)
    this.state = {
      mode: 'normal', //normal(正常模式),connect(连接模式)
      status: 'wait', //wait(正常等待),success(连接成功),warning(连接异常)
      initMainStatus: false, //true(初始化中) false(初始化结束或未开始)
      //wifi信息
      wifi: {
        ssid: '',
        bssid: '',
        errMsg: ''
      },
      //连接的wifi信息
      connect: {
        welcome: '',
        status: 'wait',
        ssid: '',
        bssid: '',
        password: '',
        forward: false,
        errMsg: '',
      },
      //loading相关
      toast: {
        opened: false,
        text: '请稍等...'
      },
      //form相关
      form: {
        id: '',
        welcome: '欢迎使用我的WiFi',
        password: '',
        expire: 5,
        forward: false,
        ssid: '',
        bssid: ''
      },
      //share相关
      shareTitle: '推荐你一个好用的WiFi分享工具',
      sharePath: 'pages/index/index',
      shareImage: shareDefault,
      //modal组件
      modal: {
        opened: false,
        content: '',
      },
    }
  }

  //点击分享触发
  onClickShare () {
    this.setState({
      toast: {
        opened: true,
        text: '分享数据生成中，请稍等...'
      }
    })

    const db = wx.cloud.database()
    const data = {
      bssid: this.state.wifi.bssid,
      ssid: this.state.wifi.ssid,
      password: this.state.form.password,
      expire: this.state.form.expire,
      welcome: this.state.form.welcome,
      forward: this.state.form.forward
    }

    if (this.state.form.id) {
      db.collection('wifi_list').doc(this.state.form.id).update({
        data: data
      })
      .then(res => {
        console.log(res)
        this.generateTicket(this.state.form.id)
      })
      .catch(err => {
        console.log(err)
        this.setState({
          toast: {
            opened: false,
            text: ''
          }
        })
      })
    } else {
      db.collection('wifi_list').add({data: data}).then(res => {
        console.log(res)
        this.setState({
          form: {
            ...this.state.form,
            id: res._id
          }
        })
        this.generateTicket(res._id)
      }).catch(err => {
        console.log(err)
        this.setState({
          toast: {
            opened: false,
            text: ''
          }
        })
      })
    }
  }

  //生成ticket
  generateTicket (id) {
    const db = wx.cloud.database()
    const data = {
      wifi_id: id,
      expire: this.state.form.expire,
      welcome: this.state.form.welcome,
      forward: this.state.form.forward,
      create_time: db.serverDate()
    }

    //生成ticket
    db.collection('wifi_ticket').add({data: data}).then(res => {
      console.log(res._id)
      this.setState({
        shareTitle: this.state.form.welcome,
        sharePath: 'pages/index/index?ticket=' + res._id,
        shareImage: shareConnect,
        toast: {
          opened: false,
          text: ''
        }
      }, () => {
        this.setState({
          modal: {
            opened: true,
            content: ''
          }
        })
      })
    }).catch(err => {
      console.log(err)
      this.setState({
        toast: {
          opened: false,
          text: ''
        }
      })
    })
  }

  // 内容变更记录
  handleFormChange (name, value) {
    this.setState({
      form: {
        ...this.state.form,
        [name]: value
      }
    })
    return value
  }

  //根据BSSID查询
  getInfoByBSSID (bssid) {
    Taro.cloud.callFunction({
      name: 'getWiFiInfo',
      data: {
        bssid: bssid
      }
    }).then(res => {
      console.log('getWiFiInfo(cloud)', res.result)
      const info = res.result
      this.setState({
        form: {
          ...this.state.form,
          id: info._id ? info._id : '',
          welcome: info.welcome ? info.welcome : '欢迎使用我的WiFi',
          password: info.password ? info.password : '',
          forward: info.forward ? info.forward : false,
          expire: info.expire ? info.expire : 5,
        }
      })
    }).catch(err => {
      console.log(err)
    })
  }

  //连接wifi
  onClickConnect () {
    this.setState({
      toast: {
        opened: true,
        text: '请稍等，正在连接...'
      }
    })
    Taro.startWifi().then(res => {
      Taro.connectWifi({
        SSID: this.state.connect.ssid,
        BSSID: this.state.connect.bssid,
        password: this.state.connect.password
      }).then(res => {
        console.log(res)
        //连接成功
        this.setState({
          connect: {
            ...this.state.connect,
            status: 'success',
          },
          toast: {
            opened: false,
            text: ''
          }
        })
      }).catch(err => {
        console.log(err)
        let errMsg = err.errMsg
        if (err.errMsg.indexOf('user denied') != -1) {
          errMsg = '用户拒绝授权链接 Wi-Fi！'
        } else if (err.errMsg.indexOf('wifi not turned') != -1) {
          errMsg = '请先打开WiFi！'
        } else if (err.errMsg.indexOf('gps not turned') != -1) {
          errMsg = '请先打开GPS！'
        } else if (err.errMsg.indexOf('password error') != -1) {
          errMsg = '抱歉，密码错误！'
        }

        //连接失败
        this.setState({
          connect: {
            ...this.state.connect,
            status: 'warning',
            errMsg: errMsg,
          },
          toast: {
            opened: false,
            text: ''
          }
        })
      })
      //连接成功
      Taro.onWifiConnected(res => {
        console.log(res)
        if (res.wifi.SSID == this.state.connect.ssid) {
          this.setState({
            connect: {
              ...this.state.connect,
              ssid: res.wifi.SSID,
              bssid: res.wifi.BSSID,
              status: 'success',
            },
            toast: {
              opened: false,
              text: ''
            }
          })
        }
      })
    }).catch(err => {
      console.log(err)
      //连接成功
      this.setState({
        connect: {
          ...this.state.connect,
          status: 'warning',
          errMsg: err.errMsg,
        },
        toast: {
          opened: false,
          text: ''
        }
      })
    })
  }

  //正常模式
  initMain = () => {
    this.setState({
      initMainStatus: true
    })

    //启动WiFi
    Taro.startWifi().then(res => {
      //查询下当前连接的WiFi信息
      Taro.getConnectedWifi().then(res => {
        this.getInfoByBSSID(res.wifi.BSSID)
        this.setState({
          status: 'success',
          initMainStatus: false,
          wifi: {
            ...this.state.wifi,
            ssid: res.wifi.SSID,
            bssid: res.wifi.BSSID
          }
        });
      }).catch(err => {
        console.log(err)
        let errMsg = err.errMsg
        if (err.errMsg.indexOf('no wifi') != -1) {
          errMsg = '请先连接WiFi！'
        } else if (err.errMsg.indexOf('wifi not turned') != -1) {
          errMsg = '请先打开WiFi'
        } else if (err.errMsg.indexOf('gps not turned') != -1) {
          errMsg = '请先打开GPS'
        }
        this.setState({
          status: 'warning',
          initMainStatus: false,
          wifi: {
            ...this.state.wifi,
            errMsg: errMsg
          }
        })
      })

      //连接成功
      Taro.onWifiConnected(res => {
        console.log(res)
        this.getInfoByBSSID(res.wifi.BSSID)
        this.setState({
          status: 'success',
          initMainStatus: false,
          wifi: {
            ...this.state.wifi,
            ssid: res.wifi.SSID,
            bssid: res.wifi.BSSID
          }
        })
      })
    }).catch(err => {
      console.log(err)

      let errMsg = err.errMsg
      if (err.errMsg.indexOf('not support') != -1) {
        errMsg = '抱歉，当前手机系统不支持！'
      }

      this.setState({
        status: 'warning',
        initMainStatus: false,
        wifi: {
          ...this.state.wifi,
          errMsg: errMsg
        }
      })
    })
  }

  //连接模式
  initConnect = () => {
    this.setState({
      initMainStatus: true
    })
    Taro.cloud.callFunction({
      name: 'getTicketInfo',
      data: {
        id: this.$router.params.ticket
      }
    }).then(res => {
      console.log('getTicketInfo(cloud)', res.result)
      if (!res.result.ssid) {
        this.setState({
          status: 'warning',
          connect: {
            ...this.state.connect,
            errMsg: '抱歉，当前连接已过期！'
          }
        })
        return
      }
      let state = {
        connect: {
          ...this.state.connect,
          welcome: res.result.welcome,
          ssid: res.result.ssid,
          bssid: res.result.bssid,
          password: res.result.password,
          forward: res.result.forward
        },
        status: 'success',
        initMainStatus: false
      }

      if (res.result.forward) {
        state['shareTitle'] = res.result.welcome
        state['sharePath'] = 'pages/index/index?ticket=' + this.$router.params.ticket
        state['shareImage'] = shareConnect
      }

      this.setState(state)
    }).catch(err => {
      console.log(err)
      this.setState({
        status: 'warning',
        initMainStatus: false,
        connect: {
          ...this.state.connect,
          errMsg: err.errMsg
        }
      })
    })
  }

  //邀请连接模式
  initFuture = () => {

  }

  //加载完成
  componentDidMount () {
    if (this.$router.params.ticket) {
      //连接模式
      this.setState({
        mode: 'connect'
      })
      this.initConnect()
    } else {
      //正常模式
      this.setState({
        mode: 'normal'
      })
      this.initMain()
    }
  }

  //分享
  onShareAppMessage () {
    this.setState({
      modal: {
        ...this.state.modal,
        opened: false
      }
    })
    return {
      title: this.state.shareTitle,
      path: this.state.sharePath,
      imageUrl: this.state.shareImage
    }
  }

  onClickRefresh() {
    if (this.state.mode == 'normal') {
      this.initMain()
    } else {
      this.initConnect()
    }
  }

  onCloseModal () {
    this.setState({
      modal: {
        ...this.state.modal,
        opened: false
      }
    })
  }

  render () {
    return (
      <View className='index'>
        <AtToast isOpened={this.state.toast.opened} text={this.state.toast.text} status='loading' duration={0} hasMask={true}></AtToast>
        <AtModal isOpened={this.state.modal.opened} onClose={this.onCloseModal.bind(this)}>
          <AtModalHeader>数据已生成，赶快分享吧！</AtModalHeader>
          <AtModalContent className='my-modal-content'>
            <AtButton full type='primary' openType='share'>点我分享WiFi给好友</AtButton>
          </AtModalContent>
        </AtModal>
        {
          /*==========正常模式开始============*/
          this.state.mode == 'normal' && 
          <View className='z-components-main'>
            <View className='at-row z-center z-margin'>
              <Image
                style='width: 100px;height: 100px;'
                src={
                  {
                    'wait': logoWait,
                    'success': logoSuccess,
                    'warning': logoWarning
                  }[this.state.status]
                }
              />
            </View>
            <View className='at-row z-bg'>
              <View className='at-col at-col__offset-1 at-col-10 z-center-parent'>
                {
                  this.state.status == 'wait'
                    ? <AtActivityIndicator mode='center' content='正在检查WiFi连接状态...'></AtActivityIndicator>
                    : <Text className={this.state.status == 'success' ? 'z-text z-color-success' : 'z-text z-color-error'}>{this.state.status == 'success' ? this.state.wifi.ssid : this.state.wifi.errMsg}</Text>
                }
              </View>
            </View>
            {
              this.state.status == 'success'
              ?
              <View>
                <View className='at-row z-margin'>
                  <View className='at-col'>
                    <AtForm>
                      <AtInput
                        name='welcome'
                        title='欢迎语'
                        type='text'
                        placeholder='欢迎使用我家的WiFi'
                        value={this.state.form.welcome}
                        onChange={this.handleFormChange.bind(this, 'welcome')}
                      />
                      <AtInput
                        name='password'
                        title='密码'
                        type='password'
                        placeholder='请输入WiFi密码'
                        value={this.state.form.password}
                        onChange={this.handleFormChange.bind(this, 'password')}
                      />
                      <AtInput
                        name='expire'
                        title='有效时间'
                        type='number'
                        placeholder='请输入有效时间'
                        value={this.state.form.expire}
                        onChange={this.handleFormChange.bind(this, 'expire')}
                      >
                        <Text style='color:#29B26A;'>分钟</Text>
                      </AtInput>
                      <AtSwitch title='允许转发' checked={this.state.form.forward} onChange={this.handleFormChange.bind(this, 'forward')} color='#29B26A' />
                    </AtForm>
                  </View>
                </View>
                <View className='at-row at-row__justify--around z-margin'>
                  <View className='at-col at-col-11'>
                    <AtButton type='primary' loading={false} onClick={this.onClickShare.bind(this)}>生成分享数据</AtButton>
                  </View>
                </View>
              </View>
              :
              <View className='at-row at-row__justify--around z-margin'>
                <View className='at-col at-col-11'>
                  <AtButton type='primary' disabled={this.state.initMainStatus} onClick={this.onClickRefresh.bind(this)}>刷新连接状态</AtButton>
                </View>
              </View>
            }
          </View>
          /*==========正常模式结束============*/
        }
        {
          /*==========连接模式开始============*/
          this.state.mode == 'connect' && 
          <View className='z-components-main'>
            <View className='at-row z-center z-margin'>
              <Image
                style='width: 100px;height: 100px;'
                src={
                  {
                    'wait': logoWait,
                    'success': logoSuccess,
                    'warning': logoWarning
                  }[this.state.status]
                }
              />
            </View>
            <View className='at-row z-bg'>
              <View className='at-col at-col__offset-1 at-col-10 z-center-parent'>
                {
                  this.state.status == 'wait'
                    ? <AtActivityIndicator mode='center' content='正在初始化，请稍等...'></AtActivityIndicator>
                    : <Text className={this.state.status == 'success' ? 'z-text z-color-success' : 'z-text z-color-error'}>{this.state.status == 'success' ? this.state.connect.ssid : this.state.connect.errMsg}</Text>
                }
              </View>
            </View>
            {
              this.state.status == 'success'
              ?
              <View>
                <View className='at-row at-row__justify--around z-margin'>
                  <View className='at-col at-col-5'>
                    {
                      this.state.connect.status == 'success'
                       ? <AtButton type='primary' disabled={true}>已连接</AtButton>
                       : <AtButton type='primary' onClick={this.onClickConnect.bind(this)}>连接WiFi</AtButton>
                    }
                  </View>
                  <View className='at-col at-col-5'>
                    <AtButton type='secondary' openType='share' disabled={!this.state.connect.forward}>转发</AtButton>
                  </View>
                </View>
              </View>
              :
              <View className='at-row at-row__justify--around z-margin'>
                <View className='at-col at-col-11'>
                  <AtButton type='primary' disabled={this.state.initMainStatus} onClick={this.onClickRefresh.bind(this)}>刷新连接状态</AtButton>
                </View>
              </View>
            }
          </View>
          /*==========正常模式结束============*/
        }
      </View>
    )
  }
}
