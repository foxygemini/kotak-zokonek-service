/**
 * Grpc Response formatter
 */
class GrpcResponse{
  constructor(cb){
    this.cb = cb;
  }

  success(data){
    process.traceLog("info", "Service response success", __filename, __linenumber, {data});
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
    process.traceLog("info", "Service response error", __filename, __linenumber, {msg});
    this.cb(new Error(msg));
  }
  
  failed(msg){
    process.traceLog("info", "Service response failed", __filename, __linenumber, {msg});    
    this.cb(null, {success: false, status: 400, message: msg});
  }
  
  failedUnauthorized (msg){
    process.traceLog("info", "Service response failed unauthorized", __filename, __linenumber, {msg});
    if(!msg){
      msg = __trans("notifications.access-unauthorized");
    }
    this.cb(null, {success: false, status: 401, message: msg});
  }
  
  failedForbidden (msg){
    process.traceLog("info", "Service response failed forbidden", __filename, __linenumber, {msg});
    if(!msg){
      msg = __trans("notifications.access-forbidden");
    }
    this.cb(null, {success: false, status: 403, message: msg});
  }
  
  notFound(stringKey){
    if(!stringKey){
      stringKey = "Data";
    }
    process.traceLog("info", "Service response not found", __filename, __linenumber, {stringKey});    
    this.cb(null, {success: false, status: 404, message: __trans("notifications.not-found", stringKey)})
  }
}

module.exports = cb => new GrpcResponse(cb);