'use strict';

var geocoderProvider = 'google';
var httpAdapter = 'http';

var _ = require('lodash');
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter);

var Locatable = require('./locatable.model');

function createGeocoderString(locatable) {
    var address2 = '';
    if (locatable.address2) {address2 = locatable.address2;}
    return locatable.address1 + ' ' +
        address2 + ', ' +
        locatable.city + ', ' +
        locatable.state + ' ' +
        locatable.zip;
}


// Get list of locatables
exports.index = function(req, res) {
    var now = new Date();
    var queryObj = { 
        $and: [ //needed for queries on same fields or operators (https://docs.mongodb.org/manual/reference/operator/query/and/)
            {$or: [ {deleted: false }, { deleted: {  $exists : false }} ]},
            {$or: [ {time_active_begin: { $lte : now} }, { time_active_begin: {  $exists : false }} ]},
            {$or: [ {time_active_end:   { $gt : now} },  { time_active_end: {  $exists : false}} ]}
        ]
    };

    Locatable.find(queryObj, function (err, locatables) {
        if(err) { return handleError(res, err); }
        return res.status(200).json(locatables);
    });
};

// Get list of locatables within a Mongo 2d (Euclidian) box
exports.getInBox = function(req, res) {
    var now = new Date();

    var upperLeftLong = parseFloat(req.params.upperleftlong);
    var upperLeftLat= parseFloat(req.params.upperleftlat);
    var lowerRightLong = parseFloat(req.params.lowerrightlong);
    var lowerRightLat = parseFloat(req.params.lowerrightlat);

/*
        geoWithinObj = { 12/15/15:RM: this doesn't work... :(
        //since queries can span hemispheres, use Mongo CRS. For this setting
        // Mongo uses Mongo CRS when polygon spans hemispheres or default CRS when within a 
        // hemisphere. Uses counter-clockwise winding. See:
        //https://docs.mongodb.org/manual/reference/operator/query/geoWithin/#geowithin-big-poly
            $geometry: {
                type : "Polygon" ,
                coordinates: [
                    [
                        [ upperLeftLong, upperLeftLat ], [ upperLeftLong, lowerRightLat ], [ lowerRightLong, lowerRightLat ], [ lowerRightLong, upperLeftLat ], [ upperLeftLong, upperLeftLat ]
                    ]
                ],
                crs: {
                    type: "name",
                    properties: { name: "urn:x-mongodb:crs:strictwinding:EPSG:4326" }
                }
            }
        };
*/
    var queryObj = null;

    if (upperLeftLong <= lowerRightLong) {
        queryObj = { 
            long_lat : { 
                $geoWithin :  { 
                    $box: [ 
                        [ upperLeftLong , upperLeftLat ] ,
                        [ lowerRightLong , lowerRightLat ] 
                    ]
                }
            },
            $and: [ //needed for queries on same fields or operators (https://docs.mongodb.org/manual/reference/operator/query/and/)
                {$or: [ {deleted: false }, { deleted: {  $exists : false }} ]},
                {$or: [ {time_active_begin: { $lte : now} }, { time_active_begin: {  $exists : false }} ]},
                {$or: [ {time_active_end:   { $gt : now} },  { time_active_end: {  $exists : false}} ]}
            ]
        };
    } else {
        queryObj = { 
            $and: [ //needed for queries on same fields or operators (https://docs.mongodb.org/manual/reference/operator/query/and/)
                {$or: [ 
                    {
                        long_lat : { 
                            $geoWithin :  { 
                                $box: [ 
                                    [ upperLeftLong , upperLeftLat ] ,
                                    [ 180.0 , lowerRightLat ] 
                                ]
                            }
                        }
                    },
                    {
                        long_lat : { 
                            $geoWithin :  { 
                                $box: [ 
                                    [ -180.0 , upperLeftLat ] ,
                                    [ lowerRightLong , lowerRightLat ] 
                                ]
                            }
                        }
                    }
                ]},
                {$or: [ {deleted: false }, { deleted: {  $exists : false }} ]},
                {$or: [ {time_active_begin: { $lte : now} }, { time_active_begin: {  $exists : false }} ]},
                {$or: [ {time_active_end:   { $gt : now} },  { time_active_end: {  $exists : false}} ]}
            ]
        };
    } 
    
    if (req.params.bodytype) {
        queryObj.body_type = req.params.bodytype;
    }

    Locatable.find(queryObj, function (err, locatables) {
        if(err) { return handleError(res, err); }
        return res.status(200).json(locatables);
    });
};



