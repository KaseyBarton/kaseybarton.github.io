/*
 * Drought Tolerance Index
 * March 2019 - November, 2023
 * https://kaseybarton.github.io/drought/
 * Author: Kasey E. Barton, Ph.D. <kbarton@hawaii.edu>
 * Web Programmer: John Maurer <jmaurer@hawaii.edu>
 */

// Do the following after the page has loaded:

jQuery( document ).ready(
  function () {

    //console.info( 'just testing' );

    // Set zoom to default:
    
    document.getElementById( 'zoom' ).selectedIndex = 0;
 
    // Move the overlay options centered below the map:
    // DEPRECATED: Now placing manually in HTML...
    /*
    jQuery( '#zoom' ).position(
      {
        my: 'left+10 top+10',
        at: 'left top',
        of: '#map'
      }
    );

    jQuery( '#overlay_options' ).position(
      {
        my: 'center top+10',
        at: 'center bottom',
        of: '#map'
      }
    ); 

    jQuery( '#overlay_legend_div' ).position(
      {
        my: 'left+35 center',
        at: 'right center',
        of: '#map'
      }
    );
    */

    // Convert rainfall unit radio button to jQuery  UI button sets:
    /* DEPRECATED: Moved to on/off switch instead...
    if ( document.getElementById( 'rainUnitMm' ) ) {
      document.getElementById( 'rainUnitMm' ).checked = true;
    }
 
    jQuery( '#rainUnitSwitch' ).buttonset();
    */

    // Load our drought tolerance data from Google Sheets into SPECIES object:
    
    loadGoogleSheet();

    // Load the Google Map:
   
    loadMap(); 

    return;
  }
); // ready()

/* GLOBAL VARIABLES: */

// Google Sheets id for the documenting containing our data:

var spreadsheet_id = '128laS5N1NXAPUMQW-DNloCZ_eGchm8k3_aagnrnB2nc';

// This will store our data after it is read from the Google Sheet:

var SPECIES = {}; 
var SITES = {}; // locations where source populations were sampled

// Store response from downloading the Google Sheet of the sites:

var sites_sheet;

// Array of displayed markers (DOM ids):

var MARKERS = [];

// Will display large markers unless we exceed this limit, in which
// case we will use small markers instead, to avoid cluttering the gauge:

var LARGE_MARKER_LIMIT = 0; // 5; No longer using the large leaf marker...

// Define spatial bounds of various regions of interest;
// [ minlat, minlon, maxlat, maxlon ]:

var BOUNDS = {

  // Main Hawaiian Islands:
  
  'MHI': [ 18.5941, -160.4498, 22.4364, -154.5996 ],

  // Hawaii Island (a.k.a. Big Island):
  
  'Hawaiʻi': [ 18.9023, -156.6842, 20.2737, -154.3428 ],

  // Kahoolawe:
  
  'Kahoʻolawe': [ 20.4850, -156.7103, 20.6226, -156.5220 ],

  // Kauai:
 
  'Kauaʻi': [ 21.7862, -159.8497, 22.3310, -159.1905 ],

  // Lanai:
  
  'Lānaʻi': [ 20.6970, -157.1020, 20.9716, -156.7724 ],

  // Maui:
 
  'Maui': [ 20.5241, -156.7172, 21.0736, -155.9193 ], 

  // Molokai:

  'Molokaʻi': [ 20.9934, -157.3743, 21.2573, -156.665 ],

  // Niihau:

  'Niʻihau': [ 21.7652, -160.2726, 22.0219, -160.0254 ],
 
  // Oahu:
 
  'Oʻahu': [ 21.1914, -158.3164, 21.7505, -157.6023  ]
  
}; // BOUNDS{}

/*
showSpecies()
Place a marker on the DTI scale for the selected species. Will remove
previous markers on the gauge unless keep_prev_markers is true; if so,
can also specify the total number of markers that need to be displayed
--this gets used to choose a marker style that is suitable.
*/

function showSpecies ( species, skip_zoom, keep_prev_markers, total_markers, all_species, origin_species ) {

  // If no species specified, clear the chart:
 
  if ( !species ) {
    clearGauge();
    clearSites();
    zoomToIslands( [ 'MHI' ] );
    labelSpecies();
    return;
  } 
 
  // Show all species?:
 
  if ( species.toLowerCase() == 'all' ) { 
    clearGauge(
      function () {
        showAllSpecies( null, skip_zoom );
      }
    );
    return;
  }

  // Show a specific origin of species (e.g., native or non-native)?:

  if ( species.toLowerCase() == 'native'
    || species.toLowerCase() == 'non-native' ) { 
    clearGauge( 
      function () {
        showAllSpecies( species, skip_zoom );
      }
    );
    return;
  }
 
  // Does this species exist in our data table?:
 
  if ( typeof( SPECIES[ species ] ) == 'undefined' ) {
    alert( 'ERROR: No data for this species.' );
    return;
  }

  // Get the data points associated with this species:

  var points = getPointsBySpecies( species );

  // Count the number of markers that will ultimately be displayed
  // on the gauge; if keeping previous markers from other species,
  // use the supplied total_markers. Otherwise, define total_markers
  // as the number of points for this species only:

  if ( !keep_prev_markers ) {
    total_markers = points.length;
  }

  // Loop through the available data for this species; collect the
  // list of site IDs that this includes (for subsequent mapping):
 
  var site_ids = [];
  var islands = [];

  for ( var i = 0; i < points.length; i++ ) {

    var site_id = showMarker( species, points[ i ], i, total_markers, keep_prev_markers, all_species );

    if ( site_id
      && site_ids.indexOf( site_id ) == -1 ) {
      site_ids.push( site_id );
    }

    // Island?:
    
    var island = getIsland( points[ i ] );
  
    if ( island
      && islands.indexOf( island ) == -1 ) { 
      islands.push( island );
    }
  }

  // Label the species shown on the page:
 
  if ( !all_species && !origin_species ) {
    labelSpecies( species );
  } 
  
  // Map the sites where these species have been sampled:

  if ( !all_species && !origin_species ) {
    clearSites(); // clear prior sites, if any 
  }

  var marker_size = 'large';
  var query_column = 'Site ID';
  var query_values = site_ids;
  var label_column = 'Site ID';

  // What size markers should we use (large or small)? Only the large
  // markers contain labels, but the smaller markers are easier to see
  // on a busy map with many sites. The color will depend on native
  // or non-native species:

  var marker_size = 'small';
  var marker_color;

  var origin = getOrigin( species ); // i.e., native or non-native 
  var marker_color = getMarkerColor( origin ); 
  
  if ( document.getElementById( 'large_markers' ).checked ) {
    marker_size = 'large';
  }
 
  mapSites( sites_sheet, marker_size, query_column, query_values, label_column, marker_color );

  // If no Site IDs were recorded, show a warning to the user:
 
  if ( site_ids.length == 0 ) {
    jQuery( '#site_unknown' ).show(); 
  }
  else {
    jQuery( '#site_unknown' ).hide();
  }
 
  // Zoom to islands containing mapped sites:
  
  if ( !all_species
    && !origin_species
    && !skip_zoom ) {
    zoomToIslands( islands );
  } 
   
  // Update legend?:

  updateLegend( total_markers );

  // Remove any markers beyond the number of points available:

  if ( !keep_prev_markers ) {

    for ( var i = 0; i < MARKERS.length; i++ ) {
      if ( i >= points.length ) {
        clearMarker( MARKERS[ i ] );
      }
    }

    // Re-define the MARKERS array:
  
    MARKERS = new Array();

    for ( var i = 0; i < points.length; i++ ) {
      MARKERS[ i ] = 'marker' + ( i + 1 );
    } 
  }
  
  return islands;

} // showSpecies()


