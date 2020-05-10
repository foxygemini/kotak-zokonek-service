const grpcResponse = require("./../../libs/renderer/grpc-response");
class grpcFlow {
  constructor(args){
    this.request = {};
    this.execMe = null;
    this.callback = null;
    this.response = null;
    this.scene = process.env.APP_NAME;
    this.curArg = 0;
    this.maxArg = 0;
    this.data = {};
    this.methods = [];
    this.parseArgs(args);
  }
  parseArgs(args){
    if(args.length < 1){
      process.errorLog(this.scene, "Arguments invalid", null, __filename, __linenumber);
      throw new Error("No argument passed");
    }else{
      this.maxArg = args.length-1;
      for(var i = 0;i<args.length;i++){
        this.methods.push(args[i]);
      }
    }
  }
  render(call, callback){
    this.response = grpcResponse(callback);
    this.call = call;
    this.request = call.request;
    if(call.request.scene){
      this.scene = call.request.scene;
    }
    this.methods[this.curArg](this);
  }
  next(err, data){
    if(err){
      this.error(err);
    }else{
      if(this.curArg < this.maxArg){
        this.curArg++;
        if(data){
          this.setData(data);
        }
        this.methods[this.curArg](this);
      }else{
        this.failed();
      }
    }
  }
  setData(data){
    Object.assign(this.data, data);
  }
  getData(){
    return this.data;
  }
  success(data){
    this.response.success(data);
  }
  failed(data){
    this.response.failed(data);
  }
  error(data){
    this.response.error(data);
  }
  notFound(data){
    this.response.notFound(data);
  }
  failedUnauthorized(data){
    this.response.failedUnauthorized(data);
  }
  failedForbidden(data){
    this.response.failedUnauthorized(data);
  }
}

module.exports = (...args) => (call, callback) => {
    const app = new grpcFlow(args);
    app.render(call, callback);
  };