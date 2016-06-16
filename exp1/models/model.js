var mongoose = require('mongoose');
var db = require('./db.js');

var userSchema = mongoose.Schema({
  _id : Number,
  email : String,
  fb_id : String,
  pw : String,
  fb_token : String,
  gcm_token : String,
  name: String,
  profile_image : String,
  comment: String,
  phone: String,
  date : {type: Date , default : Date.now},
  history_create : [{type : Number , ref : "Item"}],
  history_join : [{type : Number , ref : "Item"}],
  history_mc : [{type : Number , ref : "Item"}],
  history_like : [{type : Number , ref : "Item"}],
  alarm : [{
    status : Number,
    mid : Number,
    uid : Number,
    comment : String,
    date : {type: Date , default : Date.now}
  }]
});

var itemSchema = mongoose.Schema({
_id : Number,
status : {type :Number, default : 1},
creator : {type: Number , ref : 'User'},
mc : {type: Number , ref : 'User'},
apply_mc_result : [Number],
has_mc : {type : Boolean, default : false },
reg_date : {type:Date, default : Date.now},
image : String,
image_size : [Number],
title : String,
title_sub : String,
schedule : [String],
location_detail : String,
location_area : String,
date : String,  //time은 date형으로 만들어야하나 더미용으로 String
start_time : String,
end_time : String,
fee : {type : String, default: 0},
limit_num : {type : String, default: 0},
guests : [{type: Number , ref : 'User'}],
like : {type: Number, default : 0},
likeList : [Number],
comments : [
  {
    user : {type : Number, ref: 'User'},
    content : String,
    profile_image : String,
    like : {type : Number, default : 0},
    likeList : [Number],
    date : {type: Date , default : Date.now},
    reply : [
      {
        user : {type : Number, ref: 'User'},
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
mongoose.model('User', userSchema);
mongoose.model('Item', itemSchema);
