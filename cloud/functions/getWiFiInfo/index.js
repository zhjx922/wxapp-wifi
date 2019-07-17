// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 初始化数据库
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const res = await db.collection('wifi_list').where({ _openid: wxContext.OPENID, bssid: event.bssid}).limit(1).get()

  if (res.data.length > 0) {
    return res.data[0]
  }

  return {}
}