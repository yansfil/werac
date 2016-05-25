var mongoose = require('mongoose');
var db = require('./db.js')

var userSchema = mongoose.Schema({
  _id : Number,
  email : String,
  pw : String,
  name: String,
  comment: String,
  phone: String,
  date : {type: Date , default : Date.now},
  history_create : [{type : Number , ref : "Item"}],
  history_join : [{type : Number , ref : "Item"}],
  history_mc : [{type : Number , ref : "Item"}],
  history_like : [{type : Number , ref : "Item"}],
  alarm : [{
    read : Number,
    status : Number,
    mid : Number,
    uid : Number,
    comment : String
  }]
});

var itemSchema = mongoose.Schema({
_id : Number,
status : {type :Number, default : 1},
uid : Number,
mc_id : Number,
has_mc : {type : Boolean, default : false },
reg_date : {type:Date, default : Date.now},
image : String,
title : String,
title_sub : String,
schedule : [String],
location_detail : String,
location_area : String,
date : String,  //time은 date형으로 만들어야하나 더미용으로 String
start_time : String,
end_time : String,
fee : Number,
limit_num : Number,
guests_id : Array,
like : {type: Number, default : 0},
comments : [
  {
    _id : Number,
    uid : {type : Number, ref: 'User'},
    content : String,
    like : {type : Number, default : 0},
    date : {type: Date , default : Date.now},
    reply : [
      {
        uid : {type : Number, ref: 'User'},
        content : String
      }
    ]
  }
]
});

var CounterSchema = new mongoose.Schema({
  _id : {type : String},
  seq : {type: Number, default : 0}
});
mongoose.model('counter', CounterSchema);
var counterModel = db.model('counter');
mongoose.model('User', userSchema);
mongoose.model('Item', itemSchema);



userSchema.pre('save', function(next){
  var doc = this;
  counterModel.findOneAndUpdate({_id:'userId'},{$inc: {seq : 1}},{upsert:true, new:true},function(err,pre_doc){
    if(err) return next(err);
    console.log('pre_doc',pre_doc);
    doc._id = pre_doc.seq;
    next();
  })
});

itemSchema.pre('save', function(next){
  var doc = this;
  counterModel.findOneAndUpdate({_id:'itemId'},{$inc: {seq : 1}},{upsert:true, new:true},function(err,pre_doc){
    if(err) return next(err);
    console.log('pre_doc',pre_doc);
    doc._id = pre_doc.seq;
    next();
  })
});

itemSchema.pre('save', function(next){
  var doc = this;
  counterModel.findOneAndUpdate({_id:'commentId'},{$inc: {seq : 1}},{upsert:true, new:true},function(err,pre_doc){
    if(err) return next(err);
    console.log('pre_doc',pre_doc);
    doc.comments[0]._id = pre_doc.seq;
    next();
  })
});
