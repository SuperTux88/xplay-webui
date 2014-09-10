var xplayApp = angular.module('xplay', ['ui.bootstrap']);

function MainCtrl($scope, $timeout, $modal){

    /* ================================================================ */
    /* init values                                                      */
    /* ================================================================ */

    $scope.data = {
        position: { latitude: '-', longitude: '-', altitude: '-', overGround: '-' },
        speed: { indKias: '-', trueKtgs: '-' }
    }

    /* ================================================================ */
    /* settings                                                         */
    /* ================================================================ */

    var defaultSettings = {
        map: {
            baselayer: 'OpenStreetMap',
            gmaps: false,
            zoomLevel: 12,
            marker: {
                variant: 'red_black'
            }
        },
        fullscreen: false,
        sidebar: {
            position: true,
            speed: true,
            altitudeChart: true,
            artificialHorizon: true
        }
    };

    function loadDefaultSettings(settings, defaultSettings, overwrite) {
        for (var key in defaultSettings) {
            if (!(key in settings)) {
                settings[key] = defaultSettings[key];
            } else if (typeof defaultSettings[key] === 'object') {
                loadDefaultSettings(settings[key], defaultSettings[key], overwrite)
            } else if (overwrite) {
                settings[key] = defaultSettings[key];
            }
        }
    }

    if (localStorage.settings) {
        $scope.settings = JSON.parse(localStorage.settings);
        loadDefaultSettings($scope.settings, defaultSettings);
    } else {
        $scope.settings = defaultSettings;
    }

    $scope.resetSettings = function() {
        loadDefaultSettings($scope.settings, defaultSettings, true);
    }

    $scope.$watch('settings', function() {
        localStorage.settings = JSON.stringify($scope.settings);
    }, true);

    $scope.openSettings = function() {
        $modal.open({
            templateUrl: '/assets/html/settings-modal.html',
            scope: $scope
        });
    };


    /* ================================================================ */
    /* google maps code                                                 */
    /* ================================================================ */

    var googleRoadmapLayer, googleSatelliteLayer;

    // this is thrown into the global window object since it gets called by
    // Googles Callback
    window.addGoogleLayer = (function() {
        if (typeof google !== 'undefined') {
            googleRoadmapLayer = new L.Google('ROADMAP');
            googleSatelliteLayer = new L.Google('SATELLITE');
            layerControl.addBaseLayer(googleRoadmapLayer, 'Google Road');
            layerControl.addBaseLayer(googleSatelliteLayer, 'Google Satellite');
            if ($scope.settings.map.baselayer === 'Google Road') {
                map.removeLayer(layers[defaultSettings.map.baselayer]);
                map.addLayer(googleRoadmapLayer, true);
            } else if ($scope.settings.map.baselayer === 'Google Satellite') {
                map.removeLayer(layers[defaultSettings.map.baselayer]);
                map.addLayer(googleSatelliteLayer, true);
            }
        }
    }).bind(this);

    var googleMapsApiAdded = false;

    if($scope.settings.map.gmaps) {
        addGoogleMapsApi();
    }

    function addGoogleMapsApi() {
        var tag = document.createElement('script');
        tag.type = 'text/javascript';
        tag.src = '//maps.googleapis.com/maps/api/js?v=3.exp&callback=addGoogleLayer';
        document.getElementsByTagName('head')[0].appendChild(tag);
        googleMapsApiAdded = true;
    }

    $scope.$watch('settings.map.gmaps', function () {
        if ($scope.settings.map.gmaps) {
            if (!googleMapsApiAdded) {
                addGoogleMapsApi();
            } else {
                addGoogleLayer();
            }
        } else {
            if (typeof google !== 'undefined') {
                layerControl.removeLayer(googleRoadmapLayer);
                layerControl.removeLayer(googleSatelliteLayer);
                if ($scope.settings.map.baselayer === 'Google Road') {
                    map.removeLayer(googleRoadmapLayer);
                    map.addLayer(layers[defaultSettings.map.baselayer], true);
                } else if ($scope.settings.map.baselayer === 'Google Satellite') {
                    map.removeLayer(googleSatelliteLayer);
                    map.addLayer(layers[defaultSettings.map.baselayer], true);
                }
            }
        }
    });


    /* ================================================================ */
    /* leaflet map code                                                 */
    /* ================================================================ */

    $scope.followAircraft = true;

    var position = new L.LatLng(0, 0);

    var layers = {
        'OpenStreetMap': new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
            updateWhenIdle: false
        }),
        'Esri WorldImagery': new L.TileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        })
    };

    var myOptions = {
        zoom: $scope.settings.map.zoomLevel,
        center: position,
        layers: $scope.settings.map.baselayer in layers ? layers[$scope.settings.map.baselayer] : layers[defaultSettings.map.baselayer]
    };

    var map = L.map('map', myOptions),
        layerControl = new L.Control.Layers(layers, {});
    map.addControl(layerControl);

    var plane = new L.Marker(position, {
        title: 'plane',
        icon: new L.Icon({
            iconUrl: '/assets/images/planes/' + $scope.settings.map.marker.variant + '.png',
            iconSize: new L.Point(56, 56),
            iconAnchor: new L.Point(28, 28)
        })
    }).addTo(map);

    plane.on('move', function(e) {
        if ($scope.followAircraft) {
            map.panTo(e.latlng);
        }
    });

    L.easyButton('fa-crosshairs', function (){
        $scope.$apply(function () {
            $scope.followAircraft = true;
        });
        map.panTo(position);
    }, 'Follow Aircraft', map);

    map.on('zoomend', function () {
        $scope.$apply(function () {
            $scope.settings.map.zoomLevel = map.getZoom();
        });
    });

    map.on('baselayerchange', function (layer) {
        $timeout(function () {
            $scope.settings.map.baselayer = layer.name;
        });
    });

    map.on('drag', function () {
         if ($scope.followAircraft) {
            $scope.$apply(function () {
                $scope.followAircraft = false;
            });
        }
    });

    $scope.$watch('settings.fullscreen', function () {
        $timeout(function () {
            map.invalidateSize();
        });
    });

    $scope.$watch('settings.map.marker', function () {
        plane.setIcon(new L.Icon({
            iconUrl: '/assets/images/planes/' + $scope.settings.map.marker.variant + '.png',
            iconSize: new L.Point(56, 56),
            iconAnchor: new L.Point(28, 28)
        }));
    }, true);


    /* ================================================================ */
    /* charts                                                           */
    /* ================================================================ */

    function altitudeChartRange(range) {
        var min = 0;
        var max = range.max > 5000 ? range.max * 1.2 : range.max + 1000;
        return {min: min, max: max};
    }

    var altitudeSeries = new TimeSeries();
    var groundSeries = new TimeSeries();
    var altitudeChart;

    $scope.$watch('settings.sidebar.altitudeChart', function() {
        if ($scope.settings.sidebar.altitudeChart && !altitudeChart) {
            altitudeChart = new SmoothieChart({millisPerPixel: 100, yRangeFunction: altitudeChartRange});
            altitudeChart.addTimeSeries(altitudeSeries, {lineWidth: 2, strokeStyle: '#0072ff', fillStyle: 'rgba(0,114,255,0.30)'});
            altitudeChart.addTimeSeries(groundSeries, {lineWidth: 2, strokeStyle: '#007d00', fillStyle: 'rgba(0,125,0,0.30)'});
            altitudeChart.streamTo(document.getElementById('altitudeChart'), 250);
        }
    });


    /* ================================================================ */
    /* artificial horizon                                               */
    /* ================================================================ */

    $scope.$watch('settings.sidebar.artificialHorizon', function() {
        if ($scope.settings.sidebar.artificialHorizon && !artificialHorizon.running()) {
            artificialHorizon.start('artificialHorizon');
        }
    });


    /* ================================================================ */
    /* websocket code                                                   */
    /* ================================================================ */

    var wsProtocol = 'https:' == document.location.protocol ? 'wss:' : 'ws:';
    var ws = new ReconnectingWebSocket( wsProtocol + '//' + document.location.host + '/websocket' ) ;
    ws.onopen = function() {
        console.log( 'ws connected' );
        $scope.$apply(function() {
            $scope.status.websocket = { status: 'connected', icon: STATUS.receiving };
        });
    };
    ws.onconnecting = function() {
        console.log( 'ws connecting' );
        $scope.$apply(function() {
            $scope.status.websocket = { status: 'connecting', icon: STATUS.error };
        });
    };
    ws.onerror = function() {
        console.log( 'ws error' );
        $scope.$apply(function() {
            $scope.status.websocket = { status: 'error', icon: STATUS.error };
        });
    };
    ws.onclose = function() {
        console.log( 'ws closed' );
        $scope.$apply(function() {
            $scope.status.websocket = { status: 'disconnected', icon: STATUS.error };
        });
    };
    ws.onmessage = function(msgevent) {
        $scope.$apply(function() {

            var msg = JSON.parse(msgevent.data);
            if (msg[0] == 'p') {
                var pos = { latitude: msg[1], longitude: msg[2], altitude: msg[3], overGround: msg[4] };

                position = new L.LatLng(pos.latitude, pos.longitude);
                plane.setLatLng(position);

                pos.latitude = pos.latitude.toFixed(3);
                pos.longitude = pos.longitude.toFixed(3);
                $scope.data.position = pos;

                if ($scope.settings.sidebar.altitudeChart && !$scope.settings.fullscreen) {
                    var now = new Date().getTime();
                    altitudeSeries.append(now, pos.altitude);
                    groundSeries.append(now, (pos.altitude - pos.overGround));
                }
            } else if (msg[0] == 'prh') {
                var prh = { pitch: msg[1], roll: msg[2], trueHeading: msg[3] }

                plane.setIconAngle(prh.trueHeading);

                if ($scope.settings.sidebar.artificialHorizon) {
                    artificialHorizon.draw(prh.roll, prh.pitch);
                }

                $scope.data.pitchRollHeading = prh;
            } else if (msg[0] == 's') {
                $scope.data.speed = { indKias: msg[1], trueKtgs: msg[2] }
            } else if (msg[0] == 'u'){
                $scope.status.udp = { status: msg[1], icon: STATUS[msg[1]] };
            } else {
                console.log('in :', msg);
            }

        });
    };


    /* ================================================================ */
    /* connection status                                                */
    /* ================================================================ */

    $scope.status = {
        udp: { status: 'unknown', icon: 'glyphicon-question-sign' },
        websocket: { status: 'connecting', icon: 'glyphicon-question-sign' }
    }

    var STATUS = {
        initializing : 'glyphicon-question-sign',
        waiting : 'glyphicon-ok-sign icon-warning',
        receiving : 'glyphicon-ok-sign icon-success',
        error : 'glyphicon-remove-sign icon-danger'
    };
}