/*
showAllSpecies()
Runs showSpecies() for each available species. Maintains prior markers
so all get shown on the same gauge. Can be run on a specific origin 
(e.g., native or non-native) or for all possible species.
*/

function showAllSpecies ( origin, skip_zoom ) {

  // Clear map of prior displayed sites, if any:

  clearSites();

  // Count the total number of data points:

  var total_markers = countMarkers( origin );

  // Show each species; keep markers from prior species and inform
  // showSpecies() of the total number of markers we are going to display:

  var islands = [];

  for ( var species_name in SPECIES ) {

    // What origin is this species (e.g., native or non-native)?:

    var this_origin = getOrigin( species_name );

    // Collect the series of islands that contain this species:
   
    var these_islands = [];
 
    // Show this marker?:

    if ( !origin ) {
      these_islands = showSpecies( species_name, skip_zoom, 'keep_prev_marker', total_markers, 'all_species' );
    }
    else if ( origin == this_origin ) {
      these_islands = showSpecies( species_name, skip_zoom, 'keep_prev_markers', total_markers, null, 'origin_species' );
    }

    // Compile list of all unique islands:
   
    for ( var i = 0; i < these_islands.length; i++ ) {
      var island = these_islands[ i ];
      if ( islands.indexOf( island ) == -1 ) {
        islands.push( island );
      }
    } 
  }

  // Label the page with the selected group of species:

  var species_label = 'ALL SPECIES';

  if ( origin ) { 
    species_label = 'ALL ' + origin.toUpperCase() + ' SPECIES';
  }
 
  labelSpecies( species_label );
  
  // Zoom to the appropriate islands:

  if ( !skip_zoom ) { 
    zoomToIslands( islands ); 
  }
  
  return;

} // showAllSpecies()


/*
showSite()
Place a marker on the DTI scale for the selected site ID. Will remove
previous markers on the gauge unless keep_prev_markers is true; if so,
can also specify the total number of markers that need to be displayed
--this gets used to choose a marker style that is suitable.
*/

function showSite ( site_id, skip_zoom, keep_prev_markers, total_markers, all_sites, island_sites, origin_sites ) {

  // This warning is only used for showSpecies(); clear any previously displayed:

  jQuery( '#site_unknown' ).hide();

  // If no site specified, clear the chart:

  if ( !site_id ) {
    clearGauge();
    clearSites();
    zoomToIslands( [ 'MHI' ] );
    labelSite();
    return;
  }

  // Show all sites?:

  if ( site_id.toLowerCase() == 'all' ) { 
    clearGauge(
      function () {
        showAllSites( null, skip_zoom );
      }
    );
    return;
  }

  // Show all sites for a specific island?:

  if ( site_id == 'Hawaiʻi'
    || site_id == 'Kahoʻolawe' 
    || site_id == 'Kauaʻi'
    || site_id == 'Lānaʻi'
    || site_id == 'Maui'
    || site_id == 'Molokaʻi'
    || site_id == 'Niʻihau' 
    || site_id == 'Oʻahu' ) { 
    clearGauge(
      function () {
        showAllSites( site_id, skip_zoom );
      }
    );
    return;
  }

  // Does this site exist in our data table?:

  if ( typeof( SITES[ site_id ] ) == 'undefined' ) {
    alert( 'ERROR: No data for this site id.' );
    return;
  }

  // Get the data points associated with this site:

  var points = getPointsBySite( site_id );

  // Count the number of markers that will ultimately be displayed
  // on the gauge; if keeping previous markers from other sites,
  // use the supplied total_markers. Otherwise, define total_markers
  // as the number of points for this site only:

  if ( !keep_prev_markers ) {
    total_markers = points.length;
  } 

  // Get the island associated with this site:
 
  var island = SITES[ site_id ][ 'island' ];

  // Get the origins associated with this site (native, non-native, or both):
 
  var origin = getOriginBySite( site_id ); 
 
  // Offset markers on the gauge? i.e., if both native (above) and non-native (below);
  // check for this site, for all sites for the island (origin_sites), or if showing
  // all sites:

  var offset_marker = false;

  if ( origin == 'both' 
    || origin_sites == 'both'
    || all_sites ) {
    offset_marker = true;
  }
 
  // Show the data points on the DTI gauge:

  for ( var i = 0; i < points.length; i++ ) {

    // Get the species at this data point:

    var species = points[ i ][ 'species' ];

    // Show a marker on the DTI gauge:

    showMarker( species, points[ i ], i, total_markers, keep_prev_markers, offset_marker );
  }

  // Determine if species collected at this site are of native or non-native 
  // origin, or has both:
  
  var origin = getOriginBySite( site_id );

  // Label the site shown on the page:

  if ( !all_sites && !island_sites ) {
    labelSite( site_id );
  } 
  
  // Map this site:

  if ( !all_sites && !island_sites ) {
    clearSites(); // clear prior sites, if any 
  }

  var marker_size = 'large';
  var query_column = 'Site ID';
  var query_values = [ site_id ];
  var label_column = 'Site ID';

  // What size markers should we use (large or small)? Only the large
  // markers contain labels, but the smaller markers are easier to see
  // on a busy map with many sites. The color will depend on native
  // or non-native species:

  var marker_size = 'small';
  var marker_color = getMarkerColor( origin );

  if ( document.getElementById( 'large_markers' ).checked ) {
    marker_size = 'large';
  }

  mapSites( sites_sheet, marker_size, query_column, query_values, label_column, marker_color );

  // Zoom to island containing site:

  if ( !all_sites && !skip_zoom ) {
    if ( island.toLowerCase() == 'unknown' ) {
      zoomToIslands( [ 'MHI' ] );
    }
    else {
      zoomToIslands( [ island ] );
    }
  }

  // Update legend?:

  updateLegend( total_markers );

  // Remove any markers beyond the number of points available:

  if ( !keep_prev_markers ) {

    for ( var i = 0; i < MARKERS.length; i++ ) {
      if ( i >= points.length ) {
        clearMarker( MARKERS[ i ] );
      }
    }

    // Re-define the MARKERS array:

    MARKERS = new Array();

    for ( var i = 0; i < points.length; i++ ) {
      MARKERS[ i ] = 'marker' + ( i + 1 );
    }
  }

  return island;

} // showSite()


