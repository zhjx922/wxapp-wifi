// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 初始化数据库
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const where = { 
    _id: event.id
  }
  const res = await db.collection('wifi_ticket').field({ welcome: true, wifi_id: true, forward: true, create_time: true, expire: true }).where(where).limit(1).get()


  if (res.data.length > 0) {
    const expireTime = res.data[0].create_time.getTime() + res.data[0].expire * 60 * 1000
    const serverTime = (new Date()).getTime()

    if (expireTime < serverTime) {
      return {}
    }


    const wifiInfo = await db.collection('wifi_list').doc(res.data[0].wifi_id).get()
    if (wifiInfo.data ) {
      return {
        welcome: res.data[0].welcome,
        forward: res.data[0].forward,
        bssid: wifiInfo.data.bssid,
        ssid: wifiInfo.data.ssid,
        password: wifiInfo.data.password,
      }
    }
  }

  return {}
}