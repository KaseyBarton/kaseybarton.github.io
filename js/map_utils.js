/*
Barton Lab Map Utilities 

Release Date: January 2014

Author: John Maurer <jmaurer@hawaii.edu>

This file provides map utilities for displaying data via the Google Maps API.
Used for research pages in the lab of Kasey E. Barton <kbarton@hawaii.edu> at
the University of Hawaii at Manoa Department of Botany.
*/

// Convert buttons to jQuery UI buttons after page load:

jQuery( document ).ready(
  function () {
    jQuery( '#enterCoordinatesButton' ).button();
    jQuery( '#utmButton' ).button();
    jQuery( '#ddButton' ).button();
    jQuery( '#dmsButton' ).button();
  }
); // ready()

/* Global variables: */

var map = null;
var overlay = null;
var sites = [];
var markers = new Array();
var lastMarker = null;
var lastInfoWindow = null;
var maxZoomService = null;
var elevationService = null;
var customMapStyleControl = null;
var mouseout = null;

var proj4_source_crs      = new Proj4js.Proj( 'UTM5' );
var proj4_destination_crs = new Proj4js.Proj( 'EPSG:4326' ); // lat/lng

/*
loadMap()
Loads the Google Maps API at the specified bounding box and zoom level.
*/

function loadMap ( bounds, zoom ) {

  // Set all default selections to avoid cached responses:

  if ( document.getElementById( 'icon' ) ) document.getElementById( 'icon' ).selectedIndex = 0;
  if ( document.getElementById( 'overlay' ) ) document.getElementById( 'overlay' ).selectedIndex = 0;
  if ( document.getElementById( 'sites' ) ) document.getElementById( 'sites' ).selectedIndex = 0;
  if ( document.getElementById( 'zoom' ) ) document.getElementById( 'zoom' ).selectedIndex = 0;

  // Set map options; compute center from supplied bounding box:

  var center = bounds.getCenter();

  var mapOptions = {
    center: center, 
    zoom: zoom,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    scaleControl: true,
    panControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    scaleControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    streetViewControl: false,
    fullscreenControl: false
  };

  map = new google.maps.Map( document.getElementById( 'map' ), mapOptions );

  map.fitBounds( bounds );
  map.setCenter( center );

  // Add custom control to select custom map styles:

  var customMapStyleDiv = document.createElement( 'div' );
  customMapStyleControl = new CustomMapStyleControl( customMapStyleDiv, map );
  customMapStyleDiv.index = 1;
  map.controls[ google.maps.ControlPosition.TOP_RIGHT ].push( customMapStyleDiv );

  // Add draggable zoom box from keyDragZoom.js;
  // Use control (ctrl) key for IE and shift key for all others,
  // to avoid unusual behavior (holding shift will highlight/select
  // entire screen in IE):

  var myBrowser = navigator.appName;
  var keyToDrag;

  if ( myBrowser.match( /Internet Explorer/ ) ) {
    keyToDrag = 'ctrl';
  }
  else {
    keyToDrag = 'shift';
  }

  map.enableKeyDragZoom( {
      key: keyToDrag,
       boxStyle: { border: "medium solid yellow", backgroundColor: "transparent", opacity: 1 },
      paneStyle: { backgroundColor: "black", opacity: 0.1 }
    }
  );

  // Add UH Botany logo:

  addBotanyLogo();

  // Update cursor location information as user hovers over map:

  /* TOO EXPENSIVE; AVOID REACHING FREE LIMITS...
  elevationService = new google.maps.ElevationService();
  var cursorElevationCounter = 1;
  */

  google.maps.event.addListener( map, 'mousemove',
    function ( event ) {
      if ( !event ) {
        document.getElementById( 'cursorMapCoordinates' ).innerHTML = '&nbsp;';
        return;
      }
      mouseout = false;
      var cursor_latlng = event.latLng; 
      var cursor_lat = cursor_latlng.lat();
      var cursor_lon = cursor_latlng.lng();
      var cursor_location_str = '<b>cursor:</b> ' + cursor_lat.toFixed( 4 ) + '&deg;, ' + cursor_lon.toFixed( 4 ) + '&deg;';
      if ( document.getElementById( 'cursorMapCoordinates' ) ) {
        document.getElementById( 'cursorMapCoordinates' ).innerHTML = cursor_location_str;
      }

      /*
      if ( cursorElevationCounter >= 3
        && !document.getElementById( 'cursorElevation' ).innerHTML.match( 'show elevations' ) ) {
        elevationService.getElevationForLocations( createElevationRequest( cursor_latlng ),
          function( results, status ) {
            if ( status == google.maps.ElevationStatus.OK && !mouseout ) {
              if ( results[ 0 ] ) {
                var elevation;
                var elevationMeters = results[ 0 ].elevation;
                var elevationString = getElevationString( elevationMeters, 'm' );
                document.getElementById( "cursorElevation" ).innerHTML = '<b>elevation:</b> ' + elevationString;
              }
            }
          }
        );

        cursorElevationCounter = 1;
      }
      else {
        cursorElevationCounter++;
      }
      */
    }
  );

  google.maps.event.addListener( map, 'mouseout',
    function ( event ) {
      mouseout = true;
      if ( document.getElementById( 'cursorMapCoordinates' ) ) {
        document.getElementById( 'cursorMapCoordinates' ).innerHTML = '&nbsp;';
      }
      /*
      setTimeout (
        function () {
          if ( !document.getElementById( 'cursorElevation' ).innerHTML.match( 'show elevations' ) ) {
            document.getElementById( 'cursorElevation' ).innerHTML = '&nbsp;';
          }
        },
        100
      );
      */
    }
  );
 
} // loadMap()


/*
addOverlayKML()
Adds the KML/KMZ file at the specified url to the map.
*/

function addOverlayKML ( url, preserveViewport ) {

  // Re-set the default overlay selection afterwards:

  setTimeout(
    function () {
      if ( document.getElementById( 'overlay' ) ) {
        document.getElementById( 'overlay' ).selectedIndex = 0;
      }
    },
    750
  );

  // Turn off previous overlay, if any:

  clearOverlayKML();

  // Turn on KML/KMZ overlay:

  if ( url ) {

   var suppressInfoWindows = true;

   if ( url.match( /hawaii_reserves/ )
     || url.match( /oahu_seedzones/ )
     || url.match( /rain_gauges/ ) ) {
     suppressInfoWindows = false;
   }

   if ( typeof( preserveViewport ) == 'undefined' ) {
     preserveViewport = false;
   }

   overlay = new google.maps.KmlLayer(
     {
       url: url,
       preserveViewport: preserveViewport,
       suppressInfoWindows: suppressInfoWindows
     }
   );

   overlay.setMap( map );
  }

} // addOverlayKML()


/*
clearOverlayKML()
Clears the currently displayed KML overlay, if any.
*/

function clearOverlayKML () {

  if ( overlay ) {
    overlay.setMap();
    overlay = null;
  }

  return;

} // clearOverlayKML()


/*
addSites()
Adds placemarks on the map using the specified Google Sheets identifier. Data
will be read using the Google Sheets API.

marker_size is an optional parameter and expects values of either "small"
or "large". If "small", the sites will be mapped using small circle symbols.
If "large", the default Google Maps teardrop marker icons will be used.

Optional "query_column" (e.g., "Sites") and "query_value" (e.g., "mexicana")
parameters will query sites for a certain column and value setting.

Optional "label_column"  (e.g., "Site ID") parameter will be used to get
labels to put on the markers. These can be single letters or single numbers.
*/

function addSites ( spreadsheet_id, marker_size, query_column, query_value, label_column ) {

  // Turn off previous sites overlay, if any:

  if ( sites ) {
    clearSites();
  }

  // Add the specified Google Sheets table to the map:

  if ( spreadsheet_id ) {

    // Get the title (e.g., "Sheet1") of the first sheet in the document:

    var sheet_title = getSheetTitle( spreadsheet_id );
 
    // URL to data; this returns JSON via Google Sheets API:

    var sheets_url = google_sheets_baseurl + spreadsheet_id + '/values/' + sheet_title + '?key=' + google_api_key;

    jQuery.ajax(
      {
        async: true,
        url: sheets_url,
        dataType: 'json',
        success: function ( response ) {
          mapSites( response, marker_size, query_column, query_value, label_column );
        },
        error: function ( response, status_str ) {
          alert( 'Cannot load data!' );
          console.info( status_str );
          console.info( response.responseText );
        }
      }
    );
  }

  // Show/hide icon size selector:

  if ( document.getElementById( 'icon' ) ) {
    if ( spreadsheet_id ) {
      document.getElementById( 'icon' ).style.display = '';
    }
    else {
      document.getElementById( 'icon' ).style.display = 'none';
    }
  }

  return;

} // addSites()


/*
mapSites()
Takes response from Google Sheets API values request and places markers
at each location. Expects first row to include a header with column
names. Expects columns with names "latitude" and "longitude" in order to
determine marker locations. Generates pop-up window with all other data
columns.

"data" response is expected in following format:
https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values#ValueRange

marker_size is an optional parameter and expects values of either "small"
or "large". If "small", the sites will be mapped using small circle symbols.
If "large", the default Google Maps teardrop marker icons will be used.

Optional "query_column" (e.g., "Sites") and "query_value" (e.g., "mexicana")
parameters will query sites for a certain column and value setting.

Optional "label_column"  (e.g., "Site ID") parameter will be used to get
labels to put on the markers. These can be single letters or single numbers.
*/

function mapSites ( data, marker_size, query_column, query_value, label_column, marker_color ) {

  // Grab data values array from Google Sheets data object:

  var values = data.values;

  // We expect header in first row, with column names:

  var header = values[ 0 ];

  // Which columns contain latitude and longitude coordinates?:

  var lat_index = findLatIndex( header );
  var lon_index = findLonIndex( header );

  // Which column contains the query_column (if any)?:

  var query_index;

  if ( query_column ) { 
    query_index = findColIndex( header, query_column );
  }

  // Which column contains the label_column (if any)?:
  
  var label_index;

  if ( label_column ) {
    label_index = findColIndex( header, label_column );
  }

  // Loop through each spreadsheet row, following the initial header row,
  // and produce a map marker:

  for ( var i = 1; i < values.length; i++ ) {
    mapSite( values[ i ], header, lat_index, lon_index, marker_size, query_index, query_value, label_index, marker_color );
  }

  return;

} // mapSites()


/*
mapSite()
Takes one row of data from the Google Sheets API and produces a map marker.
Must specify the array index of the latitude and longitude coordinates and
an array of column names. The column names will be used to produce an info
pop-up window for the marker with the data values at this site.

marker_size is an optional parameter and expects values of either "small"
or "large". If "small", the sites will be mapped using small circle symbols.
If "large", the default Google Maps teardrop marker icons will be used.

Optional "query_index" (e.g., 0, 1, 2) and "query_value" (e.g., "mexicana")
parameters will query sites for a certain column array index (within header
array) and value setting.
*/

function mapSite ( row, header, lat_index, lon_index, marker_size, query_index, query_value, label_index, marker_color ) {

  // Query? If so, check if we should include this site or not:
 
  if ( typeof( query_index ) != 'undefined' ) {

    var data_value = row[ query_index ];

    // If query_value is empty string, look for undefined data values:
    
    if ( query_value == '' ) {
      if ( typeof( data_value ) != 'undefined'
        && data_value != '' ) {
        return; 
      }
    } 

    // If this site does not match the query value, do nothing (do not map it);
    // NOTE: query value can be a list of values or a single value:
   
    else {
   
      // Multi value comparisons:

      if ( typeof( query_value ) == 'object' ) {
        if ( query_value.indexOf( data_value ) == -1 ) {
          return;
        }
      } 

      // Single value comparison:

      else if ( data_value != query_value ) { 
        return; 
      }
    }
  } 
  
  // Determine the latitude and longitude of this data point:

  var lat = row[ lat_index ];
  var lon = row[ lon_index ];

  // If there are no lat or lon, do nothing; cannot be mapped:

  if ( lat == null
    || lon == null ) {
    return;
  }

  var position = {
    lat: parseFloat( lat ),
    lng: parseFloat( lon )
  };

  // Should this marker include a label?:
 
  var label;
  
  if ( marker_size == 'large'
    && typeof( label_index ) != 'undefined' ) {
    label = row[ label_index ];
    icon = null;
  }

  // Define a title for the marker if a label column is specified:

  var title;
 
  if ( typeof( label_index ) != 'undefined' ) {
    title = row[ label_index ];
  } 
  
  // If marker_size is "small", use small circle symbol. Otherwise,
  // use default Google Maps "teardrop" icon:

  var icon = getMarkerIcon( marker_size, label, marker_color );

  // Should this marker include a label?:
  // DEPRECATED: This version will add label to default red marker;
  // if want white marker (or other color), use getMarkerIcon(): 
  if ( label ) { 
    //icon = null;
  }
      
  // Place a marker on the map at this position:

  var marker = new google.maps.Marker(
    {
      position: position,
      map: map,
      icon: icon,
      title: title 
      //label: label
    }
  );

  // When marker is clicked, produce an info pop-up window with data:
 
  google.maps.event.addListener( marker, 'click', 
    function () {
      clickSite( marker, row, header );
    }
  );

  // Record this marker for subsequent removal by clearMarkers():

  sites.push( marker );

  return;

} // mapSite()


/*
clickSite()
Displays an info pop-up window with all the data for the site that
was clicked. row contains the site data from Google Sheets. header
contains the column names.
*/

function clickSite ( marker, row, header ) {

  // Close last info window, if any:

  if ( lastInfoWindow ) {
    lastInfoWindow.close();
  }

  // Construct info pop-up window HTML content:

  var info_html = '';

  for ( var i = 0; i < header.length; i++ ) {

    // Get the column name/label and data value:

    var col_label = header[ i ];
    var col_value = row[ i ];

    info_html += '<b>' + col_label + ':</b> ' + col_value + '<br/>';
  }

  // Display the info window at the clicked marker:

  var infoWindow = new google.maps.InfoWindow( { content: info_html } );
  infoWindow.open( map, marker );

  // Record info window so can be subsequently closed:

  lastInfoWindow = infoWindow;

  return;

} // clickSite()


