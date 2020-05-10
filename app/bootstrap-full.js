"use strict";

const mongoose = require('mongoose');
const redis = require("redis");
const amqp = require('amqplib/callback_api');

process.staticConfig = require(`${process.basepaths.base}/connection/configs/config`);

module.exports = (options, callback) => {
  try{
    mongoose.connect('mongodb://'+process.env.DB_USERNAME+':'+process.env.DB_PASSWORD+'@'+process.env.DB_HOST+':'+process.env.DB_PORT+'/'+process.env.DB_NAME, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => {
      process.traceLog("info", "Database connected",  __filename, __linenumber);
      process.redisClient = redis.createClient();
      process.redisClient.on("ready", () => {
        process.traceLog("info", "Redis connected", __filename, __linenumber);
        amqp.connect('amqp://'+process.env.AMPQ_USERNAME+":"+process.env.AMPQ_PASSWORD+"@"+process.env.AMPQ_HOST, (err, amqpCon) => {
          if(err){
            process.errorLog("Connect to amqp server failed", err, __filename, __linenumber, {conn: 'amqp://'+process.env.AMPQ_USERNAME+":"+process.env.AMPQ_PASSWORD+"@"+process.env.AMPQ_HOST});
            
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
                process.traceLog("warning", "Channel not found", __filename, __linenumber, {topic});
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
                      process.errorLog("Create broker channel failed", err, __filename, __linenumber);
                    }else{
                      channel.assertQueue(publisher);
                      process.brokerChannels[publisher] = channel;
                    }
                  })
                });
              }
              if(options.subscribers){
                const parseBrokerData = dataBuffer => new Promise((resolve, reject) => {
                  process.traceLog("info", "Start validate broker data for email sender broker", __filename, __linenumber);
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
                      process.errorLog("Create consumer channel failed", err, __filename, __linenumber);
                    }else{
                      channel.assertQueue(subscriberKey);
                      channel.consume(subscriberKey, msg => {
                        if(msg.content){
                          parseBrokerData(msg).then(brokerData => {
                            process.traceLog("info", "Notification send mail message broker received", __filename, __linenumber, {brokerData});          
                            options.subscribers[subscriberKey](brokerData);
                          }).catch(err => {
                            process.traceLog("warning", "Parse broker data failed", __filename, __linenumber, err);          
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
  }catch(err){
    process.errorLog("Bootstrap failed. Some error occured.", err, __filename, __linenumber);
    callback(err);
  }
}