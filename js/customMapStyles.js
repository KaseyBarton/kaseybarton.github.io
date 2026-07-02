/*
CustomMapStyleControl()
Provides a select list to change the map style using the Google Maps API.
*/

function CustomMapStyleControl( controlDiv, map ) {

  // Set CSS styles for the DIV containing the control.
  // Setting padding to 5px will offset the control from the edge of the map:

  controlDiv.style.padding = '5px';
  controlDiv.style.marginTop = '5px';

  prevStyle = '';

  // Create a select list with the available map styles:

  var selectList = document.createElement( 'select' );
  selectList.id = 'customMapStyles';
  controlDiv.appendChild( selectList );

  // Which styles do we want to make as options?:

  var option = document.createElement( 'option' );
  option.value = '';
  option.text = 'Map Style';
  selectList.appendChild( option );

  var option = document.createElement( 'option' );
  option.value = '0';
  option.text = 'Default';
  selectList.appendChild( option );

  var option = document.createElement( 'option' );
  option.value = '15';
  option.text = 'Subtle';
  selectList.appendChild( option );

  var option = document.createElement( 'option' );
  option.value = '1';
  option.text = 'Grayscale';
  selectList.appendChild( option );

  var option = document.createElement( 'option' );
  option.value = '7';
  option.text = 'Dark Grayscale';
  selectList.appendChild( option );

  var option = document.createElement( 'option' );
  option.value = '8';
  option.text = 'Light Monochrome';
  selectList.appendChild( option );

  var option = document.createElement( 'option' );
  option.value = '2';
  option.text = 'Simple Topography';
  selectList.appendChild( option );

  // Update map when select list value changes: 

  var that = this; // create closure

  google.maps.event.addDomListener( selectList, 'change',
    function() {
      that.switchStyle( selectList.value );
      prevStyle = selectList.value;
      setTimeout(
        function () {
          selectList.selectedIndex = 0;
        },
        750 
      );
    }
  );

  // Hide the style div if satellite basemap selected and return to default
  // map settings (so that roads on satellite basemap are not different):

  google.maps.event.addListener( map, 'maptypeid_changed',
    function () {
      var mapType = map.getMapTypeId().toLowerCase();
      if ( mapType == 'satellite'
        || mapType == 'hybrid' ) {
        controlDiv.style.display = 'none';
        that.switchStyle( 0 );
      }
      else {
        that.switchStyle( prevStyle );
        controlDiv.style.display = '';
      }
    }
  );

}