/*
showAllSites()
Runs showSite() for each available site. Maintains prior markers
so all get shown on the same gauge. Can be run on a specific island
or for all possible sites.
*/

function showAllSites ( island, skip_zoom ) {

  // Clear map of prior displayed sites, if any:

  clearSites();

  // Count the total number of data points:

  var total_markers = countMarkersByIsland( island );

  // Origin of species in the data points? (native, non-native, or both):

  var origin = getOriginBySite( island ); 

  // Show each site; keep markers from prior sites and inform
  // showSites() of the total number of markers we are going to display:

  var islands = [];

  for ( var site_id in SITES ) {

    // Get the island associated with this site:

    var this_island = SITES[ site_id ][ 'island' ];
   
    // Compile list of unique islands:

    if ( !islands.includes( this_island ) ) {
      if ( !island
        || island == this_island ) {
        islands.push( this_island );
      }
    } 

    // Show this marker?:

    if ( !island ) {
      showSite( site_id, skip_zoom, 'keep_prev_marker', total_markers, 'all_sites' );
    }
    else if ( island == this_island ) {
      showSite( site_id, skip_zoom, 'keep_prev_markers', total_markers, null, 'island_sites', origin );
    }
  }

  // Label the page with the selected group of sites:

  var sites_label = 'ALL SITES';

  if ( island ) {

    var this_island_label = island;

    if ( island == 'Hawaiʻi' ) {
      this_island_label += ' Island'; 
    }
   
    sites_label = 'ALL ' + this_island_label.toUpperCase() + ' SITES';
  }

  labelSpecies( sites_label ); // Uses same div as species label

  // Zoom to the appropriate islands:

  if ( !skip_zoom ) {
    zoomToIslands( islands );
  }

  return;

} // showAllSites()


/*
updateLegend()
Will update the legend depending on whether the large or small marker
icons are being displayed on the data gauge. This is decided based
on the total number of markers being displayed at once. If there are
more markers than LARGE_MARKER_LIMIT, then smaller markers are used to
avoid cluttering the gauge display.
*/

function updateLegend ( total_markers ) {

  // Small markers?:

  if ( total_markers > LARGE_MARKER_LIMIT ) {
    jQuery( '.legend_large' ).css( 'display', 'none' );
    jQuery( '.legend_small' ).css( 'display', 'table-cell' );
  }

  // Large markers:

  else {
    jQuery( '.legend_large' ).css( 'display', 'table-cell' );
    jQuery( '.legend_small' ).css( 'display', 'none' );
  }

  return;

} // updateLegend()


/*
countMarkers()
Counts the number of data points in the SPECIES global object for the
specified origin (e.g., native or non-native) or all if no origin is
specified.
*/

function countMarkers ( origin ) {

  var total_markers = 0;

  // Loop through the available species names:

  for ( var species_name in SPECIES ) {
    
    // Loop through the available data for this species:

    var points = getPointsBySpecies( species_name );

    for ( var i = 0; i < points.length; i++ ) {

      // What origin is this species (e.g., native or non-native)?:

      var this_origin = getOrigin( species_name );

      // Include this marker in our tally?:

      if ( !origin
        || origin == this_origin ) {
        total_markers += 1;
      }
    } 
    
  }

  // Return the total number of matching markers:

  return total_markers;

} // countMarkers()


/*
countMarkersByIsland()
Counts the number of data points in the SPECIES global object for the
specified island, or for all possible islands if none is specified.
*/

function countMarkersByIsland ( island ) {

  var total_markers = 0;

  // Loop through the available species names:

  for ( var species_name in SPECIES ) {

    // Loop through the available data for this species:

    var points = getPointsBySpecies( species_name );

    for ( var i = 0; i < points.length; i++ ) {
      
      // Island?:

      var this_island = getIsland( points[ i ] );
     
      // Include this marker in our tally?:

      if ( !island 
        || island == this_island ) {
        total_markers += 1;
      }       
    }
  }

  // Return the total number of matching markers:

  return total_markers;

} // countMarkersByIsland()
 

/*
showMarker()
Adds a marker to the gauge for the specified data point, which is an object
from SPECIES containing a single measurement.
*/

function showMarker ( species, point, index, total_markers, keep_prev_markers, all_species ) {

  if ( !species
    || !point ) {
    return;
  }

  // What origin is this species (e.g., native or non-native)?:

  var origin = getOrigin( species );

  // Site ID?:
  
  var site_id = getSiteID( point );

  // Site name?:

  var site_name = getSiteName( point );

  // Island?:

  var island = getIsland( point );
 
  // Drought tolerance index (DTI)?:

  var dti = getDTI( point );

  // Drought method?:
 
  var method = getDroughtMethod( point );
  
  // Performance metric?:
  
  var metric = getPerformanceMetric( point );

  // Publication?:

  var pub = getPublication( point );
 
  // Define unique marker id; append an integer index to "marker". 
  // Increment the integer index depending on the previous markers
  // already defined and/or preserved:

  var marker_id = getMarkerId( index, keep_prev_markers );

  // Define a title attribute for the marker; this can be defined as
  // an HTML string that will be displayed as a jQuery UI tooltip when
  // the user hovers over the marker:

  var marker_title = getMarkerTitle(
    species,
    site_id,
    site_name,
    island,
    dti,
    method,
    metric,
    pub
  );

  // If this marker id does not exist yet, create it now:

  if ( !document.getElementById( marker_id ) ) {
    addMarker( marker_id, marker_title, dti, origin, total_markers, all_species );
  }

  // Otherwise, update the existing marker with the new data:

  else {
    updateMarker( marker_id, marker_title, dti, origin, total_markers, all_species );
  }

  return site_id;

} // showMarker()


/*
getPointsBySpecies()
Gets the data points defined for the specified species. These get
defined in the SPECIES global object.
*/

function getPointsBySpecies ( species ) {

  // Get "data" attribute in the global SPECIES object for
  // this species name:

  var points = SPECIES[ species ][ 'data' ];

  return points;

} // getPointsBySpecies()


/*
getPointsBySite()
Gets the data points defined for the specified site id. These get defined
in the SPECIES global object. Will add species as an additional data field.
*/