/*
getMarkerIcon()
Returns a Google Maps marker icon object. Will return a small circle SVG symbol
if size is "small". Otherwise, returns default teardrop style marker.
*/

function getMarkerIcon ( size, label, color ) {

  var icon;

  // Default color is red:

  if ( !color ) {
    color = '#ff6464'; 
  }

  // Default stroke color is black, unless the marker is black:
 
  var stroke_color = '#000000';

  if ( color == '#000000' ) {
    stroke_color = '#ffffff';
  }
 
  // Small icon?:

  if ( typeof( size ) != 'undefined'
    && size
    && size.toLowerCase() == 'small' ) {

    // Define a small circle SVG icon:

    icon = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 4,
      fillColor: color,
      //fillColor: '#ffffff',
      fillOpacity: 1.0,
      strokeColor: stroke_color,
      strokeWeight: 1
    };
  }

  // Large icon?:
 
  else {

    // If label desired, make marker white and add label as documented here:
    // https://github.com/Concept211/Google-Maps-Markers
    
    if ( label ) {

      // Possible colors:
      // red, black, blue, green, grey, orange, purple, white, yellow
     
      var this_color = 'white';
  
      if ( color.toLowerCase() == '#ffffff' ) {
        this_color = 'white';
      }
      else if ( color == '#000000' ) {
        this_color = 'black';
      }
      else if ( color == '#595959' )  {
        this_color = 'grey';
      }
      else if ( color.toLowerCase() == '#ff6464' ) {
        this_color = 'red';
      }
 
      icon = 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_' + this_color;
      icon += label; // A-Z, 1-100, !, @, $, +, -, =, (%23 = #), (%25 = %), (%26 = &), (blank = dot)
      icon += '.png';
    }

    // Otherwise, use default red dot teardrop marker:

    else {    
      icon = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'; 
      //icon = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    }
  } 
  

  return icon;

} // getMarkerIcon()


/*
clearSites()
Clears all site markers from the map using our global sites array.
*/

function clearSites () {

  // Close last opened info window, if any:

  if ( lastInfoWindow ) {
    lastInfoWindow.close();
  }

  // Loop through the displayed site markers, and remove them from the map:

  for ( var i = 0; i < sites.length; i++ ) {
    var site = sites[ i ];
    google.maps.event.clearInstanceListeners( site );
    site.setMap( null );
  }

  return;

} // clearSites()


/*
showLocation()
Displays a placemark on the map at the specified coordinates, which it takes
from the input fields in a special div on the page.
*/

function showLocation () {

  // Get input fields; only some will have values: 
   
  var easting = document.getElementById( 'easting' ).value;
  var northing = document.getElementById( 'northing' ).value;
  var lat = document.getElementById( 'lat' ).value;
  var lon = document.getElementById( 'lon' ).value;
  var latd = document.getElementById( 'latd' ).value;
  var latm = document.getElementById( 'latm' ).value;
  var lats = document.getElementById( 'lats' ).value;
  var lond = document.getElementById( 'lond' ).value;
  var lonm = document.getElementById( 'lonm' ).value;
  var lons = document.getElementById( 'lons' ).value;
     
  // Fill in the coordinates to display:
 
  var show_lat = null;
  var show_lon = null;
  var show_easting = null;
  var show_northing = null;
  var show_latd = null;
  var show_latm = null;
  var show_lats = null;
  var show_lond = null;
  var show_lonm = null;
  var show_lons = null;

  // Were coordinates supplied as easting and northing?:

  if ( easting != '' && northing != '' ) {
    easting = parseFloat( easting ); 
    northing = parseFloat( northing );
    if ( !isNaN( easting ) && !isNaN( northing ) ) {
      show_easting = easting;
      show_northing = northing;
      var location = new Proj4js.Point( easting, northing );
      Proj4js.transform( proj4_source_crs, proj4_destination_crs, location );
      show_lat = location.y;
      show_lon = location.x;
      var show_lat_dms = dd2dms( show_lat );
      var show_lon_dms = dd2dms( show_lon );
      show_latd = show_lat_dms.deg;
      show_latm = show_lat_dms.min;
      show_lats = show_lat_dms.sec;
      show_lond = show_lon_dms.deg;
      show_lonm = show_lon_dms.min;
      show_lons = show_lon_dms.sec;
    }
  }

  // Were coordinates supplied as decimal degrees (latitude and longitude)?:

  else if ( lat != '' && lon != '' ) {
    lat = parseFloat( lat );
    lon = parseFloat( lon );
    if ( !isNaN( lat ) && !isNaN( lon ) ) {
      show_lat = lat;
      show_lon = lon;
      var show_lat_dms = dd2dms( show_lat );
      var show_lon_dms = dd2dms( show_lon );
      show_latd = show_lat_dms.deg;
      show_latm = show_lat_dms.min;
      show_lats = show_lat_dms.sec;
      show_lond = show_lon_dms.deg;
      show_lonm = show_lon_dms.min;
      show_lons = show_lon_dms.sec;
      var location = new Proj4js.Point( show_lon, show_lat );
      Proj4js.transform( proj4_destination_crs, proj4_source_crs, location );
      show_easting = location.x;
      show_northing = location.y;
    }
  }

  // Were coordinates supplied as degrees, minutes, seconds (latitude and
  // longitude)?:

  else if ( latd != '' && latm != '' && lats != '' && lond != '' && lonm != '' && lons != '' ) {
    latd = parseFloat( latd );
    latm = parseFloat( latm );
    lats = parseFloat( lats );
    lond = parseFloat( lond );
    lonm = parseFloat( lonm );
    lons = parseFloat( lons );
    if ( !isNaN( latd ) && !isNaN( latm ) && !isNaN( lats ) && !isNaN( lond ) && !isNaN( lonm ) && !isNaN( lons ) ) {
      show_lat = dms2dd( latd, latm, lats );
      show_lon = dms2dd( lond, lonm, lons );
      show_latd = latd;
      show_latm = latm;
      show_lats = lats;
      var location = new Proj4js.Point( show_lon, show_lat );
      Proj4js.transform( proj4_destination_crs, proj4_source_crs, location );
      show_easting = location.x;
      show_northing = location.y;
    }
  }
 
  // Hide the input window now that we have the coordinates:
 
  document.getElementById( 'enterCoordinates' ).style.display = 'none';

  // Display a placemark at the specified coordinates:
  
  if ( show_lat && show_lon ) {
    if ( !isNaN( show_lat ) && !isNaN( show_lon ) ) {
      var location = new google.maps.LatLng( show_lat, show_lon );
      map.setCenter( location );
      var latStr = show_lat.toFixed( 6 ).toString();
      var lonStr = show_lon.toFixed( 6 ).toString();
      latStr = latStr.replace( /0*$/, '' );
      lonStr = lonStr.replace( /0*$/, '' );
      var eastingStr = show_easting.toFixed( 3 ).toString();
      var northingStr = show_northing.toFixed( 3 ).toString(); 
      var markerOptions = { position: location, map: map, title: latStr + ', ' + lonStr };
      var marker = new google.maps.Marker( markerOptions );
     
      if ( !elevationService ) {
        elevationService = new google.maps.ElevationService();
      }

      var elevation_request = createElevationRequest( location );

      elevationService.getElevationForLocations( elevation_request,
        function( results, status ) {
          if ( status == google.maps.ElevationStatus.OK ) {
            if ( results[ 0 ] ) {
              var elevation;
              var elevationMeters = results[ 0 ].elevation;
              var elevationString = getElevationString( elevationMeters, 'm', 4 );
              //alert( elevationMeters );
              
              var markerHtml;
              
              markerHtml = '<div style="width: 260px;"><p><b>lat, lon: </b>' + latStr + ', ' + lonStr + '<br/>';
              markerHtml += '<b>lat, lon: </b>' + show_latd + '&deg; ' + show_latm + "' " + show_lats + '", ' + show_lond + '&deg; ' + show_lonm + "' " + show_lons + '"<br/>';
              markerHtml += '<b>easting, northing: </b>' + eastingStr + ', ' + northingStr + '<br/>';
              markerHtml += '<b>elevation: </b>' + elevationString + '</p>';
              markerHtml += '<p style="margin-bottom: 12px; white-space: nowrap;"><b><a href="javascript:void(0)" onClick="this.blur(); map.panTo( new google.maps.LatLng( ' + show_lat + ',' + show_lon + ' ) )">center</a>'
                + '&nbsp;&#149;&nbsp;<a href="javascript:void(0)" onClick="this.blur(); zoomTo( ' + show_lat + ',' + show_lon + ' );">zoom</a>'
                + '&nbsp;&#149;&nbsp;<a href="javascript:void(0)" onClick="removeLastMarker()">remove</a></b></p></div>';
              
              var infoWindow = new google.maps.InfoWindow( { content: markerHtml } );
              
              lastInfoWindow = infoWindow;
            
              google.maps.event.addListener( marker, 'click',
                function() { 
                  lastMarker = marker;
                  infoWindow.open( map, marker );
                }
              );

              markers.push( marker );
            }
          }
        }
      );
    }
  }

  // Clear out the input values so they are ready to take new values next time:

  document.getElementById( 'easting' ).value = '';
  document.getElementById( 'northing' ).value = '';
  document.getElementById( 'lat' ).value = '';
  document.getElementById( 'lon' ).value = '';
  document.getElementById( 'latd' ).value = '';
  document.getElementById( 'latm' ).value = '';
  document.getElementById( 'lats' ).value = '';
  document.getElementById( 'lond' ).value = '';
  document.getElementById( 'lonm' ).value = '';
  document.getElementById( 'lons' ).value = '';

} // showLocation()


/*
showElevation()
Un-hides the cursorElevation div. This signals to our Google Maps mousemove
listener to compute the elevation at each cursor location.
*/

function showElevation () {

  document.getElementById( 'cursorElevation' ).innerHTML = '&nbsp;';

} // showElevation()


/*
removeLastMarker()
Function to remove the most recently placed or opened Google Map marker; relies
on global variable to store GMarker object.
*/

function removeLastMarker () {

  lastInfoWindow.close();
  google.maps.event.clearInstanceListeners( lastMarker );
  lastMarker.setMap( null );

} // removeLastMarker()


/*
addBotanyLogo()
Adds UH Botany logo as a Google Maps Custom Control object.
*/

function addBotanyLogo () {

  // Create a div to hold the logo:

  var logo_div = document.createElement( 'div' );
  logo_div.style.padding = '5px';

  // Create the logo image:

  var logo_img = document.createElement( 'img' );
  logo_img.src = '/images/logos/logo_botany_small_transparent.png';
  logo_img.style.cursor = 'pointer';

  // Make a link for the image:

  var logo_link = document.createElement( 'a' );
  logo_link.href = 'http://www.botany.hawaii.edu';
  logo_link.target = '_blank';

  // Append the image to the link:

  logo_link.appendChild( logo_img );

  // Append the link to the div:

  logo_div.appendChild( logo_link );

  // Un-focus the logo after clicking:

  google.maps.event.addDomListener( logo_link, 'click',
    function () {
      this.blur();
    }
  );

  // Add the logo to the map:

  logo_div.index = 0; // used for ordering
  map.controls[ google.maps.ControlPosition.LEFT_BOTTOM ].push( logo_div );

} // addBotanyLogo()


/*
dd2dms()
Converts decimal degrees to degrees minutes seconds (DMS) format.
*/

function dd2dms ( degrees ) {

  var minutes = ( Math.abs( degrees ) - Math.floor( Math.abs( degrees ) ) ) * 60;
  var seconds = ( ( minutes - Math.floor( minutes ) ) * 60 ).toFixed( 2 );
  var minutes = parseInt( minutes );
  var degrees = parseInt( degrees );

  return { deg: degrees, min: minutes, sec: seconds };

} // dd2dms()


/*
dms2dms()
Converts degrees minutes seconds (DMS) format to decimal degrees.
Also converts degrees decimal minutes format to decimal degrees.
*/

function dms2dd ( deg, min, sec ) {

  if ( sec == null ) {
    sec = 0;
  }

  deg = parseInt( deg );

  var decimal = ( min / 60 ) + ( sec / ( 60 * 60 ) );

  var dd;

  if ( deg >= 0 ) {
    dd = deg + decimal;
  }
  else {
    dd = deg - decimal;
  }

  return dd;

} // dms2dd()


/*
zoomTo()
Zooms to specified lat/lon location. Computes maximum available zoom level
for Google Map satellite imagery and then zooms halfway between the current
zoom level and the max level.
*/

function zoomTo ( lat, lon ) {

  if ( typeof( lat ) == 'undefined'
    || typeof( lon ) == 'undefined' ) {
    return;
  }

  map.panTo( new google.maps.LatLng( lat, lon ) );

  // Initialize Google Map MaxZoomService, if not done already:

  if ( !maxZoomService ) {
    maxZoomService = new google.maps.MaxZoomService();
  }

  // Get max zoom for the specified location:

  var location = new google.maps.LatLng( lat, lon );

  maxZoomService.getMaxZoomAtLatLng( location,
    function ( response ) {
      var maxZoom = response.zoom;
      var status  = response.status;
      if ( status == google.maps.MaxZoomStatus.OK ) {
        var currentZoom = map.getZoom();
        var newZoom = Math.ceil( ( maxZoom - currentZoom ) / 2.0 ) + currentZoom;
        map.setZoom( newZoom );
      }
    }
  );

} // zoomTo()


/*
createElevationRequest()
Creates gmap V3 LocationElevationRequest object, to be passed elsewhere
to gmap elevationService.
*/

function createElevationRequest( point ) {

  // Convert gmap v2 latlng object to gmap v3 latlng object:

  var point_v3 = new google.maps.LatLng( point.lat(), point.lng() );

  // Create a LocationElevationRequest object using an array of one value:

  var points = new Array();
  points.push( point_v3 );
  var positionalRequest = {
    'locations': points
  }

  return positionalRequest;

} // createElevationRequest()


