'use strict';

// Mongo shell howto: https://docs.mongodb.org/manual/tutorial/getting-started-with-the-mongo-shell/

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LocatableSchema = new Schema({
    display_title: {
		type: String,
		required: true,
		trim: true
    },
    display_detail: {
		type: String,
		trim: true
    },
    time_active_begin: {
		type: Date,
        index: true
	},
    time_active_end: {
		type: Date,
        index: true
	},
    deleted: {
        type: Boolean,
        required: true,
        default: false
    },
	user_created: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	},
	user_updated_last: {
		type: Schema.Types.ObjectId,
		ref: 'User'
	},
    long_lat: { 
        type: [Number], 
        //index: '2dsphere' //2dsphere lines follow spherical great circle and not latitude lines
        //                      resulting in points in google map bounds not found in query.
        index: '2d'
    },
//[],
/*    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
*/
    address1: {
		type: String,
		default: '',
		trim: true
    },
    address2: {
		type: String,
		default: '',
		trim: true
    },
    city: {
		type: String,
		default: '',
		trim: true
    },
    state: {
		type: String,
		default: '',
		trim: true
    },
    zip: {
		type: String,
		default: '',
		trim: true
    },
    body_type: {
	    type: String,
	    required: true,
	    trim: true
    },
    body: Object
}, {timestamps: {createdAt: 'time_created', updatedAt: 'time_updated'}});

/*
var DealsSchema = new Schema({
  name: {
		type: String,
		default: '',
		required: 'Please add a deal name',
		trim: true
  },
  imageUrl: {
		type: String,
		default: '',
		trim: true
  },
});

var LocationSchema = new Schema({
	name: {
		type: String,
		default: '',
		required: 'Please fill Location name',
		trim: true
	},
  phone: {
		type: String,
		default: '',
		trim: true
  },
  tagline: {
		type: String,
		default: '',
		trim: true
  },
  logoUrl: {
		type: String,
		default: '',
		trim: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  isMedical: {
    type: Boolean,
    default: false
  },
  isRecreational: {
    type: Boolean,
    default: false
  },
  doesDeliver: {
    type: Boolean,
    default: false
  },
  tags: {
    type: String,
		default: '',
		trim: true
  },
  deals: [
    DealsSchema
  ]
});

*/

//LocatableSchema.index({ long_lat: '2d' });
module.exports = mongoose.model('Locatable', LocatableSchema);