function getPointsBySite ( site_id ) {

  var points = [];

  // Loop through every species:

  for ( var species_name in SPECIES ) {

    // Get "data" attribute for this species name:
   
    var these_points = SPECIES[ species_name ][ 'data' ];

    // Look for the specified site_id and add the species name as an additional
    // data field:
   
    for ( var i = 0; i < these_points.length; i++ ) { 

      var this_site_id = these_points[ i ][ 'site_id' ];

      if ( this_site_id == site_id ) {
        these_points[ i ][ 'species' ] = species_name;
        points.push( these_points[ i ] );
      }
    }
  }  
  
  // Return all matching data points:
  
  return points;

} // getPointsBySite()


/*
getOrigin()
Gets the origin of the species. i.e., native or non-native.
*/

function getOrigin ( species ) {

  // Get "origin" attribute in the global SPECIES object for
  // this species name:

  var origin = SPECIES[ species ][ 'origin' ];

  return origin;

} // getOrigin()


/*
getOriginBySite()
Gets the origin of the species (i.e., native, non-native, or both) collected at
a specific site. Can limit to a specific island by specifying an island for
site_id instead.
*/

function getOriginBySite ( site_id ) {

  var origin;
  var origins = [];

  // Loop through each species:
 
  for ( species_name in SPECIES ) {

    // Loop through each data point:
  
    var points = SPECIES[ species_name ][ 'data' ];
 
    for ( var i = 0; i < points.length; i++ ) {

      // Was it collected at the specified site?:
      
      var this_site_id = points[ i ][ 'site_id' ];
      var this_island = getIsland( points[ i ] );

      if ( site_id == this_site_id
        || site_id == this_island ) {

        // Record the origin:
        
        var origin = getOrigin( species_name );

        if ( !origins.includes( origin ) ) {
          origins.push( origin );
        }
      }
    } 
  }

  // Are both origins (native and non-native) at this site?:

  if ( origins.length > 1 ) {
    origin = 'both'; 
  }
  else {
    origin = origins[ 0 ];
  } 

  return origin;

} // getOriginBySite()


/*
getSiteName()
Gets the site name for the supplied data point object from
the SITES global object, if any (e.g., "Waimea"). If site ID is
undefined for the point, returns empty string ('').
*/

function getSiteName ( point ) {

  var site_name = '';

  if ( typeof( point[ 'site_id' ] ) != 'undefined' ) {
    var site_id = point[ 'site_id' ];
    if ( site_id in SITES ) {
      site_name = SITES[ site_id ][ 'site_name' ];
    }
  }

  return site_name;

} // getSiteName()


/*
getIsland()
Gets the island for the supplied data point object from
the SITES global object (e.g., "Oahu"). If site ID is
undefined for the point, returns empty string ('').
*/

function getIsland ( point ) {

  var island = '';

  if ( typeof( point[ 'site_id' ] ) != 'undefined' ) {
    var site_id = point[ 'site_id' ];
    if ( site_id in SITES ) {
      island = SITES[ site_id ][ 'island' ];
    }
  }

  // If island is "unknown", return null instead:
 
  if ( island
    && island.toLowerCase() == 'unknown' ) {
    return;
  } 
  
  return island;

} // getIsland()


/*
 * getSiteID()
 * Gets the site ID for the supplied data point object from
 * the SPECIES global object, if any (e.g., "A"). If undefined,
 * returns empty string ('').
 * */

function getSiteID ( point ) {

  var site_id = '';

  if ( typeof( point[ 'site_id' ] ) != 'undefined' ) {
    site_id = point[ 'site_id' ];
  }

  return site_id;

} // getSiteID()


/*
getDTI()
Gets the drought tolerance index (DTI) for the supplied data point
object from the SPECIES global object. This gets defined in the
SPECIES global object as percent change in biomass under drought,
which must then be converted to DTI.
*/

function getDTI ( point ) {

  /* OBSOLETE: This method no longer used; data now reported directly as DTI
   * in the spreadsheet rather than as Biomass Change %. So, conversion to
   * DTI is no longer necessary:
   
  // % change in biomass under drought?:

  var biomass_change_percent = getBiomassChangePercent( point );

  // Compute drought tolerance index (0 to 100%):

  var dti = bcp2dti( biomass_change_percent );
  */

  var dti;

  if ( typeof( point[ 'drought_tolerance_index' ] ) != 'undefined' ) {
    dti = point[ 'drought_tolerance_index' ];
  }

  return dti;

} // getDTI()


/*
getBiomassChangePercent()
Gets the percent decrease in biomass under drought for the supplied
data point object from the SPECIES global object.
*/

function getBiomassChangePercent ( point ) {

  var biomass_change_percent;

  // % decrease in biomass under drought?:

  if ( typeof( point[ 'biomass_change_percent' ] ) != 'undefined' ) {
    biomass_change_percent = point[ 'biomass_change_percent' ];
  }

  return biomass_change_percent;

} // getBiomassChangePercent()

/*
getDroughtMethod()
Gets the drought method for the supplied data point object.
*/

function getDroughtMethod ( point ) {

  var method;

  if ( typeof( point[ 'drought_method' ] ) != 'undefined' ) {
    method = point[ 'drought_method' ];
  }

  return method;

} // getDroughtMethod()


/*
getPerformanceMetric()
Gets the performance metric for the supplied data point object.
*/

function getPerformanceMetric ( point ) {

  var metric;

  if ( typeof( point[ 'performance_metric' ] ) != 'undefined' ) {
    metric = point[ 'performance_metric' ];
  }

  return metric;

} // getPerformanceMetric()


/*
getPublication()
Gets the publication for the supplied data point object.
*/

function getPublication ( point ) {

  var pub;

  if ( typeof( point[ 'publication' ] ) != 'undefined' ) {
    pub = point[ 'publication' ];
  }

  return pub;

} // getPublication()


/*
bcp2dti()
Converts the biomass change percent (BCP) under drought conditions
(usually negative percentage value) to a drought tolerance index (DTI).
This is merely the inverse of the decrease percent. Example: -40%
decrease percent is 60% DTI. If the biomass change happens to be a
positive percent (increase in biomass with drought), we cap the DTI
at 100%. 
*/

function bcp2dti ( biomass_change_percent ) {

  // Compute drought tolerance index (0 to 100%) as inverse
  // of biomass change percentage:

  var dti = biomass_change_percent + 100.0;

  // Cap max possible dti at 100%:
 
  if ( dti > 100 ) {
    dti = 100.0;
  } 
  
  return dti;

} // bcp2dti()


/*
getMarkerId()
Returns the id attribute to use for a marker. This is a simple "marker#" string,
where "#" is an integer that gets incremented depending on the number of markers
needed for display. If keeping previous markers, it will increment past the
existing array of marker ids. Otherwise, it will go one beyond the specified index
(so that it is one-based instead of zero-based).
*/

function getMarkerId ( index, keep_prev_markers ) {

  var marker_id = '';

  if ( keep_prev_markers
    && MARKERS.length ) {
    marker_id = 'marker' + ( MARKERS.length + 1 ); // global MARKERS array
  }
  else {
    marker_id = 'marker' + ( index + 1 );
  }

  return marker_id;

} // getMarkerId()


