'use strict';

angular.module('locatableDataApp')
  .controller('MainCtrl', function ($scope, $http, socket, uiGmapGoogleMapApi) {
    var appName = 'herbo';

// Map setup
    $scope.map = {
      center: {
        latitude: 40.1451,
        longitude: -99.6680
      },
      zoom: 4,
      bounds: {}
    };

    $scope.map.clusterOptions = {
        // title: 
        gridSize: 60, 
        ignoreHidden: true, 
        minimumClusterSize: 2
    };

    $scope.options = {
      scrollwheel: false
    };

// Used by angular-google-maps markers directive as model
    $scope.locatableMarkers = [];

    var createMarker = function(locatable) {
        var newMarker =  {
            latitude: locatable.long_lat[1],
            longitude: locatable.long_lat[0],
            //title: locatable.display_title,
            id: locatable._id, //for google maps
            _id: locatable._id, 
            options: {
                labelContent: locatable.display_title,
                labelAnchor: "22 0",
                labelClass: "marker-labels"
            }
        };
        newMarker.locatable = locatable;
        newMarker.getLocatableString = function(locatable) {
            return JSON.stringify(locatable);
        }
        newMarker.showWindow = false;
        newMarker.onClicked = function () {
            newMarker.showWindow = true;
            $scope.$apply();
            //window.alert("Marker: lat: " + newMarker.latitude + ", lon: " + newMarker.longitude + " clicked!!")
        };
        newMarker.closeClick = function () {
           newMarker.showWindow = false;
           $scope.$evalAsync();
        };

        return newMarker;
    };


// Function used by syncUpdates to transform locatable into locatableMarker before adding to locatableMarkers model.

    var locatableToLocatableMarker = function(locatable) {
        var swLong = $scope.map.bounds.southwest.longitude;
        var swLat = $scope.map.bounds.southwest.latitude;
        var neLong = $scope.map.bounds.northeast.longitude;
        var neLat = $scope.map.bounds.northeast.latitude; 
        console.log('In locatableToLocatableMarker: ' +swLong + ' / ' + swLat + ' / ' + neLong + ' / ' + neLat);
                
        
        var marker = createMarker(locatable);

        if (swLong < neLong) {
            if  (    
                        (swLong < marker.longitude) 
                    &&  (marker.longitude < neLong)
                    &&  (swLat < marker.latitude) 
                    &&  (marker.latitude < neLat) 
                ) {
                return marker;
            } else {
                return null;
            }
        } else {
            if (
                        (    
                                (                        
                                    (swLong < marker.longitude) && (marker.longitude < 180.0)
                                )
                            ||  (
                                    (-180.0 < marker.longitude) && (marker.longitude < neLong)
                                ) 
                        )
                    &&  (swLat < marker.latitude) 
                    &&  (marker.latitude < neLat) 
                ) {
                return marker;
            } else {
                return null;
            }
        }
    };

// Watches for google maps bounds changes, querying server based on new bounds when bounds changes.

    $scope.$watch(function() {
        return $scope.map.bounds;
    }, function(nv, ov) {
        if (nv.northeast && nv.southwest) {
            console.log( nv.northeast);

            console.log(nv.southwest);

            var url = '/api/locatables/'
                + nv.southwest.longitude + '/'
                + nv.northeast.latitude + '/' 
                + nv.northeast.longitude + '/'
                + nv.southwest.latitude + '/'
                + appName;
            console.log(url);

            $http.get(url).then(function(response) {
                var locatables = response.data;
                console.log(locatables.length);
                $scope.locatableMarkers.length = 0;
                locatables.forEach(function(locatable) {this.push(createMarker(locatable))}, $scope.locatableMarkers);
                if (!$scope.isSocketSet) {
                    socket.syncUpdates('locatable', $scope.locatableMarkers, angular.noop, locatableToLocatableMarker);
                    $scope.isSocketSet = true;                
                    console.log("setting socket");
                }
            }, function(response) {
                
            });
        }
    }, true);

    uiGmapGoogleMapApi.then(function(maps) {

        $scope.addLocatable = function() {
          if($scope.newLocatable === '') {
            return;
          }
          $http.post('/api/locatable', { name: $scope.newLocatable });
          $scope.newLocatable = '';
        };

        $scope.deleteLocatable = function(locatable) {
          $http.delete('/api/locatable/' + locatable._id);
        };

        $scope.$on('$destroy', function () {
          socket.unsyncUpdates('locatable');
          $scope.isSocketSet = false; 
        });
    });
  });
