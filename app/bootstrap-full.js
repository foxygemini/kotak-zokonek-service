"use strict";

const mongoose = require('mongoose');
const redis = require("redis");
const amqp = require('amqplib/callback_api');

module.exports = (options, callback) => {
  mongoose.connect('mongodb://'+process.env.DB_USERNAME+':'+process.env.DB_PASSWORD+'@'+process.env.DB_HOST+':'+process.env.DB_PORT+'/'+process.env.DB_NAME, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', () => {
    process.traceLog("info", "Database connected",  __filename, __linenumber);
    process.redisClient = redis.createClient();
    process.redisClient.on("ready", () => {
      process.traceLog("info", "Redis connected", __filename, __linenumber);
      amqp.connect('amqp://'+process.env.AMPQ_USERNAME+":"+process.env.AMPQ_PASSWORD+"@"+process.env.AMPQ_HOST, (err, ampqCon) => {
        if(err){
          process.errorLog(process.env.APP_NAME, "Connect to amqp server failed", {conn: 'amqp://'+process.env.AMPQ_USERNAME+":"+process.env.AMPQ_PASSWORD+"@"+process.env.AMPQ_HOST, err}, __filename, __linenumber);
          
        }else{
          process.traceLog("info", `Message broker connected`, __filename, __linenumber);
          /**
           * Broker channel
           */
          process.brokerChannels = {};
          /**
           * Publish to message broker
           * @param {string} topic - Topic key of broker, check on static config broker
           * @param {string} data - Data send to broker. Must be string. If json, convert it to string user stringify.
           */
          process.brokerPublish = async (topic, data) => {
            if(process.brokerChannels[topic]){
              process.brokerChannels[topic].sendToQueue(topic, Buffer.from(data));
            }else{
              process.traceLog("warning", "Channel not found", {topic}, __filename, __linenumber);
            }
          }

          if(options){
            if(options.services && options.services.length>0){
              options.services.map(service => {
                if(process.staticConfig.services[service]){
                  process.appServices[service] = require(process.staticConfig.services[service])(process.scene);
                }
              });
            }

            if(options.publishers){
              options.publishers.map(publisher => {
                amqpCon.createChannel((err, channel) => {
                  if(err){
                    process.errorLog(process.scene, "Create broker channel failed", err, __filename, __linenumber);
                  }else{
                    channel.assertQueue(publisher);
                    process.brokerChannels[publisher] = channel;
                  }
                })
              });
            }
            if(options.subscribers){
              const parseBrokerData = dataBuffer => new Promise((resolve, reject) => {
                process.traceLog("info", "Start validate broker data for email sender broker", null, __filename, __linenumber);
                const brokerData = JSON.parse(dataBuffer.content.toString());
                if(brokerData){
                  resolve(brokerData);
                }else{
                  reject("Parse to json failed");
                }
              })
              Object.keys(options.subscribers).map(subscriberKey=> {
                amqpCon.createChannel((err, channel) => {
                  if(err){
                    process.errorLog(process.scene, "Create consumer channel failed", err, __filename, __linenumber);
                  }else{
                    channel.assertQueue(subscriberKey);
                    channel.consume(subscriberKey, msg => {
                      if(msg.content){
                        parseBrokerData(msg).then(brokerData => {
                          process.traceLog("info", "Notification send mail message broker received", {brokerData}, __filename, __linenumber);          
                          options.subscribers[subscriberKey](brokerData);
                        }).catch(err => {
                          process.traceLog("warning", "Parse broker data failed", err, __filename, __linenumber);          
                        });
                      }
                    }, {noAck: true});
                  }
                })
              });
            }
          }
          if(callback){
            callback(null);
          }
        }
      })
    })
  })
}