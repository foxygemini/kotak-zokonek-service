/**
 * Grpc Response formatter
 */
class GrpcResponse{
  constructor(cb){
    this.cb = cb;
  }

  success(data){
    process.traceLog("info", "Service response success", {data}, __filename, __linenumber);
    if(data){
      this.cb(null, {success: true, status: 200, data});
    }else{
      this.cb(null, {success: true, status: 200});
    }
  }
  
  error(msg){
    if(!msg){
      msg = __trans("notifications.system-error");
    }
    process.traceLog("info", "Service response error", {msg}, __filename, __linenumber);
    this.cb(new Error(msg));
  }
  
  failed(msg){
    process.traceLog("info", "Service response failed", {msg}, __filename, __linenumber);    
    this.cb(null, {success: false, status: 400, message: msg});
  }
  
  failedUnauthorized (msg){
    process.traceLog("info", "Service response failed unauthorized", {msg}, __filename, __linenumber);
    if(!msg){
      msg = __trans("notifications.access-unauthorized");
    }
    this.cb(null, {success: false, status: 401, message: msg});
  }
  
  failedForbidden (msg){
    process.traceLog("info", "Service response failed forbidden", {msg}, __filename, __linenumber);
    if(!msg){
      msg = __trans("notifications.access-forbidden");
    }
    this.cb(null, {success: false, status: 403, message: msg});
  }
  
  notFound(stringKey){
    if(!stringKey){
      stringKey = "Data";
    }
    process.traceLog("info", "Service response not found", {stringKey}, __filename, __linenumber);    
    this.cb(null, {success: false, status: 404, message: __trans("notifications.not-found", stringKey)})
  }
}

module.exports = cb => new GrpcResponse(cb);