CustomMapStyleControl.prototype.snazzyMapStyles = {

  // Default style:

  "0": [{}],

  // Grayscale ("Subtle Grayscale": http://snazzymaps.com/style/15/):

  "1": [{"featureType":"landscape","stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},{"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},{"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},{"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},{"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},{"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}],

  // Unimposed Topography (http://snazzymaps.com/style/16/):

  "2": [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"all","stylers":[{"hue":"#727D82"},{"lightness":-30},{"saturation":-80}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"simplified"},{"hue":"#F3F4F4"},{"lightness":80},{"saturation":-80}]}],

  // Black & White:

  "3": [{"featureType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","stylers":[{"visibility":"on"},{"lightness":-100}]},{"featureType":"landscape","stylers":[{"visibility":"on"},{"lightness":100}]},{"elementType":"labels","stylers":[{"lightness":100},{"visibility":"off"}]}],

  // Black & White w/Labels:

  "4": [{"elementType":"geometry","stylers":[{"color":"#ffffff"}]},{"featureType":"water","stylers":[{"color":"#000000"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#000000"}]}],

  // White & Black:

  "5": [{"featureType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","stylers":[{"visibility":"on"},{"lightness":100}]},{"featureType":"landscape","stylers":[{"visibility":"on"},{"lightness":-100}]},{"elementType":"labels","stylers":[{"lightness":100},{"visibility":"off"}]}],

  // White & Black w/Labels:

  "6": [{"elementType":"geometry","stylers":[{"color":"#000000"}]},{"featureType":"water","stylers":[{"color":"#ffffff"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#000000"}]}],

  // Gray & White:

  "9": [{"featureType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","stylers":[{"visibility":"on"},{"color":"#666666"}]},{"featureType":"landscape","stylers":[{"visibility":"on"},{"lightness":100}]},{"elementType":"labels","stylers":[{"lightness":100},{"visibility":"off"}]}],

  // Gray & White w/Labels:

  "10": [{"elementType":"geometry","stylers":[{"color":"#ffffff"}]},{"featureType":"water","stylers":[{"color":"#666666"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#000000"}]}],

  // White & Gray:

  "11": [{"featureType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","stylers":[{"visibility":"on"},{"lightness":100}]},{"featureType":"landscape","stylers":[{"visibility":"on"},{"color":"#666666"}]},{"elementType":"labels","stylers":[{"lightness":100},{"visibility":"off"}]}],

  // White & Gray w/Labels:

  "12": [{"elementType":"geometry","stylers":[{"color":"#666666"}]},{"featureType":"water","stylers":[{"color":"#ffffff"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#000000"}]}],

  // Blue & Beige:

  "13": [{"featureType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","stylers":[{"visibility":"on"},{"color":"#a5bfdd"}]},{"featureType":"landscape","stylers":[{"visibility":"on"},{"color":"#F5F5DC"}]},{"elementType":"labels","stylers":[{"lightness":100},{"visibility":"off"}]}],

  // Blue & Beige w/Labels:

  "14": [{"elementType":"geometry","stylers":[{"color":"#F5F5DC"}]},{"featureType":"water","stylers":[{"color":"#a5bfdd"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#000000"}]}],

  // Dark Grayscale ("Shades of Grey": http://snazzymaps.com/style/38/):

  "7": [{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":16}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#000000"},{"lightness":40}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]}],

  // Light Monochrome (http://snazzymaps.com/style/29/):

  "8": [{"featureType":"water","elementType":"all","stylers":[{"hue":"#e9ebed"},{"saturation":-78},{"lightness":67},{"visibility":"simplified"}]},{"featureType":"landscape","elementType":"all","stylers":[{"hue":"#ffffff"},{"saturation":-100},{"lightness":100},{"visibility":"simplified"}]},{"featureType":"road","elementType":"geometry","stylers":[{"hue":"#bbc0c4"},{"saturation":-93},{"lightness":31},{"visibility":"simplified"}]},{"featureType":"poi","elementType":"all","stylers":[{"hue":"#ffffff"},{"saturation":-100},{"lightness":100},{"visibility":"off"}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"hue":"#e9ebed"},{"saturation":-90},{"lightness":-8},{"visibility":"simplified"}]},{"featureType":"transit","elementType":"all","stylers":[{"hue":"#e9ebed"},{"saturation":10},{"lightness":69},{"visibility":"on"}]},{"featureType":"administrative.locality","elementType":"all","stylers":[{"hue":"#2c2e33"},{"saturation":7},{"lightness":19},{"visibility":"on"}]},{"featureType":"road","elementType":"labels","stylers":[{"hue":"#bbc0c4"},{"saturation":-93},{"lightness":31},{"visibility":"on"}]},{"featureType":"road.arterial","elementType":"labels","stylers":[{"hue":"#bbc0c4"},{"saturation":-93},{"lightness":-2},{"visibility":"simplified"}]}],

  // Subtle (http://snazzymaps.com/style/19/):

  "15": [{"featureType":"poi","stylers":[{"visibility":"off"}]},{"stylers":[{"saturation":-70},{"lightness":37},{"gamma":1.15}]},{"elementType":"labels","stylers":[{"gamma":0.26},{"visibility":"off"}]},{"featureType":"road","stylers":[{"lightness":0},{"saturation":0},{"hue":"#ffffff"},{"gamma":0}]},{"featureType":"road","elementType":"labels.text.stroke","stylers":[{"visibility":"off"}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"lightness":20}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"lightness":50},{"saturation":0},{"hue":"#ffffff"}]},{"featureType":"administrative.province","stylers":[{"visibility":"on"},{"lightness":-50}]},{"featureType":"administrative.province","elementType":"labels.text.stroke","stylers":[{"visibility":"off"}]},{"featureType":"administrative.province","elementType":"labels.text","stylers":[{"lightness":20}]}],

  // Bright ("Bright & Bubbly": http://snazzymaps.com/style/17/):

  "16": [{"featureType":"water","stylers":[{"color":"#19a0d8"}]},{"featureType":"administrative","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"},{"weight":6}]},{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#e85113"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#efe9e4"},{"lightness":-40}]},{"featureType":"road.arterial","elementType":"geometry.stroke","stylers":[{"color":"#efe9e4"},{"lightness":-20}]},{"featureType":"road","elementType":"labels.text.stroke","stylers":[{"lightness":100}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"lightness":-100}]},{"featureType":"road.highway","elementType":"labels.icon"},{"featureType":"landscape","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"landscape","stylers":[{"lightness":20},{"color":"#efe9e4"}]},{"featureType":"landscape.man_made","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"labels.text.stroke","stylers":[{"lightness":100}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"lightness":-100}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"hue":"#11ff00"}]},{"featureType":"poi","elementType":"labels.text.stroke","stylers":[{"lightness":100}]},{"featureType":"poi","elementType":"labels.icon","stylers":[{"hue":"#4cff00"},{"saturation":58}]},{"featureType":"poi","elementType":"geometry","stylers":[{"visibility":"on"},{"color":"#f0e4d3"}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#efe9e4"},{"lightness":-25}]},{"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"color":"#efe9e4"},{"lightness":-10}]},{"featureType":"poi","elementType":"labels","stylers":[{"visibility":"simplified"}]}]
 
} // snazzyMapStyles{}


CustomMapStyleControl.prototype.switchStyle = function ( id ) {

  // Set "map" type:
  /*
  var mapType = map.getMapTypeId().toLowerCase();

  if ( mapType != 'roadmap'
    && mapType != 'terrain' ) {
    map.setMapTypeId( google.maps.MapTypeId.ROADMAP );
  }
  */ 

  if ( !id ) {
    id = '0';
  }

  // Clone style options from snazzy map dictionary:

  var mapOptions = jQuery.extend( true, [], this.snazzyMapStyles[ id ] );

  // Highlight state boundaries?:

  if ( document.getElementById( 'highlight_states' )
    && document.getElementById( 'highlight_states' ).checked ) {
    mapOptions.push(
      {
        "featureType": "administrative.province",
        "elementType": "geometry.stroke",
        "stylers": [
          { "weight": 2 },
          { "color": "#FF00FF" }
        ]
      },
      {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
          { "color": "#ff00ff" },
          { "weight": 2 }
        ]
      }
    );
  }

  // Set map style:

  map.setOptions( { styles: mapOptions } );

} // switchStyle()