/*
getMarkerTitle()
Defines a title attribute for a marker based on the supplied values.
This title will be an HTML string (multi-line) that gets read by
jQuery UI tooltip, which will appear as the user hovers over the
marker.
*/

function getMarkerTitle (
    species,
    site_id,
    site_name,
    island,
    dti,
    method,
    metric,
    pub
  ) {

  // Start with the drought tolerance index (DTI) value:

  var marker_title = '<b>' + dti.toFixed( 1 ) + '%</b>';

  // On a new line, list the species:

  marker_title += '<br/>species: <i>' + species + '</i>';

  // If a site name is supplied, add it on a new line:
  
  if ( site_name ) {
    marker_title += '<br/>site name: ' + site_name;
  }

  // If an island is supplied, add it on a new line:

  if ( island ) {
    marker_title += '<br/>island: ' + island;
  }

  // If a site ID is supplied, add it on a new line:
 
  if ( site_id ) {
    marker_title += '<br/>site ID: ' + site_id;
  } 

  // Drought method?:

  if ( method ) {
    marker_title += '<br/>drought method: ' + method;
  }

  // Performance metric?:

  if ( metric ) {
    marker_title += '<br/>performance metric: ' + metric;
  }
 
  // Publication?: 

  if ( pub ) {
    marker_title += '<br/>publication: ' + pub;
  }

  // Add additional info about this data point:
 
  return marker_title;

} // getMarkerTitle()


/*
addMarker()
Adds a marker to the gauge with the specified attributes.
*/

function addMarker ( marker_id, marker_title, dti, origin, total_markers, all_species ) {

  // Define the HTML for the marker div; the marker will differ depending on
  // the data origin (e.g., native or non-native):

  var marker_html = getMarker( marker_id, marker_title, dti, origin, total_markers, all_species );

  // Add the marker to our DTI data gauge:

  jQuery( '#gauge' ).append( marker_html );

  // Hide it immediately and then slowly fade in to reveal the new marker:

  jQuery( '#' + marker_id ).hide();
  jQuery( '#' + marker_id ).fadeIn( 'slow' );

  // Add jQuery UI tooltip to the marker; this will display as the user
  // hovers over the marker:

  addTooltip( marker_id );

  // Add the new marker id to the global MARKERS array:

  MARKERS.push( marker_id );

  return;

} // addMarker()


/*
getMarker()
Returns the HTML for a div to display a marker on the DTI gauge using
the specified attributes. The marker will either be a large leaf or
a small circle depending on the total number of markers that need to
be displayed on the gauge at once. Also, the marker will either be
dark or light depending on whether the data point is for a native
or non-native plant species.
*/

function getMarker ( marker_id, marker_title, dti, origin, total_markers, all_species ) {

  var marker_html = '';

  // Either get a small circle or a larger leaf icon, depending on the
  // total number of markers that need to be displayed at once on the gauge:

  if ( total_markers > LARGE_MARKER_LIMIT ) {
    marker_html = getSmallMarker( marker_id, marker_title, dti, origin, all_species );
  }
  else {
    marker_html = getLargeMarker( marker_id, marker_title, dti, origin );
  }

  return marker_html;

} // getMarker()


/*
getMarkerColor()
Returns the marker color to use based on the origin of the species, which
can be either "native", "non-native", or "both" (some sites have both types).
*/

function getMarkerColor ( origin ) {

  var marker_color;

  if ( origin == 'native' ) {
    marker_color = '#595959';
  } 
  else if ( origin == 'non-native' ) {
    marker_color = '#ffffff';
  }
  else if ( origin == 'both' ) {
    marker_color = '#000000';
  }

  return marker_color;

} // getMarkerColor()


/*
getLargeMarker()
Returns the HTML for a div to display a relatively larger leaf marker on the
DTI gauge using the specified attributes. The marker will have a different
display style depending on the origin of the data point (e.g., native or
non-native).
*/

function getLargeMarker ( marker_id, marker_title, dti, origin ) {

  // Start a new div:

  var marker_html = '<div';

  // Add the marker id:

  marker_html += ' id="' + marker_id + '"';

  // Add the marker title:

  marker_html += ' title="' + marker_title + '"';

  // Make all markers part of the same "marker" CSS class:

  marker_html += ' class="marker"';

  // Position the marker within the gauge; use the dti as its left position:

  marker_html += ' style="position: absolute; top: 0px; left: ' + dti + '%;';

  // Place the marker near the middle of the gauge vertically:

  marker_html += ' margin-top: 10px;';

  // Left-align the text and offset the left margin to help center
  // the icon at the data value:

  marker_html += ' text-align: left; margin-left: -10px;';

  // Use a very bold font for this icon:

  marker_html += ' font-weight: 900;';

  // Choose a color based on the species origin (native, non-native, both):

  var marker_color = getMarkerColor( origin );

  // Native icon style:

  if ( origin.toLowerCase() == 'native' ) {

    // Use a dark gray font color:

    marker_html += ' color: ' + marker_color + ';';

    // Since we are not using a stroke value on this icon, make it
    // slightly bigger so that it is comparable in size to non-native icon:

    marker_html += ' font-size: 1.06em';
  }

  // Non-native (e.g., non-native) icon style:

  else if ( origin.toLowerCase() == 'non-native' ) {

    // Use a white font color:

    marker_html += ' color: ' + marker_color + ';';

    // Use a dark gray text stroke to outline the marker icon:

    marker_html += ' -webkit-text-stroke: 2px #595959; text-stroke: 2px #595959;';
  }

  // Both native and non-native species at the site:

  else {

    // Use a black font color:

    marker_html += ' color: ' + marker_color + ';';
  }

  // Close the CSS style definitions and the opening div tag:

  marker_html += '">';

  // Add a large FontAwesome leaf icon as the div content:

  marker_html += '<i class="fa fa-leaf fa-lg" aria-hidden="true"></i>';

  // Close the marker div:

  marker_html += '</div>'; 

  return marker_html;

} // getLargeMarker()


/*
getSmallMarker()
Returns the HTML for a div to display a relatively smaller circle marker on
the DTI gauge using the specified attributes. The marker will have a different
display style depending on the origin of the data point (e.g., native or
non-native).
*/