/*
getElevationString()
Converts elevation in meters to specified units and returns a string
representation with an appropriate number of decimal points and a
label with the unit. Units must be one of the following:
ft (feet), fathoms, km (kilometers), m (meters), mi (miles), or yd (yards).
*/

function getElevationString ( elevationMeters, units, numDecimals ) {

  var elevation;

  if ( !numDecimals ) {
    numDecimals = 0;
  }

  //if ( units == 'ft' ) {
  //  elevation = meters2feet( elevationMeters );
  //}

  elevation = elevationMeters;

  elevationFt = elevationMeters * 3.28084;

  // Set number of decimal places:

  //var elevationString = elevation.toString();
  var elevationString = elevation.toFixed( numDecimals );
  if ( elevationString == '-0' ) {
    elevationString = '0';
  }

  //elevationFt = elevationFt.toString();
  elevationFt = elevationFt.toFixed( numDecimals );
  if ( elevationFt == '-0' ) {
    elevationFt = '0';
  }

  // Add comma if needed (e.g. 1000 becomes 1,000):

  if ( elevationString.match( /^(-)?(\d{1,3})(\d{3})$/ ) ) {
    elevationString = RegExp.$1 + RegExp.$2 + ',' + RegExp.$3;
  }

  elevationString += ' ' + units;

  if ( elevationFt.match( /^(-)?(\d{1,3})(\d{3})$/ ) ) {
    elevationFt = RegExp.$1 + RegExp.$2 + ',' + RegExp.$3;
  }

  elevationString += ' (' + elevationFt + ' ft)';

  return elevationString;

} // getElevationString()


/*
jumpTo()
Zooms to the appropriate map bounds, center, and zoom based on the specified
location name.
*/