// Get a single locatable
exports.show = function(req, res) {
  Locatable.findById(req.params.id, function (err, locatable) {
    if(err) { return handleError(res, err); }
    if(!locatable || locatable.deleted) { return res.status(404).send('Not Found'); }
    return res.json(locatable);
  });
};

// Creates a new locatable in the DB.
exports.create = function(req, res) {
    var locatable = new Locatable(req.body);
    locatable.user_created = req.user;
    locatable.user_updated_last = req.user;

    console.log(locatable.long_lat);

    if ( (!locatable.long_lat || locatable.long_lat.length !== 2) && locatable.address1) {
        geocoder.geocode(createGeocoderString(locatable))
        .then(function(resp) {
            if (resp.length > 0) {
                locatable.long_lat = [resp[0].longitude, resp[0].latitude]
                locatable.save(function(err) {
                    if(err) { return handleError(res, err); }
                    /*
                    //pull from database so it doesn't include embedded user_created, just its id.
                    Locatable.findById(locatable._id, function (err, locatableFromQuery) {
                        if(err) { return handleError(res, err); }
                        if(!locatableFromQuery) { return res.status(404).send('Not Found'); }
                        return res.status(201).json(locatableFromQuery);
                    });
                    */
                    return res.status(201).json(locatable);
                });
            } else {
                return res.status(400).send("Bad Request. Geocoder could not locate address.");
            }
        })        
        .catch(function(err) {
            return res.status(400).send(err);
        });
    } else if (locatable.long_lat && locatable.long_lat.length === 2) {
        locatable.save(function(err) {
            if(err) { return handleError(res, err); }
            return res.status(201).json(locatable);
        });
    } else {
        return res.status(400).send("Bad Request. Must include latitude and longitude or a valid address.");
    }
};
/*
  Locatable.create(req.body, function(err, locatable) {
    if(err) { return handleError(res, err); }
    return res.status(201).json(locatable);
  });
*/


// Updates an existing locatable in the DB.
exports.update = function(req, res) {
    if(req.body._id) { delete req.body._id; }
    Locatable.findById(req.params.id, function (err, locatable) {
        if (err) { return handleError(res, err); }
        if(!locatable) { return res.status(404).send('Not Found'); }

        var updatedlocatable = new Locatable(req.body);
        var updated = _.merge(locatable, req.body);
        console.log(updated);
        updated.user_updated_last = req.user;

        if ( (!locatable.long_lat || locatable.long_lat.length !== 2) && locatable.address1) {
        //if (!updatedlocatable.latitude && !updatedlocatable.longitude && updatedlocatable.address1) {
            geocoder.geocode(createGeocoderString(updatedlocatable))
            .then(function(resp) {
                if (resp.length > 0) {
                    updated.long_lat = [resp[0].longitude, resp[0].latitude]
                    //updated.latitude = resp[0].latitude;
                    //updated.longitude = resp[0].longitude;
                    updated.markModified('body');
                    updated.save(function (err) {
                        if (err) { return handleError(res, err); }
                        return res.status(200).json(locatable);
                    });
                } else {
                    return res.status(400).send("Bad Request. Geocoder could not locate address.");
                }
            })        
            .catch(function(err) {
                return res.status(400).send(err);
            });
        } else {
            updated.markModified('body');
            updated.save(function (err) {
                if (err) { return handleError(res, err); }
                return res.status(200).json(locatable);
            });
        }
    });
};

// Deletes a locatable from the DB.
exports.destroy = function(req, res) {
  Locatable.findById(req.params.id, function (err, locatable) {
    if(err) { return handleError(res, err); }
    if(!locatable) { return res.status(404).send('Not Found'); }
    locatable.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.status(204).send('No Content');
    });
  });
};

exports.isCreator = function(req, res, next) {
    Locatable.findById(req.params.id, function (err, locatable) {
        if(err) { return handleError(res, err); }
        if(!locatable) { return res.status(404).send('Not Found'); }
        var locatableUserCreated = locatable.user_created.toString();
        var userId = req.user.id.toString();
        if (locatableUserCreated !== userId) {
		    return res.send(403, 'User is not creator');
        }
	    next();
    });
};

function handleError(res, err) {
  return res.status(500).send(err);
}