function getSmallMarker ( marker_id, marker_title, dti, origin, all_species ) {

  var marker_html = '';

  // Circle:
  //var marker_html = '<div id="' + marker_id + '" class="marker" style="display: none; position: absolute; top: 0px; left: ' + dti + '%; text-align: left; margin-left: -10px; margin-top: 4px; height: 16px; width: 16px; background-color: #ffffff; border-radius: 50%; display: inline-block; border: 3px solid #595959;"></div>';

  // Start a new div:

  var marker_html = '<div';

  // Add the marker id:

  marker_html += ' id="' + marker_id + '"';

  // Add the marker title:

  marker_html += ' title="' + marker_title + '"';

  // Make all markers part of the same "marker" CSS class:

  marker_html += ' class="marker"';

  // Position the marker within the gauge; use the dti as its left position:

  marker_html += ' style="position: absolute; top: 0px; left: ' + dti + '%;';

  // Place the marker near the middle of the gauge vertically; if 
  // showing all species, place native middle-top and non-native middle-bottom
  // so they do not visually conflict with each other when overlapping:

  if ( all_species ) {
    if ( origin.toLowerCase() == 'native' ) {
      marker_html += ' margin-top: 3px;';
    }
    else {
      marker_html += ' margin-top: 17px;';
    }
  }
  else {
    marker_html += ' margin-top: 12px;';
  }

  // Left-align the text and offset the left margin to help center
  // the icon at the data value:

  marker_html += ' text-align: left; margin-left: -5px;';

  // Define a circle: 

  marker_html += ' height: 8px; width: 8px; border-radius: 50%; display: inline-block; display: inline-block;';

  // Choose a color based on the species origin (native, non-native, both):
  
  var marker_color = getMarkerColor( origin );

  // Native icon style:

  if ( origin.toLowerCase() == 'native' ) {

    // Use a dark gray circle:

    marker_html += ' background-color: ' + marker_color + ';';

    // Use a white border:

    marker_html += ' border: 2px solid #333333'; // #e5e5e5;';
  }

  // Non-native icon style:

  else if ( origin.toLowerCase() == 'non-native' ) {

    // Use a white circle:

    marker_html += ' background-color: ' + marker_color + ';';

    // Use a dark gray border:

    marker_html += ' border: 2px solid #595959;';
  }

  // Both (site has native and non-native species):
 
  else {

    // Use a black circle:
    
    marker_html += 'background-color: ' + marker_color + ';'; 

    // Use a white border:
    
    marker_html += ' border: 2px solid #ffffff;'; 
  }  

  // Close the CSS style definitions and the opening div tag:

  marker_html += '">';

  // Close the marker div:

  marker_html += '</div>';

  return marker_html;
  
} // getSmallMarker()


/*
addTooltip
Adds a jQuery UI tooltip to the specified marker id. This HTML string gets
displayed as the user hovers over the marker.
*/

function addTooltip ( marker_id ) {

  jQuery( '#' + marker_id ).tooltip(
    {

      // This workaround allows us to display HTML with newlines (breaks):

      content: function( callback ) {
        callback( jQuery( this ).prop( 'title' ).replace( '|', '<br/>' ) );
      },

      // The open/close functions below will increment or reset the z-index
      // value of the marker such that it pops to the top when hovered over;
      // when there are multiple markers in the same area of the gauge, this
      // helps reveal which marker is being shown:

      open: function () {

        var this_marker_id = jQuery( this ).attr( 'id' );

        // Increment z-index by 1 to make it higher in stack order:

        if ( jQuery.isNumeric( jQuery( this ).css( 'z-index' ) ) ) {
          var z_index = jQuery( this ).css( 'z-index' ) + 1;
          jQuery( this ).css( 'z-index', z_index );
        }

        // If z-index was "auto", set it to 100 to make it higher than "auto":

        else {
          jQuery( this ).css( 'z-index', '100' );
        }
      },

      // Setting z-index back to "auto" will make it replace its original
      // stack order:

      close: function () {
        var this_marker_id = jQuery( this ).attr( 'id' );
        jQuery( this ).css( 'z-index', 'auto' );
      }
    }
  );
  
  return;

} // addTooltip()


/*
updateMarker()
Updates an existing marker id with the provided data. Will animate motion
of the marker from its previous location on the DTI data gauge to its 
new DTI value. Will update marker icon to match origin (e.g., native
or non-native), etc.
*/

function updateMarker ( marker_id, marker_title, dti, origin, total_markers, all_species ) {

  // Define the HTML for the marker div; the marker will differ depending on
  // the data origin (e.g., native or non-native):

  var marker_html = getMarker( marker_id, marker_title, dti, origin, total_markers, all_species );

  // Move the marker to its new DTI value on the data gauge; once it has
  // moved, update its HTML to the new display icon:
  
  jQuery( '#' + marker_id ).animate(

    {
      left: dti + '%'
    },

    // After the above animation is complete, replay the marker icon and
    // jQuery UI tooltip:

    function () {
      jQuery( '#' + marker_id ).replaceWith( marker_html );
      addTooltip( marker_id );
    }

  ); // animate()

  return;

} // updateMarker()


/*
clearGauge()
Removes all markers from the gauge.
*/

function clearGauge ( callback ) {

  if ( MARKERS.length == 0 ) {
    if ( callback ) {
      callback();
    }
    return;
  }

  for ( var i = 0; i < MARKERS.length; i++ ) {
    if ( i == MARKERS.length - 1 ) {
      clearMarker( MARKERS[ i ], callback );
    }
    else {
      clearMarker( MARKERS[ i ] );
    }
  }

  MARKERS = new Array();

  return;

} // clearGauge()


/*
clearMarker()
Removes the specified marker from the gauge. Does *not* remove it
from the MARKERS global array; must handle that separately yourself.
*/

function clearMarker ( marker_id, callback ) {

  if ( !marker_id ) {
    return;
  }

  if ( document.getElementById( marker_id ) ) {

    // First fade out, then remove the marker from DOM:
    
    jQuery( '#' + marker_id ).fadeOut(
      'slow',
      function () {
        jQuery( '#' + marker_id ).remove();
        if ( callback ) {
          callback();
        }
      }
    );
  }

  return;

} // clearMarker()


/*
loadGoogleSheet()
Loads data with drought tolerance index from a Google Sheets spreadsheet
document online. Stores result in a global SPECIES object.
*/

function loadGoogleSheet () {

  // Get the title (e.g., "Sheet1") of the first sheet in the document:
  //
  //var sheet_title = getSheetTitle( spreadsheet_id );
 

  // First load the "Data" sheet; this contains the biomass change percent
  // for each species population that was sampled: 
  
  var sheet_title = 'Data';

  // URL to data; this returns JSON via Google Sheets API:
  
  var sheets_url = google_sheets_baseurl + spreadsheet_id + '/values/' + sheet_title + '?key=' + google_api_key;
 
  jQuery.ajax(
    {
      async: true,
      url: sheets_url,
      dataType: 'json',
      success: function ( response ) {
        loadGoogleSheet_part2( response );
      },
      error: function ( response, status_str ) {
        alert( 'Cannot load data!' );
        console.info( status_str );
        console.info( response.responseText );
      }
    }
  );
 
  return;

} // loadGoogleSheet();


/*
loadGoogleSheet_part2()
Once the Google Sheet has been read in part1, this loads the data into a global
SPECIES object.
*/