function jumpTo ( location ) {

  var center;
  var zoomLevel;
  var sw;
  var ne;
  var bounds;

  // Re-set "zoom" select list to default afterwards:

  setTimeout(
    function () {
      document.getElementById( 'zoom' ).selectedIndex = 0;
    },
    750
  ); 

  // Set home location (Hawaii MHI):

  home_center = new google.maps.LatLng( 20.5453, -157.4780 );
  home_sw     = new google.maps.LatLng( 18.5941, -160.4498 );
  home_ne     = new google.maps.LatLng( 22.4364, -154.5996 );

  // Home location:

  if ( location == "home" ) {
    center = home_center;
    sw     = home_sw;
    ne     = home_ne;
  }

  // Each of the main Hawaiian islands:

  else if ( location == "Hawai'i (Big Island)" ) {
    center = new google.maps.LatLng( 19.5895, -155.5128 );
    sw     = new google.maps.LatLng( 18.9023, -156.6842 );
    ne     = new google.maps.LatLng( 20.2737, -154.3428 );
  }
  else if ( location == "Kaho'olawe" ) {
    center = new google.maps.LatLng( 20.5476, -156.6066 );
    sw     = new google.maps.LatLng( 20.4850, -156.7103 );
    ne     = new google.maps.LatLng( 20.6226, -156.5220 );
  }
  else if ( location == "Ka'ula" ) {
    center = new google.maps.LatLng( 21.6549, -160.5408 );
    sw     = new google.maps.LatLng( 21.6484, -160.5480 );
    ne     = new google.maps.LatLng( 21.6614, -160.5336 );
  }
  else if ( location == "Kaua'i" ) {
    center = new google.maps.LatLng( 22.0506, -159.4960 );
    sw     = new google.maps.LatLng( 21.7862, -159.8497 );
    ne     = new google.maps.LatLng( 22.3310, -159.1905 );
  }
  else if ( location == "Lana'i" ) {
    center = new google.maps.LatLng( 20.8312, -156.9348 );
    sw     = new google.maps.LatLng( 20.6970, -157.1020 );
    ne     = new google.maps.LatLng( 20.9716, -156.7724 );
  }
  else if ( location == "Maui" ) {
    center = new google.maps.LatLng( 20.7920, -156.3327 );
    sw     = new google.maps.LatLng( 20.5241, -156.7172 );
    ne     = new google.maps.LatLng( 21.0736, -155.9193 );
  }
  else if ( location == "Maui County" ) {
    sw = new google.maps.LatLng( 20.4, -157.4 );
    ne = new google.maps.LatLng( 21.3, -155.9 );
  }
  else if ( location == "Moloka'i" ) {
    center = new google.maps.LatLng( 21.1280, -157.0159 );
    sw     = new google.maps.LatLng( 20.9934, -157.3743 );
    ne     = new google.maps.LatLng( 21.2573, -156.665 );
  }
  else if ( location == "Ni'ihau" ) {
    center = new google.maps.LatLng( 21.8965, -160.1408 );
    sw     = new google.maps.LatLng( 21.7652, -160.2726 );
    ne     = new google.maps.LatLng( 22.0219, -160.0254 );
  }
  else if ( location == "O'ahu" ) {
    center = new google.maps.LatLng( 21.4524, -157.9648 );
    sw     = new google.maps.LatLng( 21.1914, -158.3164 );
    ne     = new google.maps.LatLng( 21.7505, -157.6023 );
  }

  // Reserve bounds:

  else if ( location == "AHIHI-KINAU NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 20.584085, -156.450466 );
    ne     = new google.maps.LatLng( 20.628116, -156.407193 );
  }
  else if ( location == "AHUKINI STATE RECREATION PIER" ) {
    sw     = new google.maps.LatLng( 21.991952, -159.332639 );
    ne     = new google.maps.LatLng( 21.99335, -159.331214 );
  }
  else if ( location == "AHUPUAA O KAHANA STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.493232, -157.923603 );
    ne     = new google.maps.LatLng( 21.574312, -157.853766 );
  }
  else if ( location == "AHUPUAA O KAHANA STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.540345, -157.880435 );
    ne     = new google.maps.LatLng( 21.542226, -157.878444 );
  }
  else if ( location == "AHUPUAA O KAHANA STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.54567, -157.885357 );
    ne     = new google.maps.LatLng( 21.548616, -157.882888 );
  }
  else if ( location == "AHUPUAA O KAHANA STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.555019, -157.877777 );
    ne     = new google.maps.LatLng( 21.556753, -157.876946 );
  }
  else if ( location == "AIEA BAY STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.373418, -157.934005 );
    ne     = new google.maps.LatLng( 21.374586, -157.932777 );
  }
  else if ( location == "AIEA BAY STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.374423, -157.933477 );
    ne     = new google.maps.LatLng( 21.375406, -157.932778 );
  }
  else if ( location == "AIEA BAY STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.37649, -157.937855 );
    ne     = new google.maps.LatLng( 21.379186, -157.93479 );
  }
  else if ( location == "AKAKA FALLS STATE PARK" ) {
    sw     = new google.maps.LatLng( 19.850506, -155.161463 );
    ne     = new google.maps.LatLng( 19.858824, -155.148626 );
  }
  else if ( location == "ALAU ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.727623, -155.97865 );
    ne     = new google.maps.LatLng( 20.729306, -155.975851 );
  }
  else if ( location == "DIAMOND HEAD STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.254027, -157.819183 );
    ne     = new google.maps.LatLng( 21.271272, -157.794547 );
  }
  else if ( location == "DIAMOND HEAD STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.269516, -157.805343 );
    ne     = new google.maps.LatLng( 21.270231, -157.803272 );
  }
  else if ( location == "EWA FOREST RESERVE (POAMOHO SEC.)" ) {
    sw     = new google.maps.LatLng( 21.502724, -158.009242 );
    ne     = new google.maps.LatLng( 21.53692, -157.895884 );
  }
  else if ( location == "EWA FOREST RESERVE (WAIMANO SEC.)" ) {
    sw     = new google.maps.LatLng( 21.421995, -157.958052 );
    ne     = new google.maps.LatLng( 21.460384, -157.863867 );
  }
  else if ( location == "FREEMAN SEABIRD PRESERVE" ) {
    sw     = new google.maps.LatLng( 21.25501, -157.79214 );
    ne     = new google.maps.LatLng( 21.256363, -157.791161 );
  }
  else if ( location == "HAENA STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.210212, -159.598007 );
    ne     = new google.maps.LatLng( 22.221909, -159.573907 );
  }
  else if ( location == "HAENA STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.219722, -159.584579 );
    ne     = new google.maps.LatLng( 22.224231, -159.574849 );
  }
  else if ( location == "HAKALAU FOREST NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 19.852967, -155.350724 );
    ne     = new google.maps.LatLng( 19.929567, -155.212783 );
  }
  else if ( location == "HAKALAU FOREST NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 19.755213, -155.358445 );
    ne     = new google.maps.LatLng( 19.888569, -155.209319 );
  }
  else if ( location == "HAKALAU FOREST NATIONAL WILDLIFE REFUGE S.KONA SEC" ) {
    sw     = new google.maps.LatLng( 19.359134, -155.868268 );
    ne     = new google.maps.LatLng( 19.399483, -155.771529 );
  }
  else if ( location == "HALEAKALA NATIONAL PARK" ) {
    sw     = new google.maps.LatLng( 20.630466, -156.283777 );
    ne     = new google.maps.LatLng( 20.788225, -156.013346 );
  }
  else if ( location == "HALEKII-PIHANA HEIAUS STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 20.901811, -156.493935 );
    ne     = new google.maps.LatLng( 20.906616, -156.490083 );
  }
  else if ( location == "HALELEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.056758, -159.525492 );
    ne     = new google.maps.LatLng( 22.219212, -159.424757 );
  }
  else if ( location == "HALELEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.181484, -159.465881 );
    ne     = new google.maps.LatLng( 22.183042, -159.464853 );
  }
  else if ( location == "HAMAKUA F.R. (KALOPA SEC.)/KALOPA STATE REC. AREA" ) {
    sw     = new google.maps.LatLng( 20.035204, -155.441965 );
    ne     = new google.maps.LatLng( 20.041093, -155.433929 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (AHUALOA SEC.)" ) {
    sw     = new google.maps.LatLng( 20.036411, -155.475263 );
    ne     = new google.maps.LatLng( 20.060042, -155.461241 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (HANAPAI SEC.)" ) {
    sw     = new google.maps.LatLng( 20.072903, -155.56308 );
    ne     = new google.maps.LatLng( 20.084905, -155.550211 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (HOEA KAAO SEC.)" ) {
    sw     = new google.maps.LatLng( 19.979715, -155.34862 );
    ne     = new google.maps.LatLng( 20.000601, -155.326193 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (HONOKAIA SEC.)" ) {
    sw     = new google.maps.LatLng( 20.063363, -155.529327 );
    ne     = new google.maps.LatLng( 20.081423, -155.507029 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (HONOKAIA SEC.)" ) {
    sw     = new google.maps.LatLng( 20.063177, -155.52189 );
    ne     = new google.maps.LatLng( 20.067073, -155.511848 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (KAINEHE SEC.)" ) {
    sw     = new google.maps.LatLng( 19.994515, -155.36057 );
    ne     = new google.maps.LatLng( 20.000441, -155.354983 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (KALOPA SEC.)" ) {
    sw     = new google.maps.LatLng( 20.022946, -155.45656 );
    ne     = new google.maps.LatLng( 20.040155, -155.429994 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (KALOPA SEC.)/KALOPA GMA" ) {
    sw     = new google.maps.LatLng( 20.035611, -155.448434 );
    ne     = new google.maps.LatLng( 20.043212, -155.438242 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (KEAA SEC.)" ) {
    sw     = new google.maps.LatLng( 20.068997, -155.572047 );
    ne     = new google.maps.LatLng( 20.097779, -155.559546 );
  }
  else if ( location == "HAMAKUA FOREST RESERVE (PAAUILO SEC.)" ) {
    sw     = new google.maps.LatLng( 19.981994, -155.406698 );
    ne     = new google.maps.LatLng( 20.014009, -155.362732 );
  }
  else if ( location == "HAMAKUA MARSH WILDLIFE SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 21.385782, -157.746316 );
    ne     = new google.maps.LatLng( 21.393786, -157.737685 );
  }
  else if ( location == "HANA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.668927, -156.118641 );
    ne     = new google.maps.LatLng( 20.796817, -156.001217 );
  }
  else if ( location == "HANALEI NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 22.184825, -159.488831 );
    ne     = new google.maps.LatLng( 22.215939, -159.455503 );
  }
  else if ( location == "HANALEI NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 22.201342, -159.474704 );
    ne     = new google.maps.LatLng( 22.20367, -159.473187 );
  }
  else if ( location == "HANAPEPE SALT PONDS HISTORIC PRESERVE" ) {
    sw     = new google.maps.LatLng( 21.898464, -159.605083 );
    ne     = new google.maps.LatLng( 21.900753, -159.604061 );
  }
  else if ( location == "HANAPEPE SALT PONDS HISTORIC PRESERVE" ) {
    sw     = new google.maps.LatLng( 21.898, -159.60731 );
    ne     = new google.maps.LatLng( 21.901059, -159.604741 );
  }
  else if ( location == "HANAUMA BAY STATE UNDERWATER PARK" ) {
    sw     = new google.maps.LatLng( 21.262461, -157.698285 );
    ne     = new google.maps.LatLng( 21.2739, -157.688399 );
  }
  else if ( location == "HANAWI NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 20.728604, -156.153291 );
    ne     = new google.maps.LatLng( 20.808539, -156.077425 );
  }
  else if ( location == "HAPUNA BEACH STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 19.987751, -155.828849 );
    ne     = new google.maps.LatLng( 19.993689, -155.816475 );
  }
  else if ( location == "HAPUNA BEACH STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 19.980588, -155.828886 );
    ne     = new google.maps.LatLng( 19.982032, -155.827558 );
  }
  else if ( location == "HAUOLA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.051155, -155.369608 );
    ne     = new google.maps.LatLng( 20.057999, -155.359513 );
  }
  else if ( location == "HAUULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.547503, -157.933846 );
    ne     = new google.maps.LatLng( 21.620808, -157.905777 );
  }
  else if ( location == "HAUULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.603446, -157.918743 );
    ne     = new google.maps.LatLng( 21.604625, -157.917889 );
  }
  else if ( location == "HAWAII VOLCANOES NATIONAL PARK" ) {
    sw     = new google.maps.LatLng( 18.997059, -155.89612 );
    ne     = new google.maps.LatLng( 19.608769, -154.918539 );
  }
  else if ( location == "HAWAII VOLCANOES NATIONAL PARK" ) {
    sw     = new google.maps.LatLng( 19.437349, -155.28427 );
    ne     = new google.maps.LatLng( 19.543698, -155.188804 );
  }
  else if ( location == "HEEIA STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.437699, -157.812209 );
    ne     = new google.maps.LatLng( 21.44357, -157.806686 );
  }
  else if ( location == "HILO FOREST RESERVE (HUMUULA SEC.)" ) {
    sw     = new google.maps.LatLng( 19.90003, -155.348162 );
    ne     = new google.maps.LatLng( 19.987682, -155.27724 );
  }
  else if ( location == "HILO FOREST RESERVE (KAIWIKI SEC.)" ) {
    sw     = new google.maps.LatLng( 19.811032, -155.270653 );
    ne     = new google.maps.LatLng( 19.869285, -155.138017 );
  }
  else if ( location == "HILO FOREST RESERVE (KAMAEE SEC.)" ) {
    sw     = new google.maps.LatLng( 19.852587, -155.211479 );
    ne     = new google.maps.LatLng( 19.89132, -155.167753 );
  }
  else if ( location == "HILO FOREST RESERVE (KAUKU SEC.)" ) {
    sw     = new google.maps.LatLng( 19.819025, -155.162117 );
    ne     = new google.maps.LatLng( 19.826367, -155.151958 );
  }
  else if ( location == "HILO FOREST RESERVE (KUKUAU SEC.)" ) {
    sw     = new google.maps.LatLng( 19.667724, -155.182224 );
    ne     = new google.maps.LatLng( 19.671961, -155.1785 );
  }
  else if ( location == "HILO FOREST RESERVE (KUKUAU SEC.)" ) {
    sw     = new google.maps.LatLng( 19.6631, -155.263536 );
    ne     = new google.maps.LatLng( 19.69089, -155.171294 );
  }
  else if ( location == "HILO FOREST RESERVE (LAUPAHOEHOE SEC.)" ) {
    sw     = new google.maps.LatLng( 19.867059, -155.349703 );
    ne     = new google.maps.LatLng( 19.97401, -155.265694 );
  }
  else if ( location == "HILO FOREST RESERVE (OPEA SEC.)" ) {
    sw     = new google.maps.LatLng( 19.87533, -155.214891 );
    ne     = new google.maps.LatLng( 19.900195, -155.175836 );
  }
  else if ( location == "HILO FOREST RESERVE (PIHA SEC.)" ) {
    sw     = new google.maps.LatLng( 19.840263, -155.352198 );
    ne     = new google.maps.LatLng( 19.926711, -155.177419 );
  }
  else if ( location == "HILO FOREST RESERVE (WATERSHED RESERVE SEC.)" ) {
    sw     = new google.maps.LatLng( 19.652262, -155.382465 );
    ne     = new google.maps.LatLng( 19.788702, -155.126395 );
  }
  else if ( location == "HONO O NA PALI NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 22.13884, -159.63121 );
    ne     = new google.maps.LatLng( 22.210818, -159.581274 );
  }
  else if ( location == "HONOLUA-MOKULEIA MARINE LIFE CONSERVATION DISTRICT" ) {
    sw     = new google.maps.LatLng( 21.010823, -156.645788 );
    ne     = new google.maps.LatLng( 21.01426, -156.640498 );
  }
  else if ( location == "HONOLUA-MOKULEIA MARINE LIFE CONSERVATION DISTRICT" ) {
    sw     = new google.maps.LatLng( 21.012502, -156.641993 );
    ne     = new google.maps.LatLng( 21.017482, -156.63726 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.33783, -157.897644 );
    ne     = new google.maps.LatLng( 21.408459, -157.815518 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.370485, -157.870055 );
    ne     = new google.maps.LatLng( 21.370672, -157.869831 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.364745, -157.880578 );
    ne     = new google.maps.LatLng( 21.366024, -157.879263 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.289246, -157.854747 );
    ne     = new google.maps.LatLng( 21.383314, -157.752685 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.346816, -157.819851 );
    ne     = new google.maps.LatLng( 21.351386, -157.814515 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.365316, -157.841877 );
    ne     = new google.maps.LatLng( 21.369149, -157.83249 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.365393, -157.836011 );
    ne     = new google.maps.LatLng( 21.366337, -157.835465 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.356423, -157.85913 );
    ne     = new google.maps.LatLng( 21.358904, -157.857424 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.337405, -157.839244 );
    ne     = new google.maps.LatLng( 21.346152, -157.831233 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.30458, -157.839415 );
    ne     = new google.maps.LatLng( 21.344566, -157.796206 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.330718, -157.814143 );
    ne     = new google.maps.LatLng( 21.332049, -157.812847 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.323765, -157.818939 );
    ne     = new google.maps.LatLng( 21.331462, -157.812104 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.324953, -157.831147 );
    ne     = new google.maps.LatLng( 21.331298, -157.823655 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.324144, -157.816209 );
    ne     = new google.maps.LatLng( 21.329357, -157.811464 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.327192, -157.824319 );
    ne     = new google.maps.LatLng( 21.328681, -157.823175 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.32406, -157.831807 );
    ne     = new google.maps.LatLng( 21.32588, -157.830025 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.315449, -157.817132 );
    ne     = new google.maps.LatLng( 21.317316, -157.81592 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.328801, -157.821459 );
    ne     = new google.maps.LatLng( 21.332826, -157.818389 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.328165, -157.800002 );
    ne     = new google.maps.LatLng( 21.330586, -157.795916 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.324859, -157.799854 );
    ne     = new google.maps.LatLng( 21.329158, -157.795101 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.292311, -157.765365 );
    ne     = new google.maps.LatLng( 21.33185, -157.739073 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.324983, -157.811129 );
    ne     = new google.maps.LatLng( 21.326404, -157.809485 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.307001, -157.731977 );
    ne     = new google.maps.LatLng( 21.325879, -157.725426 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.32017, -157.799861 );
    ne     = new google.maps.LatLng( 21.324504, -157.794527 );
  }
  else if ( location == "HONOLULU WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.297904, -157.787815 );
    ne     = new google.maps.LatLng( 21.303647, -157.780344 );
  }
  else if ( location == "HONOULIULI PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.39192, -158.10807 );
    ne     = new google.maps.LatLng( 21.480346, -158.069559 );
  }
  else if ( location == "HONUAULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.702295, -155.977012 );
    ne     = new google.maps.LatLng( 19.736991, -155.942869 );
  }
  else if ( location == "HONUAULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.641114, -155.967815 );
    ne     = new google.maps.LatLng( 19.711955, -155.859621 );
  }
  else if ( location == "HUELO ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.170332, -156.921677 );
    ne     = new google.maps.LatLng( 21.171334, -156.920629 );
  }
  else if ( location == "HULEIA NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.942112, -159.400841 );
    ne     = new google.maps.LatLng( 21.952792, -159.365821 );
  }
  else if ( location == "HULEIA NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.946045, -159.391541 );
    ne     = new google.maps.LatLng( 21.94683, -159.390142 );
  }
  else if ( location == "HULEIA NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.944597, -159.394626 );
    ne     = new google.maps.LatLng( 21.94523, -159.393778 );
  }
  else if ( location == "HULEIA NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.943514, -159.393693 );
    ne     = new google.maps.LatLng( 21.945563, -159.392556 );
  }
  else if ( location == "HULEIA NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.943191, -159.396816 );
    ne     = new google.maps.LatLng( 21.944544, -159.394432 );
  }
  else if ( location == "HULU ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.957449, -156.517571 );
    ne     = new google.maps.LatLng( 20.958658, -156.516566 );
  }
  else if ( location == "IAO VALLEY STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 20.879131, -156.54758 );
    ne     = new google.maps.LatLng( 20.881717, -156.5436 );
  }
  else if ( location == "IOLANI PALACE STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.305139, -157.860499 );
    ne     = new google.maps.LatLng( 21.308334, -157.856999 );
  }
  else if ( location == "JAMES CAMPBELL NAT WILDLIFE REFUGE (PUNAMANO)" ) {
    sw     = new google.maps.LatLng( 21.694166, -157.974732 );
    ne     = new google.maps.LatLng( 21.700085, -157.968824 );
  }
  else if ( location == "JAMES CAMPBELL NATIONAL WILDLIFE REFUGE (KII)" ) {
    sw     = new google.maps.LatLng( 21.682119, -157.957714 );
    ne     = new google.maps.LatLng( 21.691867, -157.947767 );
  }
  else if ( location == "KA IWI SCENIC SHORELINE" ) {
    sw     = new google.maps.LatLng( 21.288856, -157.664284 );
    ne     = new google.maps.LatLng( 21.311802, -157.646968 );
  }
  else if ( location == "KAALA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 21.500009, -158.153439 );
    ne     = new google.maps.LatLng( 21.529752, -158.108043 );
  }
  else if ( location == "KAENA POINT NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 21.571114, -158.282821 );
    ne     = new google.maps.LatLng( 21.577735, -158.264201 );
  }
  else if ( location == "KAENA POINT NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 21.573766, -158.276503 );
    ne     = new google.maps.LatLng( 21.57401, -158.276115 );
  }
  else if ( location == "KAENA POINT STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.518161, -158.229788 );
    ne     = new google.maps.LatLng( 21.527616, -158.22716 );
  }
  else if ( location == "KAENA POINT STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.526619, -158.229173 );
    ne     = new google.maps.LatLng( 21.530135, -158.227584 );
  }
  else if ( location == "KAENA POINT STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.529347, -158.2299 );
    ne     = new google.maps.LatLng( 21.534862, -158.228277 );
  }
  else if ( location == "KAENA POINT STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.528914, -158.282426 );
    ne     = new google.maps.LatLng( 21.58039, -158.219686 );
  }
  else if ( location == "KAENA POINT STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.570667, -158.216537 );
    ne     = new google.maps.LatLng( 21.577854, -158.208134 );
  }
  else if ( location == "KAENA POINT STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.573935, -158.272764 );
    ne     = new google.maps.LatLng( 21.581441, -158.206886 );
  }
  else if ( location == "KAHAKULOA GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.988741, -156.555583 );
    ne     = new google.maps.LatLng( 20.998138, -156.550135 );
  }
  else if ( location == "KAHAKULOA GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.990761, -156.587922 );
    ne     = new google.maps.LatLng( 21.022316, -156.549084 );
  }
  else if ( location == "KAHAUALEA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.357722, -155.258005 );
    ne     = new google.maps.LatLng( 19.455878, -155.008658 );
  }
  else if ( location == "KAHIKINUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.657256, -156.244813 );
    ne     = new google.maps.LatLng( 20.70504, -156.189709 );
  }
  else if ( location == "KAHIKINUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.667213, -156.328844 );
    ne     = new google.maps.LatLng( 20.70965, -156.259854 );
  }
  else if ( location == "KAHUKU MOTOCROSS" ) {
    sw     = new google.maps.LatLng( 21.661631, -158.036564 );
    ne     = new google.maps.LatLng( 21.692064, -158.005632 );
  }
  else if ( location == "KAIPAPAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.559424, -157.944928 );
    ne     = new google.maps.LatLng( 21.603111, -157.924414 );
  }
  else if ( location == "KAKAAKO WATERFRONT PARK" ) {
    sw     = new google.maps.LatLng( 21.289485, -157.867519 );
    ne     = new google.maps.LatLng( 21.297244, -157.859905 );
  }
  else if ( location == "KAKAHAIA NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.061621, -156.945611 );
    ne     = new google.maps.LatLng( 21.066832, -156.937849 );
  }
  else if ( location == "KALAUPAPA NATIONAL HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 21.115128, -157.06597 );
    ne     = new google.maps.LatLng( 21.226502, -156.894772 );
  }
  else if ( location == "KALAUPAPA NATIONAL HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 21.154949, -156.968969 );
    ne     = new google.maps.LatLng( 21.162326, -156.955298 );
  }
  else if ( location == "KALEPA MOUNTAIN FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.00631, -159.36052 );
    ne     = new google.maps.LatLng( 22.046392, -159.342298 );
  }
  else if ( location == "KALOKO-HONOKOHAU NATIONAL HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 19.66196, -156.049195 );
    ne     = new google.maps.LatLng( 19.697033, -156.013012 );
  }
  else if ( location == "KAMAKOU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.098611, -156.956411 );
    ne     = new google.maps.LatLng( 21.133435, -156.877925 );
  }
  else if ( location == "KAMEHAME PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 19.143292, -155.466812 );
    ne     = new google.maps.LatLng( 19.147932, -155.455365 );
  }
  else if ( location == "KAMILOLOA PLANT SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.095615, -156.974 );
    ne     = new google.maps.LatLng( 21.099993, -156.970235 );
  }
  else if ( location == "KANAELE PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.97099, -159.509328 );
    ne     = new google.maps.LatLng( 21.977194, -159.501364 );
  }
  else if ( location == "KANAHA POND WILDLIFE SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.88747, -156.460538 );
    ne     = new google.maps.LatLng( 20.895945, -156.447966 );
  }
  else if ( location == "KANAHA ROCK SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.130441, -156.705695 );
    ne     = new google.maps.LatLng( 21.13145, -156.704854 );
  }
  else if ( location == "KANAIO NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 20.598065, -156.356651 );
    ne     = new google.maps.LatLng( 20.634088, -156.335167 );
  }
  else if ( location == "KANEOHE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.396724, -157.821908 );
    ne     = new google.maps.LatLng( 21.40713, -157.814003 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.871368, -156.998385 );
    ne     = new google.maps.LatLng( 20.883935, -156.969786 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.869424, -156.969616 );
    ne     = new google.maps.LatLng( 20.881256, -156.961536 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.871976, -156.93213 );
    ne     = new google.maps.LatLng( 20.877035, -156.927295 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.870224, -156.944071 );
    ne     = new google.maps.LatLng( 20.873969, -156.940666 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.867906, -156.940706 );
    ne     = new google.maps.LatLng( 20.870842, -156.936744 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.865619, -156.953445 );
    ne     = new google.maps.LatLng( 20.869221, -156.94751 );
  }
  else if ( location == "KANEPUU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.862434, -156.943412 );
    ne     = new google.maps.LatLng( 20.867374, -156.937025 );
  }
  else if ( location == "KAOHE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 19.764695, -155.641351 );
    ne     = new google.maps.LatLng( 19.841712, -155.556277 );
  }
  else if ( location == "KAOHE MITIGATION" ) {
    sw     = new google.maps.LatLng( 19.810875, -155.635001 );
    ne     = new google.maps.LatLng( 19.847444, -155.595558 );
  }
  else if ( location == "KAOHIKAIPU ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.318836, -157.658018 );
    ne     = new google.maps.LatLng( 21.321684, -157.654637 );
  }
  else if ( location == "KAPAPALA COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 19.247536, -155.500734 );
    ne     = new google.maps.LatLng( 19.472087, -155.299778 );
  }
  else if ( location == "KAPAPALA COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 19.411356, -155.346917 );
    ne     = new google.maps.LatLng( 19.418718, -155.339095 );
  }
  else if ( location == "KAPAPALA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.320376, -155.604484 );
    ne     = new google.maps.LatLng( 19.475998, -155.347088 );
  }
  else if ( location == "KAPUNA SPRING WATER RESERVE" ) {
    sw     = new google.maps.LatLng( 21.145308, -156.9801 );
    ne     = new google.maps.LatLng( 21.147337, -156.978334 );
  }
  else if ( location == "KAPUNAKEA PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.889791, -156.644466 );
    ne     = new google.maps.LatLng( 20.939973, -156.582246 );
  }
  else if ( location == "KAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.036989, -155.713486 );
    ne     = new google.maps.LatLng( 19.392742, -155.423569 );
  }
  else if ( location == "KAU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 19.093384, -155.624457 );
    ne     = new google.maps.LatLng( 19.109093, -155.611445 );
  }
  else if ( location == "KAU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 19.103531, -155.614314 );
    ne     = new google.maps.LatLng( 19.122059, -155.593263 );
  }
  else if ( location == "KAU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 19.146331, -155.615675 );
    ne     = new google.maps.LatLng( 19.201467, -155.560789 );
  }
  else if ( location == "KAU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 19.244758, -155.545461 );
    ne     = new google.maps.LatLng( 19.296875, -155.494375 );
  }
  else if ( location == "KAULA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.651915, -160.54444 );
    ne     = new google.maps.LatLng( 21.660991, -160.537096 );
  }
  else if ( location == "KAUMAHINA STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 20.869369, -156.17121 );
    ne     = new google.maps.LatLng( 20.872011, -156.167985 );
  }
  else if ( location == "KAWAINUI MARSH WILDLIFE SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 21.378719, -157.769111 );
    ne     = new google.maps.LatLng( 21.410024, -157.742784 );
  }
  else if ( location == "KAWAINUI MARSH WILDLIFE SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 21.393292, -157.746471 );
    ne     = new google.maps.LatLng( 21.393701, -157.745919 );
  }
  else if ( location == "KEAIWA HEIAU STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.389522, -157.909963 );
    ne     = new google.maps.LatLng( 21.407569, -157.879025 );
  }
  else if ( location == "KEALAKEKUA BAY STATE HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 19.472888, -155.941993 );
    ne     = new google.maps.LatLng( 19.489182, -155.913236 );
  }
  else if ( location == "KEALIA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.126289, -159.435623 );
    ne     = new google.maps.LatLng( 22.170783, -159.308961 );
  }
  else if ( location == "KEALIA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.074549, -159.425257 );
    ne     = new google.maps.LatLng( 22.127868, -159.345058 );
  }
  else if ( location == "KEALIA POND NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 20.796562, -156.501643 );
    ne     = new google.maps.LatLng( 20.798836, -156.497843 );
  }
  else if ( location == "KEALIA POND NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 20.79427, -156.499716 );
    ne     = new google.maps.LatLng( 20.800556, -156.48287 );
  }
  else if ( location == "KEALIA POND NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 20.784624, -156.496704 );
    ne     = new google.maps.LatLng( 20.805349, -156.461666 );
  }
  else if ( location == "KEAOI  ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 19.267308, -155.254638 );
    ne     = new google.maps.LatLng( 19.268166, -155.253572 );
  }
  else if ( location == "KEAUOHANA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.405328, -154.958317 );
    ne     = new google.maps.LatLng( 19.429449, -154.94381 );
  }
  else if ( location == "KEE HULA PLATFORM" ) {
    sw     = new google.maps.LatLng( 22.219278, -159.585383 );
    ne     = new google.maps.LatLng( 22.220201, -159.584761 );
  }
  else if ( location == "KEKAHA GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 21.980842, -159.770015 );
    ne     = new google.maps.LatLng( 22.103583, -159.660297 );
  }
  else if ( location == "KEKAHA KAI STATE PARK" ) {
    sw     = new google.maps.LatLng( 19.778954, -156.029065 );
    ne     = new google.maps.LatLng( 19.819606, -155.997019 );
  }
  else if ( location == "KEKAHA KAI STATE PARK" ) {
    sw     = new google.maps.LatLng( 19.764113, -156.047628 );
    ne     = new google.maps.LatLng( 19.793106, -156.013253 );
  }
  else if ( location == "KEKEPA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.461647, -157.775854 );
    ne     = new google.maps.LatLng( 21.462234, -157.774943 );
  }
  else if ( location == "KEOLONAHIHI STATE HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 19.599186, -155.976878 );
    ne     = new google.maps.LatLng( 19.604258, -155.974029 );
  }
  else if ( location == "KEOLONAHIHI STATE HISTORICAL PARK-KEAKEALANIWAHINE" ) {
    sw     = new google.maps.LatLng( 19.601358, -155.97471 );
    ne     = new google.maps.LatLng( 19.604671, -155.970199 );
  }
  else if ( location == "KEOPUKA ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.874775, -156.172907 );
    ne     = new google.maps.LatLng( 20.876833, -156.171634 );
  }
  else if ( location == "KEWALO BASIN PARK" ) {
    sw     = new google.maps.LatLng( 21.290547, -157.859936 );
    ne     = new google.maps.LatLng( 21.292285, -157.855318 );
  }
  else if ( location == "KIHEWAMOKU ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.672314, -157.924643 );
    ne     = new google.maps.LatLng( 21.672735, -157.923287 );
  }
  else if ( location == "KILAUEA POINT NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 22.216551, -159.407565 );
    ne     = new google.maps.LatLng( 22.23424, -159.379093 );
  }
  else if ( location == "KIPAHOEHOE NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.226721, -155.914419 );
    ne     = new google.maps.LatLng( 19.262954, -155.780805 );
  }
  else if ( location == "KIPAHULU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.654954, -156.140728 );
    ne     = new google.maps.LatLng( 20.695199, -156.09464 );
  }
  else if ( location == "KIPAHULU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.663386, -156.094014 );
    ne     = new google.maps.LatLng( 20.687712, -156.074162 );
  }
  else if ( location == "KIPAHULU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.666502, -156.075175 );
    ne     = new google.maps.LatLng( 20.677553, -156.063252 );
  }
  else if ( location == "KIPUKA AINAHOU NENE SANCTUARY" ) {
    sw     = new google.maps.LatLng( 19.516099, -155.497435 );
    ne     = new google.maps.LatLng( 19.707106, -155.336791 );
  }
  else if ( location == "KOAIA TREE SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.047538, -155.738581 );
    ne     = new google.maps.LatLng( 20.051995, -155.735614 );
  }
  else if ( location == "KOHALA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.093787, -155.727152 );
    ne     = new google.maps.LatLng( 20.19671, -155.655499 );
  }
  else if ( location == "KOHALA FOREST RESERVE (POLOLU SEC.)" ) {
    sw     = new google.maps.LatLng( 20.140621, -155.749905 );
    ne     = new google.maps.LatLng( 20.212788, -155.725748 );
  }
  else if ( location == "KOHALA FOREST RESERVE (WAIMANU SEC.)" ) {
    sw     = new google.maps.LatLng( 20.066124, -155.649216 );
    ne     = new google.maps.LatLng( 20.152481, -155.592559 );
  }
  else if ( location == "KOHALA HISTORICAL SITES STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 20.256986, -155.878014 );
    ne     = new google.maps.LatLng( 20.258686, -155.876461 );
  }
  else if ( location == "KOHALA HISTORICAL SITES STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 20.255226, -155.88346 );
    ne     = new google.maps.LatLng( 20.25596, -155.882689 );
  }
  else if ( location == "KOHALA HISTORICAL SITES STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 20.216944, -155.8619 );
    ne     = new google.maps.LatLng( 20.218475, -155.860243 );
  }
  else if ( location == "KOHALA WATERSHED FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.028598, -155.697959 );
    ne     = new google.maps.LatLng( 20.095816, -155.600613 );
  }
  else if ( location == "KOKEE STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.096007, -159.695266 );
    ne     = new google.maps.LatLng( 22.163101, -159.61918 );
  }
  else if ( location == "KONA HEMA PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 19.140069, -155.840109 );
    ne     = new google.maps.LatLng( 19.241371, -155.766592 );
  }
  else if ( location == "KOOLAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.907302, -156.253218 );
    ne     = new google.maps.LatLng( 20.910962, -156.247004 );
  }
  else if ( location == "KOOLAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.715289, -156.280152 );
    ne     = new google.maps.LatLng( 20.930215, -156.03388 );
  }
  else if ( location == "KOOLAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.901116, -156.246416 );
    ne     = new google.maps.LatLng( 20.902987, -156.245147 );
  }
  else if ( location == "KOOLAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.824237, -156.168423 );
    ne     = new google.maps.LatLng( 20.82848, -156.162657 );
  }
  else if ( location == "KOOLAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.81601, -156.125677 );
    ne     = new google.maps.LatLng( 20.817186, -156.1244 );
  }
  else if ( location == "KOOLAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.801224, -156.099584 );
    ne     = new google.maps.LatLng( 20.808338, -156.092569 );
  }
  else if ( location == "KUAOKALA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.544386, -158.238587 );
    ne     = new google.maps.LatLng( 21.565699, -158.211019 );
  }
  else if ( location == "KUAOKALA GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 21.551, -158.27524 );
    ne     = new google.maps.LatLng( 21.576522, -158.197485 );
  }
  else if ( location == "KUIA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 22.122895, -159.708634 );
    ne     = new google.maps.LatLng( 22.150806, -159.652775 );
  }
  else if ( location == "KUKANILOKO BIRTHSTONES STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.503728, -158.037603 );
    ne     = new google.maps.LatLng( 21.505668, -158.035042 );
  }
  else if ( location == "KUKUIHOOLUA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.649651, -157.914297 );
    ne     = new google.maps.LatLng( 21.650315, -157.912192 );
  }
  else if ( location == "KULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.697558, -156.303721 );
    ne     = new google.maps.LatLng( 20.74179, -156.258051 );
  }
  else if ( location == "KULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.656491, -156.351602 );
    ne     = new google.maps.LatLng( 20.71935, -156.277888 );
  }
  else if ( location == "KULA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.676365, -156.330445 );
    ne     = new google.maps.LatLng( 20.677865, -156.32899 );
  }
  else if ( location == "KULIOUOU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.301977, -157.727615 );
    ne     = new google.maps.LatLng( 21.326895, -157.718381 );
  }
  else if ( location == "LAIE POINT STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 21.64765, -157.915479 );
    ne     = new google.maps.LatLng( 21.649127, -157.911928 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.767633, -157.084487 );
    ne     = new google.maps.LatLng( 20.947395, -156.861959 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.871368, -156.998385 );
    ne     = new google.maps.LatLng( 20.883935, -156.969786 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.869424, -156.969616 );
    ne     = new google.maps.LatLng( 20.881256, -156.961536 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.871976, -156.93213 );
    ne     = new google.maps.LatLng( 20.877035, -156.927295 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.870224, -156.944071 );
    ne     = new google.maps.LatLng( 20.873969, -156.940666 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.865619, -156.953445 );
    ne     = new google.maps.LatLng( 20.869221, -156.94751 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.867906, -156.940706 );
    ne     = new google.maps.LatLng( 20.870842, -156.936744 );
  }
  else if ( location == "LANAI COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 20.862434, -156.943412 );
    ne     = new google.maps.LatLng( 20.867374, -156.937025 );
  }
  else if ( location == "LAPAKAHI STATE HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 20.155162, -155.902608 );
    ne     = new google.maps.LatLng( 20.182951, -155.892357 );
  }
  else if ( location == "LAUPAHOEHOE NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.886177, -155.313557 );
    ne     = new google.maps.LatLng( 19.968654, -155.213624 );
  }
  else if ( location == "LAVA TREE STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 19.481663, -154.905155 );
    ne     = new google.maps.LatLng( 19.485118, -154.900199 );
  }
  else if ( location == "LEHUA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 22.012871, -160.104341 );
    ne     = new google.maps.LatLng( 22.030243, -160.085702 );
  }
  else if ( location == "LIHUE-KOLOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.932388, -159.505576 );
    ne     = new google.maps.LatLng( 21.941832, -159.496812 );
  }
  else if ( location == "LIHUE-KOLOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.93421, -159.544118 );
    ne     = new google.maps.LatLng( 21.982663, -159.487388 );
  }
  else if ( location == "LIHUE-KOLOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.952302, -159.531561 );
    ne     = new google.maps.LatLng( 21.953192, -159.53015 );
  }
  else if ( location == "LIHUE-KOLOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.947354, -159.516332 );
    ne     = new google.maps.LatLng( 21.947727, -159.515446 );
  }
  else if ( location == "LIHUE-KOLOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.026521, -159.511556 );
    ne     = new google.maps.LatLng( 22.127825, -159.387943 );
  }
  else if ( location == "LIHUE-KOLOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.111121, -159.437641 );
    ne     = new google.maps.LatLng( 22.111876, -159.43635 );
  }
  else if ( location == "MACKENZIE STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 19.436876, -154.865842 );
    ne     = new google.maps.LatLng( 19.440648, -154.861957 );
  }
  else if ( location == "MAKAPUU POINT STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 21.30612, -157.653543 );
    ne     = new google.maps.LatLng( 21.311666, -157.648068 );
  }
  else if ( location == "MAKAWAO FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.795061, -156.289572 );
    ne     = new google.maps.LatLng( 20.853529, -156.237474 );
  }
  else if ( location == "MAKENA STATE PARK" ) {
    sw     = new google.maps.LatLng( 20.627555, -156.453891 );
    ne     = new google.maps.LatLng( 20.642527, -156.442614 );
  }
  else if ( location == "MAKIKI VALLEY STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.308802, -157.831744 );
    ne     = new google.maps.LatLng( 21.317725, -157.826867 );
  }
  else if ( location == "MAKUA KEAAU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.487037, -158.219038 );
    ne     = new google.maps.LatLng( 21.516632, -158.188685 );
  }
  else if ( location == "MALAEKAHANA STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.668035, -157.941548 );
    ne     = new google.maps.LatLng( 21.674194, -157.93474 );
  }
  else if ( location == "MALAEKAHANA STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.653122, -157.935657 );
    ne     = new google.maps.LatLng( 21.663309, -157.926242 );
  }
  else if ( location == "MALAMA KI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.429095, -154.911161 );
    ne     = new google.maps.LatLng( 19.463708, -154.849126 );
  }
  else if ( location == "MANA PLAINS FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.006414, -159.779407 );
    ne     = new google.maps.LatLng( 22.022609, -159.764613 );
  }
  else if ( location == "MANANA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.325275, -157.660831 );
    ne     = new google.maps.LatLng( 21.332441, -157.653722 );
  }
  else if ( location == "MANOWAIALEE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.943558, -155.337885 );
    ne     = new google.maps.LatLng( 19.987431, -155.313046 );
  }
  else if ( location == "MANOWAIALEE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.934789, -155.331465 );
    ne     = new google.maps.LatLng( 19.98612, -155.293678 );
  }
  else if ( location == "MANUKA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 18.997142, -155.924974 );
    ne     = new google.maps.LatLng( 19.20365, -155.743637 );
  }
  else if ( location == "MANUKA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.126239, -155.838455 );
    ne     = new google.maps.LatLng( 19.128604, -155.836328 );
  }
  else if ( location == "MANUKA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.115779, -155.834123 );
    ne     = new google.maps.LatLng( 19.116711, -155.833016 );
  }
  else if ( location == "MANUKA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.107934, -155.827606 );
    ne     = new google.maps.LatLng( 19.111322, -155.823099 );
  }
  else if ( location == "MANUKA STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 19.107946, -155.827619 );
    ne     = new google.maps.LatLng( 19.111334, -155.823111 );
  }
  else if ( location == "MAUNA KEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.704553, -155.621954 );
    ne     = new google.maps.LatLng( 19.935068, -155.344889 );
  }
  else if ( location == "MAUNA KEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.756891, -155.456302 );
    ne     = new google.maps.LatLng( 19.763054, -155.452973 );
  }
  else if ( location == "MAUNA KEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.75809, -155.519211 );
    ne     = new google.maps.LatLng( 19.872173, -155.411936 );
  }
  else if ( location == "MAUNA KEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.807072, -155.405655 );
    ne     = new google.maps.LatLng( 19.814007, -155.395657 );
  }
  else if ( location == "MAUNA KEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.747241, -155.527224 );
    ne     = new google.maps.LatLng( 19.748496, -155.525185 );
  }
  else if ( location == "MAUNA KEA ICE AGE NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.821298, -155.495789 );
    ne     = new google.maps.LatLng( 19.829953, -155.486647 );
  }
  else if ( location == "MAUNA KEA ICE AGE NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.763265, -155.509672 );
    ne     = new google.maps.LatLng( 19.825605, -155.440242 );
  }
  else if ( location == "MAUNA KEA STATE RECREATION AREA/MAUNA KEA FR" ) {
    sw     = new google.maps.LatLng( 19.74647, -155.529383 );
    ne     = new google.maps.LatLng( 19.757537, -155.519515 );
  }
  else if ( location == "MAUNA LOA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.463852, -155.701852 );
    ne     = new google.maps.LatLng( 19.723236, -155.39906 );
  }
  else if ( location == "MOKAPU ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.180627, -156.924757 );
    ne     = new google.maps.LatLng( 21.184985, -156.922715 );
  }
  else if ( location == "MOKEEHIA ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.987068, -156.524049 );
    ne     = new google.maps.LatLng( 20.987483, -156.523184 );
  }
  else if ( location == "MOKEEHIA ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.985466, -156.526722 );
    ne     = new google.maps.LatLng( 20.988622, -156.524431 );
  }
  else if ( location == "MOKOLEA ROCK SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.431615, -157.720042 );
    ne     = new google.maps.LatLng( 21.432131, -157.71924 );
  }
  else if ( location == "MOKU HALA SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.858418, -156.133952 );
    ne     = new google.maps.LatLng( 20.858881, -156.133541 );
  }
  else if ( location == "MOKU MANA ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.859021, -156.131266 );
    ne     = new google.maps.LatLng( 20.860193, -156.129918 );
  }
  else if ( location == "MOKU NAIO SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.737224, -156.968918 );
    ne     = new google.maps.LatLng( 20.737558, -156.968682 );
  }
  else if ( location == "MOKUAEAE ROCK ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 22.233359, -159.403789 );
    ne     = new google.maps.LatLng( 22.235376, -159.401771 );
  }
  else if ( location == "MOKUALAI ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.64853, -157.90957 );
    ne     = new google.maps.LatLng( 21.648903, -157.908568 );
  }
  else if ( location == "MOKUAUIA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.660972, -157.925464 );
    ne     = new google.maps.LatLng( 21.664438, -157.920522 );
  }
  else if ( location == "MOKUHOONIKI ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.130502, -156.704988 );
    ne     = new google.maps.LatLng( 21.134468, -156.701068 );
  }
  else if ( location == "MOKULEIA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.539354, -158.220224 );
    ne     = new google.maps.LatLng( 21.556103, -158.174216 );
  }
  else if ( location == "MOKULEIA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.504286, -158.183662 );
    ne     = new google.maps.LatLng( 21.54766, -158.110878 );
  }
  else if ( location == "MOKULUA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.386376, -157.699454 );
    ne     = new google.maps.LatLng( 21.388729, -157.696264 );
  }
  else if ( location == "MOKULUA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.390289, -157.700548 );
    ne     = new google.maps.LatLng( 21.393202, -157.697351 );
  }
  else if ( location == "MOKUMANU ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.468139, -157.72257 );
    ne     = new google.maps.LatLng( 21.471204, -157.717893 );
  }
  else if ( location == "MOKUMANU ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.168823, -156.888167 );
    ne     = new google.maps.LatLng( 21.170044, -156.886966 );
  }
  else if ( location == "MOKUPUKU ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.191451, -155.70083 );
    ne     = new google.maps.LatLng( 20.192852, -155.699614 );
  }
  else if ( location == "MOLOAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.143204, -159.416384 );
    ne     = new google.maps.LatLng( 22.193938, -159.319958 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.068775, -156.877982 );
    ne     = new google.maps.LatLng( 21.174552, -156.789677 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.16009, -156.829578 );
    ne     = new google.maps.LatLng( 21.160814, -156.828506 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.159466, -156.834346 );
    ne     = new google.maps.LatLng( 21.16038, -156.83073 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.149661, -156.826832 );
    ne     = new google.maps.LatLng( 21.160995, -156.818516 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.154248, -156.837489 );
    ne     = new google.maps.LatLng( 21.155676, -156.836569 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.150109, -156.827158 );
    ne     = new google.maps.LatLng( 21.157975, -156.822557 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.086986, -156.812746 );
    ne     = new google.maps.LatLng( 21.111222, -156.800385 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.093715, -156.805941 );
    ne     = new google.maps.LatLng( 21.097407, -156.803918 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.139075, -157.011546 );
    ne     = new google.maps.LatLng( 21.166436, -156.940822 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.145308, -156.9801 );
    ne     = new google.maps.LatLng( 21.147337, -156.978334 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.10492, -156.970299 );
    ne     = new google.maps.LatLng( 21.139563, -156.915183 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.119993, -156.794424 );
    ne     = new google.maps.LatLng( 21.13591, -156.758956 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.12293, -156.768805 );
    ne     = new google.maps.LatLng( 21.123783, -156.767664 );
  }
  else if ( location == "MOLOKAI FOREST RESERVE / KALAUPAPA N.H.P" ) {
    sw     = new google.maps.LatLng( 21.146506, -156.976668 );
    ne     = new google.maps.LatLng( 21.184338, -156.932609 );
  }
  else if ( location == "MOLOKINI SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.62973, -156.499656 );
    ne     = new google.maps.LatLng( 20.63424, -156.492317 );
  }
  else if ( location == "MOOMOMI PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.185383, -157.199556 );
    ne     = new google.maps.LatLng( 21.205441, -157.151903 );
  }
  else if ( location == "MT OLOMANA STATE MONUMENT/WAIMANALO FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.352139, -157.751732 );
    ne     = new google.maps.LatLng( 21.371145, -157.740462 );
  }
  else if ( location == "NA PALI COAST STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.178984, -159.609661 );
    ne     = new google.maps.LatLng( 22.215993, -159.581359 );
  }
  else if ( location == "NA PALI COAST STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.130587, -159.745773 );
    ne     = new google.maps.LatLng( 22.205015, -159.59937 );
  }
  else if ( location == "NA PALI-KONA FOREST RES/ALAKAI WILDERNESS PRESERVE" ) {
    sw     = new google.maps.LatLng( 22.055821, -159.625654 );
    ne     = new google.maps.LatLng( 22.167162, -159.504007 );
  }
  else if ( location == "NA PALI-KONA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.101064, -159.726958 );
    ne     = new google.maps.LatLng( 22.17326, -159.643201 );
  }
  else if ( location == "NA PALI-KONA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.049308, -159.665398 );
    ne     = new google.maps.LatLng( 22.165787, -159.576784 );
  }
  else if ( location == "NA PALI-KONA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.087094, -159.628041 );
    ne     = new google.maps.LatLng( 22.089949, -159.626423 );
  }
  else if ( location == "NA PALI-KONA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.084783, -159.628941 );
    ne     = new google.maps.LatLng( 22.085598, -159.62789 );
  }
  else if ( location == "NA PALI-KONA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.082383, -159.631915 );
    ne     = new google.maps.LatLng( 22.084085, -159.62814 );
  }
  else if ( location == "NANAHOA ISLETS SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.824346, -156.993678 );
    ne     = new google.maps.LatLng( 20.824956, -156.993052 );
  }
  else if ( location == "NANAHOA ISLETS SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.824756, -156.992559 );
    ne     = new google.maps.LatLng( 20.825163, -156.992011 );
  }
  else if ( location == "NANAHOA ISLETS SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.825701, -156.992375 );
    ne     = new google.maps.LatLng( 20.826331, -156.991718 );
  }
  else if ( location == "NANAKULI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.377804, -158.121504 );
    ne     = new google.maps.LatLng( 21.417328, -158.095381 );
  }
  else if ( location == "NANAWALE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.520503, -154.928038 );
    ne     = new google.maps.LatLng( 19.555546, -154.862239 );
  }
  else if ( location == "NANAWALE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.469641, -154.934548 );
    ne     = new google.maps.LatLng( 19.496044, -154.89008 );
  }
  else if ( location == "NANAWALE FOREST RESERVE (HALEPUAA SEC.)" ) {
    sw     = new google.maps.LatLng( 19.514216, -154.910317 );
    ne     = new google.maps.LatLng( 19.535385, -154.838994 );
  }
  else if ( location == "NONOU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.046365, -159.369912 );
    ne     = new google.maps.LatLng( 22.078845, -159.343755 );
  }
  else if ( location == "NUUANU PALI STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 21.36508, -157.794732 );
    ne     = new google.maps.LatLng( 21.36752, -157.792201 );
  }
  else if ( location == "OAHU FOREST NATIONAL WILDLIFE REFUGE" ) {
    sw     = new google.maps.LatLng( 21.461984, -157.968559 );
    ne     = new google.maps.LatLng( 21.506252, -157.880564 );
  }
  else if ( location == "OKALA ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.173712, -156.930109 );
    ne     = new google.maps.LatLng( 21.175589, -156.927893 );
  }
  else if ( location == "OLAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.512801, -155.210122 );
    ne     = new google.maps.LatLng( 19.607841, -155.123823 );
  }
  else if ( location == "OLAA FOREST RESERVE (MT. VIEW SEC.)" ) {
    sw     = new google.maps.LatLng( 19.431119, -155.246865 );
    ne     = new google.maps.LatLng( 19.48557, -155.147466 );
  }
  else if ( location == "OLD KONA AIRPORT STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 19.637771, -156.019794 );
    ne     = new google.maps.LatLng( 19.650253, -155.998941 );
  }
  else if ( location == "OLOKUI NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 21.124875, -156.879196 );
    ne     = new google.maps.LatLng( 21.17157, -156.832461 );
  }
  else if ( location == "OOKALA COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 19.969678, -155.313365 );
    ne     = new google.maps.LatLng( 20.01553, -155.258446 );
  }
  else if ( location == "OOKALA COOPERATIVE GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 19.98132, -155.287892 );
    ne     = new google.maps.LatLng( 19.984058, -155.285062 );
  }
  else if ( location == "PAHOLE NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 21.523339, -158.196945 );
    ne     = new google.maps.LatLng( 21.548433, -158.164063 );
  }
  else if ( location == "PAIKO LAGOON WILDLIFE SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.280543, -157.728895 );
    ne     = new google.maps.LatLng( 21.284922, -157.720765 );
  }
  else if ( location == "PALAAU STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.167181, -157.017301 );
    ne     = new google.maps.LatLng( 21.178056, -156.99018 );
  }
  else if ( location == "PANAEWA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.639897, -155.064669 );
    ne     = new google.maps.LatLng( 19.65299, -155.053304 );
  }
  else if ( location == "PAOKALANI ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.190723, -155.70343 );
    ne     = new google.maps.LatLng( 20.193653, -155.702039 );
  }
  else if ( location == "PAPANUI O KANE ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.944833, -156.278892 );
    ne     = new google.maps.LatLng( 20.946392, -156.277692 );
  }
  else if ( location == "PAUWALU POINT WILDLIFE SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 20.858348, -156.130936 );
    ne     = new google.maps.LatLng( 20.858666, -156.130599 );
  }
  else if ( location == "PAUWALU POINT WILDLIFE SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 20.855582, -156.13381 );
    ne     = new google.maps.LatLng( 20.859464, -156.12963 );
  }
  else if ( location == "PEARL HARBOR NATIONAL WILDLIFE REFUGE (MID LOCH)" ) {
    sw     = new google.maps.LatLng( 21.384181, -157.984739 );
    ne     = new google.maps.LatLng( 21.388751, -157.980586 );
  }
  else if ( location == "PEARL HARBOR NATIONAL WILDLIFE REFUGE (W LOCH)" ) {
    sw     = new google.maps.LatLng( 21.354447, -158.022867 );
    ne     = new google.maps.LatLng( 21.359514, -158.015577 );
  }
  else if ( location == "PEARL HARBOR NAT&apos;L WILDLIFE REFUGE (KALAELOA)" ) {
    sw     = new google.maps.LatLng( 21.294826, -158.087124 );
    ne     = new google.maps.LatLng( 21.302019, -158.081837 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.099419, -156.925914 );
    ne     = new google.maps.LatLng( 21.178051, -156.84138 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.155198, -156.878885 );
    ne     = new google.maps.LatLng( 21.162556, -156.876244 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.155383, -156.878994 );
    ne     = new google.maps.LatLng( 21.157873, -156.877765 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.157329, -156.879969 );
    ne     = new google.maps.LatLng( 21.160534, -156.878063 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.158022, -156.881533 );
    ne     = new google.maps.LatLng( 21.159927, -156.879741 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.158158, -156.88575 );
    ne     = new google.maps.LatLng( 21.160785, -156.880889 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.160297, -156.881081 );
    ne     = new google.maps.LatLng( 21.160941, -156.87978 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.160562, -156.879199 );
    ne     = new google.maps.LatLng( 21.160868, -156.87891 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.160435, -156.879577 );
    ne     = new google.maps.LatLng( 21.160628, -156.879281 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.160367, -156.879716 );
    ne     = new google.maps.LatLng( 21.160657, -156.879587 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.160506, -156.882081 );
    ne     = new google.maps.LatLng( 21.160768, -156.881731 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.158997, -156.88077 );
    ne     = new google.maps.LatLng( 21.160232, -156.880056 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.154948, -156.878036 );
    ne     = new google.maps.LatLng( 21.155561, -156.877607 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.140465, -156.89513 );
    ne     = new google.maps.LatLng( 21.156026, -156.871597 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.127343, -156.883972 );
    ne     = new google.maps.LatLng( 21.13066, -156.880605 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.127913, -156.887341 );
    ne     = new google.maps.LatLng( 21.129701, -156.88507 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.128605, -156.885079 );
    ne     = new google.maps.LatLng( 21.129095, -156.884597 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.121597, -156.878018 );
    ne     = new google.maps.LatLng( 21.124682, -156.874098 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.122322, -156.878212 );
    ne     = new google.maps.LatLng( 21.123171, -156.877364 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.159143, -156.880627 );
    ne     = new google.maps.LatLng( 21.160064, -156.88014 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.159045, -156.881107 );
    ne     = new google.maps.LatLng( 21.159337, -156.88083 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.159026, -156.879175 );
    ne     = new google.maps.LatLng( 21.159309, -156.878966 );
  }
  else if ( location == "PELEKUNU PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 21.158607, -156.879287 );
    ne     = new google.maps.LatLng( 21.15883, -156.879126 );
  }
  else if ( location == "PMRF BARKING SANDS" ) {
    sw     = new google.maps.LatLng( 21.965889, -159.792753 );
    ne     = new google.maps.LatLng( 22.085985, -159.746242 );
  }
  else if ( location == "POHAKULOA TRAINING AREA RESERVATION" ) {
    sw     = new google.maps.LatLng( 19.753359, -155.568024 );
    ne     = new google.maps.LatLng( 19.766797, -155.52753 );
  }
  else if ( location == "POHAKULOA TRAINING AREA RESERVATION" ) {
    sw     = new google.maps.LatLng( 19.55233, -155.774335 );
    ne     = new google.maps.LatLng( 19.828775, -155.449567 );
  }
  else if ( location == "POHAKULOA TRAINING AREA RESERVATION (KEAMUKU SEC)" ) {
    sw     = new google.maps.LatLng( 19.756418, -155.767651 );
    ne     = new google.maps.LatLng( 19.953998, -155.597738 );
  }
  else if ( location == "POHAKULOA TRAINING AREA RESERVATION/MAUNA KEA FR" ) {
    sw     = new google.maps.LatLng( 19.691386, -155.624419 );
    ne     = new google.maps.LatLng( 19.790047, -155.466394 );
  }
  else if ( location == "POLIHALE STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.069997, -159.774141 );
    ne     = new google.maps.LatLng( 22.096372, -159.745777 );
  }
  else if ( location == "POLIPOLI SPRING STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 20.676365, -156.330445 );
    ne     = new google.maps.LatLng( 20.677865, -156.32899 );
  }
  else if ( location == "POOPOO ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.733956, -156.922335 );
    ne     = new google.maps.LatLng( 20.736291, -156.921422 );
  }
  else if ( location == "POPOIA ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.399221, -157.721695 );
    ne     = new google.maps.LatLng( 21.400431, -157.719402 );
  }
  else if ( location == "POUHALA MARSH WILDLIFE SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 21.370579, -158.011524 );
    ne     = new google.maps.LatLng( 21.381881, -157.998915 );
  }
  else if ( location == "PUAA KAA STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 20.81601, -156.125677 );
    ne     = new google.maps.LatLng( 20.817186, -156.1244 );
  }
  else if ( location == "PULEMOKU ROCK SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 21.659357, -157.915909 );
    ne     = new google.maps.LatLng( 21.659749, -157.914745 );
  }
  else if ( location == "PUPUKEA-PAUMALU FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.634725, -158.031603 );
    ne     = new google.maps.LatLng( 21.657759, -157.998071 );
  }
  else if ( location == "PUU ALII NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 21.121745, -156.924224 );
    ne     = new google.maps.LatLng( 21.167745, -156.88933 );
  }
  else if ( location == "PUU ANAHULU GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 19.641473, -155.927968 );
    ne     = new google.maps.LatLng( 19.93841, -155.640359 );
  }
  else if ( location == "PUU HONAU O HONAUNAU NATIONAL HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 19.407337, -155.915992 );
    ne     = new google.maps.LatLng( 19.425091, -155.900327 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.022625, -159.760442 );
    ne     = new google.maps.LatLng( 22.162093, -159.654161 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.125773, -159.73302 );
    ne     = new google.maps.LatLng( 22.137317, -159.716631 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.952729, -159.686736 );
    ne     = new google.maps.LatLng( 22.123573, -159.596622 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.087232, -159.653141 );
    ne     = new google.maps.LatLng( 22.088455, -159.65222 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.077381, -159.641121 );
    ne     = new google.maps.LatLng( 22.082318, -159.638592 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.079086, -159.64217 );
    ne     = new google.maps.LatLng( 22.081313, -159.640825 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.072303, -159.64813 );
    ne     = new google.maps.LatLng( 22.074786, -159.646234 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.061979, -159.64401 );
    ne     = new google.maps.LatLng( 22.065342, -159.642537 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.056422, -159.638983 );
    ne     = new google.maps.LatLng( 22.058551, -159.638272 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.055704, -159.638074 );
    ne     = new google.maps.LatLng( 22.056982, -159.63655 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.056134, -159.635984 );
    ne     = new google.maps.LatLng( 22.056945, -159.634267 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.043331, -159.641327 );
    ne     = new google.maps.LatLng( 22.045524, -159.640218 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.040251, -159.640352 );
    ne     = new google.maps.LatLng( 22.04221, -159.638785 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.038398, -159.639262 );
    ne     = new google.maps.LatLng( 22.040568, -159.637608 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.036225, -159.641133 );
    ne     = new google.maps.LatLng( 22.04052, -159.638239 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.037895, -159.641488 );
    ne     = new google.maps.LatLng( 22.038566, -159.640604 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.039645, -159.640319 );
    ne     = new google.maps.LatLng( 22.04042, -159.639716 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.028227, -159.651044 );
    ne     = new google.maps.LatLng( 22.02954, -159.64766 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.026563, -159.654085 );
    ne     = new google.maps.LatLng( 22.027903, -159.65015 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 22.00556, -159.667073 );
    ne     = new google.maps.LatLng( 22.008661, -159.665687 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.992676, -159.667357 );
    ne     = new google.maps.LatLng( 21.995172, -159.665632 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.989158, -159.668429 );
    ne     = new google.maps.LatLng( 21.992412, -159.664407 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.97855, -159.662078 );
    ne     = new google.maps.LatLng( 21.982719, -159.654177 );
  }
  else if ( location == "PUU KA PELE FOREST RESERVE/PMRF MAKAHA RIDGE" ) {
    sw     = new google.maps.LatLng( 22.125773, -159.73302 );
    ne     = new google.maps.LatLng( 22.137317, -159.716631 );
  }
  else if ( location == "PUU MAKAALA NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.468595, -155.313456 );
    ne     = new google.maps.LatLng( 19.58286, -155.16843 );
  }
  else if ( location == "PUU MALI MITIGATION" ) {
    sw     = new google.maps.LatLng( 19.893352, -155.49495 );
    ne     = new google.maps.LatLng( 19.951784, -155.39857 );
  }
  else if ( location == "PUU O MAHUKA HEIAU STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.640632, -158.060657 );
    ne     = new google.maps.LatLng( 21.642442, -158.058126 );
  }
  else if ( location == "PUU O UMI NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 20.035251, -155.771993 );
    ne     = new google.maps.LatLng( 20.170053, -155.624786 );
  }
  else if ( location == "PUU UALAKEA STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 21.309428, -157.827742 );
    ne     = new google.maps.LatLng( 21.318498, -157.816527 );
  }
  else if ( location == "PUU UALAKEA STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 21.311702, -157.824382 );
    ne     = new google.maps.LatLng( 21.317103, -157.817622 );
  }
  else if ( location == "PUU WAAWAA FOREST BIRD SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 19.705111, -155.91199 );
    ne     = new google.maps.LatLng( 19.74825, -155.830012 );
  }
  else if ( location == "PUU WAAWAA FOREST BIRD SANCTUARY (PROPOSED)" ) {
    sw     = new google.maps.LatLng( 19.735421, -155.892496 );
    ne     = new google.maps.LatLng( 19.736819, -155.891199 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.679927, -155.970483 );
    ne     = new google.maps.LatLng( 19.903199, -155.778975 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.804281, -155.853889 );
    ne     = new google.maps.LatLng( 19.833179, -155.825844 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.797709, -155.821128 );
    ne     = new google.maps.LatLng( 19.7983, -155.820501 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.788165, -155.81111 );
    ne     = new google.maps.LatLng( 19.788714, -155.810527 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.78781, -155.801793 );
    ne     = new google.maps.LatLng( 19.78838, -155.801188 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.773968, -155.843929 );
    ne     = new google.maps.LatLng( 19.780642, -155.840454 );
  }
  else if ( location == "PUU WAAWAA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.777608, -155.819399 );
    ne     = new google.maps.LatLng( 19.778281, -155.818685 );
  }
  else if ( location == "PUUKII ISLAND SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.756221, -155.979925 );
    ne     = new google.maps.LatLng( 20.757826, -155.979091 );
  }
  else if ( location == "PUUKOHOLA HEIAU NATIONAL HISTORIC SITE" ) {
    sw     = new google.maps.LatLng( 20.022899, -155.824921 );
    ne     = new google.maps.LatLng( 20.033297, -155.816279 );
  }
  else if ( location == "PUUPEHE ISLET SEA BIRD SANCTUARY" ) {
    sw     = new google.maps.LatLng( 20.733551, -156.890655 );
    ne     = new google.maps.LatLng( 20.734854, -156.889809 );
  }
  else if ( location == "ROUND TOP FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.311702, -157.824382 );
    ne     = new google.maps.LatLng( 21.317103, -157.817622 );
  }
  else if ( location == "ROYAL MAUSOLEUM STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.320753, -157.849243 );
    ne     = new google.maps.LatLng( 21.326121, -157.845053 );
  }
  else if ( location == "RUSSIAN FORT ELIZABETH STATE HISTORICAL PARK" ) {
    sw     = new google.maps.LatLng( 21.948505, -159.666362 );
    ne     = new google.maps.LatLng( 21.953484, -159.661925 );
  }
  else if ( location == "SACRED FALLS STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.536209, -157.927458 );
    ne     = new google.maps.LatLng( 21.608477, -157.893645 );
  }
  else if ( location == "SACRED FALLS STATE PARK" ) {
    sw     = new google.maps.LatLng( 21.598186, -157.898006 );
    ne     = new google.maps.LatLng( 21.598654, -157.897514 );
  }
  else if ( location == "SAND ISLAND STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.296871, -157.89211 );
    ne     = new google.maps.LatLng( 21.315364, -157.866728 );
  }
  else if ( location == "SOUTH KONA FOREST RES. (OLELOMOANA OPIHIHALI SEC.)" ) {
    sw     = new google.maps.LatLng( 19.259802, -155.879086 );
    ne     = new google.maps.LatLng( 19.293758, -155.796687 );
  }
  else if ( location == "SOUTH KONA FOREST RESERVE (KAOHE SEC.)" ) {
    sw     = new google.maps.LatLng( 19.311622, -155.868841 );
    ne     = new google.maps.LatLng( 19.322828, -155.78214 );
  }
  else if ( location == "SOUTH KONA FOREST RESERVE (KAPUA-MANUKA SEC.)" ) {
    sw     = new google.maps.LatLng( 19.157847, -155.868549 );
    ne     = new google.maps.LatLng( 19.214732, -155.815833 );
  }
  else if ( location == "SOUTH KONA FOREST RESERVE (KAPUA-MANUKA SEC.)" ) {
    sw     = new google.maps.LatLng( 19.173171, -155.85851 );
    ne     = new google.maps.LatLng( 19.175024, -155.854818 );
  }
  else if ( location == "SOUTH KONA FOREST RESERVE (KUKUIOPAE SEC.)" ) {
    sw     = new google.maps.LatLng( 19.287338, -155.875224 );
    ne     = new google.maps.LatLng( 19.313056, -155.786487 );
  }
  else if ( location == "ULU PO HEIAU STATE MONUMENT" ) {
    sw     = new google.maps.LatLng( 21.385188, -157.75345 );
    ne     = new google.maps.LatLng( 21.386388, -157.752293 );
  }
  else if ( location == "UPPER WAIAKEA BOG SANCTUARY" ) {
    sw     = new google.maps.LatLng( 19.64815, -155.359313 );
    ne     = new google.maps.LatLng( 19.653606, -155.353172 );
  }
  else if ( location == "UPPER WAIAKEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.50702, -155.421942 );
    ne     = new google.maps.LatLng( 19.70431, -155.104219 );
  }
  else if ( location == "UPPER WAIAKEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.64815, -155.359313 );
    ne     = new google.maps.LatLng( 19.653606, -155.353172 );
  }
  else if ( location == "UPPER WAIAKEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.620966, -155.248714 );
    ne     = new google.maps.LatLng( 19.646699, -155.221572 );
  }
  else if ( location == "WAAHILA RIDGE STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.301601, -157.805901 );
    ne     = new google.maps.LatLng( 21.308901, -157.794717 );
  }
  else if ( location == "WAHIAWA FRESHWATER STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 21.487765, -158.028692 );
    ne     = new google.maps.LatLng( 21.495617, -158.01906 );
  }
  else if ( location == "WAIAHA SPRINGS FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.645425, -155.932964 );
    ne     = new google.maps.LatLng( 19.652523, -155.919758 );
  }
  else if ( location == "WAIAHA SPRINGS FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.630467, -155.943403 );
    ne     = new google.maps.LatLng( 19.645573, -155.916638 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (IOLEKAA SEC)" ) {
    sw     = new google.maps.LatLng( 21.411499, -157.839701 );
    ne     = new google.maps.LatLng( 21.423376, -157.824109 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (IOLEKAA SEC)" ) {
    sw     = new google.maps.LatLng( 21.416454, -157.829548 );
    ne     = new google.maps.LatLng( 21.416734, -157.829234 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (IOLEKAA SEC)" ) {
    sw     = new google.maps.LatLng( 21.416267, -157.829768 );
    ne     = new google.maps.LatLng( 21.419148, -157.826057 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (WAIAHOLE SEC)" ) {
    sw     = new google.maps.LatLng( 21.457738, -157.894738 );
    ne     = new google.maps.LatLng( 21.486878, -157.857333 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (WAIAHOLE SEC)" ) {
    sw     = new google.maps.LatLng( 21.473726, -157.871687 );
    ne     = new google.maps.LatLng( 21.47512, -157.869343 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (WAIAHOLE SEC)" ) {
    sw     = new google.maps.LatLng( 21.474116, -157.869734 );
    ne     = new google.maps.LatLng( 21.474936, -157.868696 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (WAIAHOLE SEC)" ) {
    sw     = new google.maps.LatLng( 21.472872, -157.872724 );
    ne     = new google.maps.LatLng( 21.473567, -157.871599 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (WAIAHOLE SEC)" ) {
    sw     = new google.maps.LatLng( 21.475096, -157.868972 );
    ne     = new google.maps.LatLng( 21.476657, -157.867665 );
  }
  else if ( location == "WAIAHOLE FOREST RESERVE (WAIAHOLE SEC)" ) {
    sw     = new google.maps.LatLng( 21.482919, -157.874468 );
    ne     = new google.maps.LatLng( 21.483786, -157.873062 );
  }
  else if ( location == "WAIAKEA 1942 LAVA FLOW NATURAL AREA RESERVE" ) {
    sw     = new google.maps.LatLng( 19.620966, -155.248714 );
    ne     = new google.maps.LatLng( 19.646699, -155.221572 );
  }
  else if ( location == "WAIAKEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.58059, -155.206587 );
    ne     = new google.maps.LatLng( 19.673679, -155.064238 );
  }
  else if ( location == "WAIAKEA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.619507, -155.140578 );
    ne     = new google.maps.LatLng( 19.633851, -155.117117 );
  }
  else if ( location == "WAIANAE KAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.463121, -158.194358 );
    ne     = new google.maps.LatLng( 21.508724, -158.124678 );
  }
  else if ( location == "WAIANAE KAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.484619, -158.148317 );
    ne     = new google.maps.LatLng( 21.495722, -158.140506 );
  }
  else if ( location == "WAIANAE KAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.485017, -158.158703 );
    ne     = new google.maps.LatLng( 21.485843, -158.157749 );
  }
  else if ( location == "WAIANAE KAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.484395, -158.158314 );
    ne     = new google.maps.LatLng( 21.487095, -158.15554 );
  }
  else if ( location == "WAIANAE KAI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.476329, -158.15032 );
    ne     = new google.maps.LatLng( 21.478785, -158.147269 );
  }
  else if ( location == "WAIANAPANAPA STATE PARK" ) {
    sw     = new google.maps.LatLng( 20.775605, -156.008095 );
    ne     = new google.maps.LatLng( 20.791351, -155.986586 );
  }
  else if ( location == "WAIHEE COASTAL DUNES AND WETLANDS REFUGE" ) {
    sw     = new google.maps.LatLng( 20.928425, -156.516125 );
    ne     = new google.maps.LatLng( 20.950293, -156.49663 );
  }
  else if ( location == "WAIHEE COASTAL DUNES AND WETLANDS REFUGE" ) {
    sw     = new google.maps.LatLng( 20.941997, -156.510792 );
    ne     = new google.maps.LatLng( 20.943985, -156.509327 );
  }
  else if ( location == "WAIHOU SPRING FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.805873, -156.276706 );
    ne     = new google.maps.LatLng( 20.808593, -156.275007 );
  }
  else if ( location == "WAIHOU SPRING FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.805294, -156.281486 );
    ne     = new google.maps.LatLng( 20.809895, -156.277669 );
  }
  else if ( location == "WAIHOU SPRING FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.798757, -156.289276 );
    ne     = new google.maps.LatLng( 20.811119, -156.276849 );
  }
  else if ( location == "WAIHOU SPRING FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.807353, -156.279921 );
    ne     = new google.maps.LatLng( 20.81594, -156.27491 );
  }
  else if ( location == "WAIKAMOI PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 20.728579, -156.270043 );
    ne     = new google.maps.LatLng( 20.810995, -156.137668 );
  }
  else if ( location == "WAILOA RIVER STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 19.719274, -155.084894 );
    ne     = new google.maps.LatLng( 19.722165, -155.078154 );
  }
  else if ( location == "WAILOA RIVER STATE RECREATION AREA" ) {
    sw     = new google.maps.LatLng( 19.712071, -155.079739 );
    ne     = new google.maps.LatLng( 19.723378, -155.069065 );
  }
  else if ( location == "WAILUA GAME MANAGEMENT AREA" ) {
    sw     = new google.maps.LatLng( 22.05894, -159.420513 );
    ne     = new google.maps.LatLng( 22.104386, -159.373991 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.041933, -159.337491 );
    ne     = new google.maps.LatLng( 22.045184, -159.33462 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.021185, -159.402592 );
    ne     = new google.maps.LatLng( 22.060306, -159.328827 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.042375, -159.361895 );
    ne     = new google.maps.LatLng( 22.045746, -159.358693 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.043978, -159.356358 );
    ne     = new google.maps.LatLng( 22.049846, -159.347044 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.048707, -159.340138 );
    ne     = new google.maps.LatLng( 22.049662, -159.339131 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.045042, -159.351141 );
    ne     = new google.maps.LatLng( 22.049067, -159.340929 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.043193, -159.359422 );
    ne     = new google.maps.LatLng( 22.045096, -159.355117 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.030619, -159.36984 );
    ne     = new google.maps.LatLng( 22.039353, -159.363876 );
  }
  else if ( location == "WAILUA RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.033853, -159.367837 );
    ne     = new google.maps.LatLng( 22.036192, -159.362957 );
  }
  else if ( location == "WAILUA VALLEY STATE WAYSIDE" ) {
    sw     = new google.maps.LatLng( 20.83881, -156.140553 );
    ne     = new google.maps.LatLng( 20.841119, -156.139518 );
  }
  else if ( location == "WAILUKU RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 19.718174, -155.110825 );
    ne     = new google.maps.LatLng( 19.719914, -155.108386 );
  }
  else if ( location == "WAILUKU RIVER STATE PARK" ) {
    sw     = new google.maps.LatLng( 19.713102, -155.132081 );
    ne     = new google.maps.LatLng( 19.716095, -155.128245 );
  }
  else if ( location == "WAILUKU SILVERSWORD SANCTUARY/MAUNA KEA FR" ) {
    sw     = new google.maps.LatLng( 19.807072, -155.405655 );
    ne     = new google.maps.LatLng( 19.814007, -155.395657 );
  }
  else if ( location == "WAIMANALO FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 21.369072, -157.745043 );
    ne     = new google.maps.LatLng( 21.370794, -157.743529 );
  }
  else if ( location == "WAIMEA CANYON STATE PARK" ) {
    sw     = new google.maps.LatLng( 22.018258, -159.691564 );
    ne     = new google.maps.LatLng( 22.123333, -159.652505 );
  }
  else if ( location == "WAIMEA STATE RECREATION PIER" ) {
    sw     = new google.maps.LatLng( 21.954391, -159.670948 );
    ne     = new google.maps.LatLng( 21.955894, -159.66966 );
  }
  else if ( location == "WAINIHA  PRESERVE (NATURE CONSERVANCY)" ) {
    sw     = new google.maps.LatLng( 22.057795, -159.588707 );
    ne     = new google.maps.LatLng( 22.164258, -159.483152 );
  }
  else if ( location == "WAO KELE O PUNA FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 19.37198, -155.137752 );
    ne     = new google.maps.LatLng( 19.516011, -154.958238 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.966847, -156.590638 );
    ne     = new google.maps.LatLng( 21.013952, -156.546706 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.945561, -156.553588 );
    ne     = new google.maps.LatLng( 20.959491, -156.531625 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.938256, -156.642266 );
    ne     = new google.maps.LatLng( 20.945202, -156.629242 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.923206, -156.623871 );
    ne     = new google.maps.LatLng( 20.936514, -156.60714 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.928366, -156.639493 );
    ne     = new google.maps.LatLng( 20.934305, -156.622508 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.921377, -156.639687 );
    ne     = new google.maps.LatLng( 20.929024, -156.624264 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.911553, -156.553346 );
    ne     = new google.maps.LatLng( 20.921584, -156.527191 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.903758, -156.642415 );
    ne     = new google.maps.LatLng( 20.920252, -156.598259 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.911617, -156.528069 );
    ne     = new google.maps.LatLng( 20.915761, -156.515418 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.902352, -156.640761 );
    ne     = new google.maps.LatLng( 20.908083, -156.607667 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.86297, -156.634677 );
    ne     = new google.maps.LatLng( 20.877513, -156.601631 );
  }
  else if ( location == "WEST MAUI FOREST RESERVE" ) {
    sw     = new google.maps.LatLng( 20.783978, -156.619133 );
    ne     = new google.maps.LatLng( 20.882082, -156.54364 );
  }
  else if ( location == "WEST MAUI NATURAL AREA RESERVE (HONOKOWAI SEC)" ) {
    sw     = new google.maps.LatLng( 20.885555, -156.622411 );
    ne     = new google.maps.LatLng( 20.933344, -156.582228 );
  }
  else if ( location == "WEST MAUI NATURAL AREA RESERVE (KAHAKULOA SEC)" ) {
    sw     = new google.maps.LatLng( 20.909445, -156.587929 );
    ne     = new google.maps.LatLng( 20.98752, -156.542393 );
  }
  else if ( location == "WEST MAUI NATURAL AREA RESERVE (LIHAU SEC)" ) {
    sw     = new google.maps.LatLng( 20.823708, -156.626517 );
    ne     = new google.maps.LatLng( 20.854835, -156.593677 );
  }
  else if ( location == "WEST MAUI NATURAL AREA RESERVE (PANAEWA SEC)" ) {
    sw     = new google.maps.LatLng( 20.874391, -156.645951 );
    ne     = new google.maps.LatLng( 20.900034, -156.582509 );
  }

  else {
    return false;
  }

  // Compute latlng bounding box:

  bounds = new google.maps.LatLngBounds( sw, ne );

  // If not specified above, define center as center of above max bounding box:

  if ( !center ) {
    center = bounds.getCenter();
  }

  // Set map to specified center point and bounds:

  map.fitBounds( bounds );
  map.setCenter( center );

} // jumpTo()


/*
array2bounds()
Converts supplied bounds array to a gmap LatLngBounds object.
*/

function array2bounds ( bounds_array ) {

  if ( !bounds_array ) {
    return;
  }

  // Get spatial bounds min/max lat/lng limits:
  
  var minlat = bounds_array[ 0 ];
  var minlon = bounds_array[ 1 ];
  var maxlat = bounds_array[ 2 ];
  var maxlon = bounds_array[ 3 ];

  // Create LatLng objects for southwest and northeast corners:
  
  var sw = new google.maps.LatLng( minlat, minlon );
  var ne = new google.maps.LatLng( maxlat, maxlon );

  // Create LatLngBounds bounding box Google Maps object:
  
  bounds = new google.maps.LatLngBounds( sw, ne );

  return bounds;

} // array2bounds()