function loadGoogleSheet_part2 ( data ) {

  // Grab data values array from Google Sheets data object:
  
  var values = data.values;

  // We expect header in first row, with column names:
  
  var header = values[ 0 ];
 
  // Which columns contains the desired output columns?: 
  
  var species_colindex = findColIndex( header, 'Species' );
  //var site_name_colindex = findColIndex( header, 'Site Name' );
  var site_id_colindex = findColIndex( header, 'Site ID' );
  var origin_colindex = findColIndex( header, 'Origin' );
  //var change_colindex = findColIndex( header, 'Biomass Change %' );
  var dti_colindex = findColIndex( header, 'Drought Tolerance Index' );
  var method_colindex = findColIndex( header, 'Drought Method' );
  var metric_colindex = findColIndex( header, 'Performance Metric' );
  var pub_colindex = findColIndex( header, 'Publication' );

  // Loop through each row of data:
 
  for ( var i = 1; i < values.length; i++ ) {

    var row = values[ i ];

    // Get the data values we are looking for:
   
    var species = row[ species_colindex ];
    //var site_name = row[ site_name_colindex ];
    var site_id = row[ site_id_colindex ];
    var origin = row[ origin_colindex ];
    //var biomass_change_percent = row[ change_colindex ];
    var drought_tolerance_index = row[ dti_colindex ];
    var drought_method = row[ method_colindex ];
    var performance_metric = row[ metric_colindex ];
    var publication = row[ pub_colindex ];
 
    // Make sure biomass change percent is a number (floating-point):
    // 
    //biomass_change_percent = parseFloat( biomass_change_percent ); 
   
    // Make sure drought tolerance index is a number (floating-point): 
   
    drought_tolerance_index = parseFloat( drought_tolerance_index ); 
      
    // Store these data in our global SPECIES object...

    // Has this species been encountered yet?; if not, initialize object:
    
    if ( ! ( species in SPECIES ) ) {
      SPECIES[ species ] = {};
      SPECIES[ species ][ 'data' ] = []; // array of populations 
    }    
  
    // Origin? "native" or "non-native":
    
    SPECIES[ species ][ 'origin' ] = origin;

    // Population data; some populations are named, some not:
   
    var data = {};

    //
    //if ( site_name ) {
    //  data[ 'site_name' ] = site_name;
    //} 

    if ( site_id ) {
      data[ 'site_id' ] = site_id;
    }
   
    //data[ 'biomass_change_percent' ] = biomass_change_percent;
    
    data[ 'drought_tolerance_index' ] = drought_tolerance_index; 

    // Drought method?, performance metric?, publication?:
   
    data[ 'drought_method' ] = drought_method;
    data[ 'performance_metric' ] = performance_metric;
    data[ 'publication' ] = publication;

    // Add population object to data array:
   
    SPECIES[ species ][ 'data' ].push( data );
  } 

  // Now load the information about each source population site ID:
  
  loadGoogleSheet_part3();
  
  return;

} // loadGoogleSheet_part2()


/*
loadGoogleSheet_part3()
Loads site data with site name and lat/lng associated with each source
population that was sampled for drought tolerance data. Stores result
in a global SITES object. The site_id (Site ID) column provides link
to the SPECIES object, which contains the same column.
*/

function loadGoogleSheet_part3 () {

  // First load the "Sites" sheet; this contains the biomass change percent
  // for each species population that was sampled: 

  var sheet_title = 'Sites';

  // URL to data; this returns JSON via Google Sheets API:

  var sheets_url = google_sheets_baseurl + spreadsheet_id + '/values/' + sheet_title + '?key=' + google_api_key;

  jQuery.ajax(
    {
      async: true,
      url: sheets_url,
      dataType: 'json',
      success: function ( response ) {
        sites_sheet = response;
        loadGoogleSheet_part4( response );
      },
      error: function ( response, status_str ) {
        alert( 'Cannot load data!' );
        console.info( status_str );
        console.info( response.responseText );
      }
    }
  );

  return;

} // loadGoogleSheet_part3();


/*
loadGoogleSheet_part4()
Once the Google Sheet has been read in part3, this loads the site info into
a global SITES object.
*/

function loadGoogleSheet_part4 ( data ) {

  // Grab data values array from Google Sheets data object:

  var values = data.values;

  // We expect header in first row, with column names:

  var header = values[ 0 ];

  // Which columns contains the desired output columns?: 

  var island_colindex = findColIndex( header, 'Island' ); 
  var site_id_colindex = findColIndex( header, 'Site ID' );
  var site_name_colindex = findColIndex( header, 'Site Name' );

  // Which columns contain latitude and longitude coordinates?:

  var lat_index = findLatIndex( header );
  var lon_index = findLonIndex( header );

  // Loop through each row of data:

  for ( var i = 1; i < values.length; i++ ) {

    var row = values[ i ];

    // Get the data values we are looking for:

    var island = row[ island_colindex ];
    var site_id = row[ site_id_colindex ];
    var site_name = row[ site_name_colindex ];
    var lat = row[ lat_index ];
    var lon = row[ lon_index ];

    // Make sure lat/lng are numbers (floating-point):

    lat = parseFloat( lat );
    lon = parseFloat( lon );

    // Store these data in our global SITES object...

    SITES[ site_id ] = {};
    SITES[ site_id ][ 'island' ] = island;
    SITES[ site_id ][ 'site_name' ] = site_name;
    SITES[ site_id ][ 'lat' ] = lat;
    SITES[ site_id ][ 'lon' ] = lon;
  }

  // Now that all data have been read in, enable the species pull-down menu
  // so that the user can begin interacting with the page:

  document.getElementById( 'species' ).disabled = false;

  // And turn off the loading icon to indicate that download is finished:
 
  jQuery( '#loading' ).hide();
 
  return;

} // loadGoogleSheet_part4()


/*
loadMap()
Loads the Google Maps API at the specified bounding box and zoom level.
*/

function loadMap () {
 
  // Set map options; center on main Hawaiian islands: 

  var bounds = array2bounds( BOUNDS[ 'MHI' ] );
  var center = bounds.getCenter();
  var zoom = 8; 

  var map_options = {
    center: center,
    zoom: zoom,
    mapTypeId: google.maps.MapTypeId.TERRAIN,
    scaleControl: true,
    /*
    panControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    scaleControlOptions: {
      position: google.maps.ControlPosition.RIGHT_BOTTOM
    },
    */
    mapTypeControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT,
      style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
    },
    streetViewControl: false,
    fullscreenControl: false
  };

  map = new google.maps.Map( document.getElementById( 'map' ), map_options );

  map.fitBounds( bounds );

  // Turn on the rainfall overlay by default:
 
  toggleOverlay( true ); 
 
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

  map.enableKeyDragZoom(
    {
      key: keyToDrag,
       boxStyle: { border: "medium solid yellow", backgroundColor: "transparent", opacity: 1 },
      paneStyle: { backgroundColor: "black", opacity: 0.1 }
    }
  );

  // Move the "Location unknown" warning on top of the map:

  jQuery( '#site_unknown' ).position(
    {
      my: 'center center',
      at: 'center center+110',
      of: '#map'
    }
  );

  return;

} // loadMap()


/*
toggleOverlay()
Toggles on/off the KML overlay of statewide annual mean rainfall from the
Rainfall Atlas.
*/

function toggleOverlay ( show_overlay ) {

  // Add the overlay:
 
  if ( show_overlay ) { 
    var preserve_viewport = true; // do not zoom to KML extent
    addOverlayKML(
      'https://kaseybarton.github.io/kml/rainfall_atlas_of_hawaii_statewide_nolegend.kmz',
      preserve_viewport
    );
  }

  // Remove the overlay:
  
  else {
    clearOverlayKML();
  }

  // Toggle the legend:
  
  toggleOverlayLegend ( show_overlay );
 
  return;

} // toggleOverlay()


/*
toggleOverlayLegend()
Toggles on/off the legend image of statewide annual mean rainfall.
*/

function toggleOverlayLegend ( show_legend ) {

  // Add the legend:
 
  if ( show_legend ) {
    jQuery( '#overlay_legend_div' ).show();
  }
 
  // Remove the legend: 

  else {
    jQuery( '#overlay_legend_div' ).hide();
  }
  
  return;

} // toggleOverlayLegend()


/*
updateRainUnit()
Updates the units of the annual mean rainfall legend between mm and inches.
*/

function updateRainUnit ( use_mm ) {

  var legend_in = '/kml/legends/MeanRFAnn_State_in_legend_noborder.png';
  var legend_mm = '/kml/legends/MeanRFAnn_State_mm_legend_noborder.png';

  var legend_src;

  if ( use_mm ) {
    legend_src = legend_mm;
  }
  else {
    legend_src = legend_in;
  }

  document.getElementById( 'overlay_legend' ).src = legend_src;

  return;

} // updateRainUnit()


/*
zoomToIslands()
Zooms to total bounds of the islands in the supplied list.
*/

function zoomToIslands ( islands ) {

  // If no islands supplied, zoom back out to main Hawaiian islands:
  
  if ( !islands
    || islands.length == 0 ) {
    islands = [ 'MHI' ]; 
  }

  var bounds;

  // If all 3 islands included, zoom statewide:
  
  if ( islands.indexOf( 'Hawaiʻi' ) != -1
    && islands.indexOf( 'Kauaʻi' ) != -1
    && islands.indexOf( 'Oʻahu' ) != -1 ) {
    bounds = array2bounds( BOUNDS[ 'MHI' ] );
    map.fitBounds( bounds );
    return;
  }

  for ( var i = 0; i < islands.length; i++ ) {

    var island = islands[ i ];

    // Get the bounds of this island:
    
    var this_bounds = array2bounds( BOUNDS[ island ] );

    // If bounds exist, extend bounds:
  
    if ( bounds ) {
      bounds.union( this_bounds );
    } 

    // Otherwise, initialize bounds with this bounds:
    
    else {
      bounds = this_bounds;
    } 
  }

  // Fit map to the total bounds:
 
  map.fitBounds( bounds );

  // Big Island zoom is not quite far enough by default:
 
  if ( islands.length == 1
    && islands[ 0 ] == 'Hawaii' ) {
    map.setZoom( map.getZoom() + 1 );
  } 

  return;

} // zoomToIslands()


/*
labelSpecies()
Labels which species is currently displayed on the gauge and map by putting
text below the gauge title. Otherwise, this label is an empty space (&nbsp;).
*/

function labelSpecies ( species ) {

  var label = '&nbsp';

  if ( species ) {
    label = species;
  }

  // Set the label:
 
  document.getElementById( 'species_label' ).innerHTML = label; 
  
  return;

} // labelSpecies()


/*
labelSite()
Labels which site is currently displayed on the gauge and map by putting
text below the gauge title. Otherwise, this label is an empty space (&nbsp;).
*/

function labelSite ( site_id ) {

  var label = '&nbsp';

  if ( site_id ) {
    var site_name = SITES[ site_id ][ 'site_name' ];

    if ( site_name.toLowerCase() == 'unknown' ) {

      var island = SITES[ site_id ][ 'island' ];
      
      if ( island.toLowerCase() == 'unknown' ) {
        label = site_name + ' sites';
      }
      else {
        if ( island == 'Hawaiʻi' ) {
          island += ' Island';
        }
        label = site_name + ' ' + island + ' sites';
      }
    }
    else {
      label = site_name + ' site';
    }
  }

  // Set the label; this is called species but serves both species and site
  // labels:

  document.getElementById( 'species_label' ).innerHTML = label;

  return;

} // labelSite()


/*
incrementSpecies()
Increments species pull-down. Will increment forward by one unless direction is
negative, in which case it will increment backwards by one.
*/

function incrementSpecies ( direction ) {

  var num_species = document.getElementById( 'species' ).length;
  var old_index = document.getElementById( 'species' ).selectedIndex;

  var new_index;

  // Move backwards?:
  
  if ( direction
    && direction < 0 ) {
    new_index = old_index - 1;
  }

  // Move forwards?:
  
  else {
    new_index = old_index + 1;
  } 

  // Make sure new index is in bounds:

  if ( new_index < 0 ) {
    new_index = 0; // do not go backwards beyond first index
  }
  else if ( new_index > num_species - 1 ) {
    new_index = 0; // return to beginning after reaching end
  }
  
  // Set the new selected index:
 
  document.getElementById( 'species' ).selectedIndex = new_index; 
 
  // Trigger the "onChange" event handler on the species select list:
 
  jQuery( '#species' ).change(); 
  
  return;

} // incrementSpecies()


/*
incrementSite()
Increments site pull-down. Will increment forward by one unless direction is
negative, in which case it will increment backwards by one.
*/

function incrementSite ( direction ) {

  var num_sites = document.getElementById( 'site' ).length;
  var old_index = document.getElementById( 'site' ).selectedIndex;

  var new_index;

  // Move backwards?:

  if ( direction
    && direction < 0 ) {
    new_index = old_index - 1;
  }

  // Move forwards?:

  else {
    new_index = old_index + 1;
  }

  // Make sure new index is in bounds:

  if ( new_index < 0 ) {
    new_index = 0; // do not go backwards beyond first index
  }
  else if ( new_index > num_sites - 1 ) {
    new_index = 0; // return to beginning after reaching end
  }

  // Set the new selected index:

  document.getElementById( 'site' ).selectedIndex = new_index;

  // Trigger the "onChange" event handler on the site select list:

  jQuery( '#site' ).change();

  return;

} // incrementSite()
