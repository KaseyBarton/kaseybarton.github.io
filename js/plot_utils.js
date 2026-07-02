/*
Barton Lab Map Utilities 

Release Date: January 2014

Author: John Maurer <jmaurer@hawaii.edu>

This file provides map utilities for plotting data via the Google Charts API
(Google Visualization API, more specifically). Used for research pages in the
lab of Kasey E. Barton <kbarton@hawaii.edu> at the University of Hawaii at Manoa
Department of Botany.
*/

// Load the Google Charts API:

google.charts.load(
  'current',
  {
    packages: [ 'corechart', 'bar' ]
  }
);

//google.load( 'visualization', '1', { packages: [ 'BarChart' ] } );
//google.setOnLoadCallback( loadChart );

// After the API has loaded, call our loadChart() function:
 
google.charts.setOnLoadCallback( loadChart );

// Chart object:

var chart;

// Chart options:

var options = {
  title: '',
  series: [ { 'color': 'gray' } ],
  legend: {
    position: 'none'
  },
  tooltip: {
    isHtml: true
  },
  animation: {
    startup: true,
    duration: 500
  },
  hAxis: {},
  vAxis: {
    textStyle: {
      fontSize: 11 
    }
  }
};

// Default plot selections:

var selectedIsland = '';
var selectedVariable = '';
var selectedOrderBy = 'variable'; // or 'Site'
var selectedOrderDir = 'ASC'; // or 'DESC'


/*
loadChart()
This loads (or re-loads) the Google Chart using data from the Google Sheets 
spreadsheet. It either loads a bar chart or a scatter plot. Can also show
error bars.
*/

function loadChart () {

  // Relies on global variable defining Google Sheets spreadsheet identifier to use:

  if ( typeof( spreadsheet_id ) == 'undefined' ) {
    return;
  }

  // Get details about this spreadsheet:

  var sheet_properties = getSpreadsheetProperties( spreadsheet_id );

  // Get the sheet title (e.g., "Sheet1") and id (e.g., 791785575):

  var sheet_title = sheet_properties[ 'title' ];
  var sheet_id = sheet_properties[ 'sheetId' ];

  // Get the column ids and labels from the header (first) row:

  var sheet_cols = getSpreadsheetCols( spreadsheet_id, sheet_id ); 

  // Choose first listed island and variable as our defaults:

  if ( !selectedIsland
    && document.getElementById( 'island' ) ) {
    selectedIsland = document.getElementById( 'island' )[ 1 ].value;
  }

  if ( !selectedVariable
    && document.getElementById( 'variable' ) ) {
    selectedVariable = document.getElementById( 'variable' )[ 1 ].value;
  }

  var variable = selectedVariable;

  // Scatterplot?:

  var chart_type = 'plain';
  var variable2 = '';

  if ( variable.match( /vs\./ ) ) {
    var variables = variable.split( ' vs. ' );
    variable = variables[ 0 ];
    variable2 = variables[ 1 ];
    chart_type = 'scatterplot';
  }

  // Error bars?:

  var variable3 = '';

  if ( variable.match( /\|/ ) ) {
    var variables = variable.split( '|' );
    variable = variables[ 0 ];
    variable2 = variables[ 1 ];
    variable3 = variables[ 2 ]; 
    options.interval = {};
    options.interval[ variable2 ] = { 'style': 'bars' };
    options.interval[ variable3 ] = { 'style': 'bars' };
    chart_type = 'errorbars';
  }

  // Set chart title based on selected location and variable:

  var title = '';

  var island = selectedIsland;

  if ( !island
    || island.toLowerCase() == 'all' ) {
    island = null;
    title = 'State of Hawaii';
  }
  else {
    title = island;
  }

  title += ': ' + variable;

  if ( chart_type == 'scatterplot' ) {
    title += ' vs. ' + variable2;
  }

  options.title = title;
 
  // Sort order?:

  var orderBy = selectedOrderBy;

  if ( !orderBy
    || orderBy.toLowerCase() == 'variable' ) {
    orderBy = sheet_cols[ variable ];
  }
  else {
    orderBy = sheet_cols[ selectedOrderBy ];
  }
 
  var orderDir = selectedOrderDir;
  
  if ( !orderDir ) {
    orderDir = 'ASC';
  }
 
  // Define SQL query to Google Sheets spreadsheet:

  var query = 'SELECT ' + sheet_cols[ 'Site' ] + ', ' + sheet_cols[ 'Island' ] + ', ' + sheet_cols[ variable ]; 

  if ( variable2 ) {
    query += ', ' + sheet_cols[ variable2 ];
  }

  if ( variable3 ) {
    query += ', ' + sheet_cols[ variable3 ];
  }

  query += ' ';

  if ( island ) {
    query += 'WHERE ' + sheet_cols[ 'Island' ] + " = '" + island + "' ";
  }

  query += 'ORDER BY ' + orderBy + ' ' + orderDir; 

  // Submit the SQL query to Google Sheets:

  var queryText = encodeURIComponent( query );
  var gvizQuery = new google.visualization.Query( 'https://docs.google.com/spreadsheets/d/' + spreadsheet_id + '/gviz/tq?gid=' + sheet_id + '&headers=1&tq=' + queryText );

  gvizQuery.send(
    function( response ) {

      // Get the data response:

      var data = response.getDataTable();

      // Add a column to color-code each island separately:

      data = colorByIsland( data, chart_type );

      // Need to add a column "role" of type "interval" for columns denoting
      // +/- error quantities:

      if ( chart_type == 'errorbars' ) {
        data.setColumnProperty( 2, 'role', 'interval' );
        data.setColumnProperty( 3, 'role', 'interval' );
      }

      // Scatterplot?:

      if ( chart_type == 'scatterplot' ) {
        data = addSiteToTooltip( data ); // scatterchart does not include site by default
        chart = new google.visualization.ScatterChart( document.getElementById( 'chart' ) );
        options.hAxis.title = variable;
        options.vAxis.title = variable2;
      }

      // Bar chart?:

      else {
        chart = new google.visualization.BarChart( document.getElementById( 'chart' ) );
        options.hAxis.title = null;
        options.vAxis.title = null;
      }

      // Draw the Google Chart:

      chart.draw( data, options );

      // Update the link to allow the user to download this chart as a static
      // PNG image:

      document.getElementById( 'png' ).innerHTML = '&nbsp;<a href="' + chart.getImageURI() + '" target="_blank" title="Tip: Resize browser first to get image size you want...">Printable version (PNG)</a>';
    }
  ); // gvizQuery.send()

} loadChart() 


/*
colorByIsland()
Colors each island separately by creating a separate data column with a "role"
of "style", which signals Google Charts to use this as a styler.
*/

function colorByIsland ( data, chart_type ) {

  // Add a new column to the data table to store the color; this is a "style"
  // role in Google Charts:

  data.addColumn( { type: 'string', role: 'style' } );

  // Loop through each row of data; this will be:
  // column 0: Site
  // column 1: Island
  // column 2: Variable (e.g. rainfall)
  // columns x-y: more variables...
  // column z: Style (null)
 
  for ( var i = 0; i < data.getNumberOfRows(); i++ ) {

    var island = data.getValue( i, 1 );

    // Set "Style" color based on island:

    var styleIndex = data.getNumberOfColumns() - 1;

    var color = '';

    if ( island == 'Big Island' ) {
      color = '#66c2a5';
    }
    else if ( island == 'Kauai' ) {
      color = '#fc8d62';
    }
    else if ( island == 'Maui' ) {
      color = '#8da0cb';
    }
    else if ( island == 'Maui County' ) {
      color = '#8da0cb';
    }
    else if ( island == 'Molokai' ) {
      color = '#a6d854';
    }
    else if ( island == 'Oahu' ) {
      color = '#e78ac3';
    }

    if ( chart_type == 'scatterplot' ) {
      data.setCell( i, styleIndex, color );
    }
    else {
      data.setCell( i , styleIndex, 'bar { color: ' + color + ' }' ); // to make intervals a different color
    }
  }

  // Remove the Island column since we don't want this to interfere
  // with our Google Chart plot as more data to display:
 
  data.removeColumn( 1 ); // remove island

  return data;

} // colorByIsland()


/*
addSiteToTooltip()
Adds a new column to the data table with a "role" of type "tooltip". This
signals to Google Charts that it should use the string or html value in this
column as the tooltip for that cell when it is hovered over on the plot.
We do this for scatterplots since by default it does not include the site
name, unfortunately (bar chart does, however).
*/
 
function addSiteToTooltip ( data ) {

  // Add a new column to the data table to store the tooltip:

  data.addColumn( { type: 'string', role: 'tooltip', p: { html: true } } );

  // Loop through each row of data; this will be:
  // column 0: Site
  // column 1: Variable1 (e.g. rainfall)
  // column 2: Variable2 (e.g. elevation)
  // column 3: Style (null)
 
  for ( var i = 0; i < data.getNumberOfRows(); i++ ) {

    var site = data.getValue( i, 0 );
    var var1 = data.getValue( i, 1 );
    var var2 = data.getValue( i, 2 );

    var var1_label = data.getColumnLabel( 1 );
    var var2_label = data.getColumnLabel( 2 );

    if ( !var1_label.match( /(mm)/ )
      && var1 ) {
      var1 = var1.toFixed( 3 );
    }

    if ( !var2_label.match( /(mm)/ )
      && var2 ) {
      var2 = var2.toFixed( 3 );
    }

    // Set tooltip based on all of the above:

    var tooltipIndex = data.getNumberOfColumns() - 1;

    var tooltip = '<div style="padding: 5px;">'
      + '<b>' + site + '</b><br/>'
      + var1_label + ': <b>' + var1 + '</b><br/>'
      + var2_label + ': <b>' + var2 + '</b>'
      + '</div>';

    data.setCell( i, tooltipIndex, tooltip );
  }

  // Remove the Site column since we don't want this to interfere
  // with our Google Chart scatter plot as more data to display:
  
  data.removeColumn( 0 ); // remove "Site"

  return data;

} // addSiteToTooltip()


/*
updateIsland()
Simply updates a global "selectedIsland" variable with the island value selected
from the "island" select list. It then re-loads the chart.
*/

function updateIsland ( island ) {

  selectedIsland = island;
  loadChart();
  document.getElementById( 'island' ).selectedIndex = 0;

} // updateIsland()


/*
updateVariable()
Simply updates a global "selectedVariable" variable with the variable value
selected from the "variable" select list. It then re-loads the chart.
*/

function updateVariable ( variable ) {

  selectedVariable = variable;
  loadChart();
  document.getElementById( 'variable' ).selectedIndex = 0;

} // updateVariable()


/*
updateOrderBy()
Simply updates a global "selectedOrderBy" variable with the value selected
from the "orderBy" select list. It then re-loads the chart.
*/

function updateOrderBy ( orderBy ) {

  selectedOrderBy = orderBy;
  loadChart();
  document.getElementById( 'orderBy' ).selectedIndex = 0;

} // updateOrderBy()


/*
updateOrderDir()
Simply updates a global "selectedOrderDir" variable with the value selected
from the "orderDir" select list. It then re-loads the chart.
*/
 
function updateOrderDir ( orderDir ) {

  selectedOrderDir = orderDir;
  loadChart();
  document.getElementById( 'orderDir' ).selectedIndex = 0;

} // updateOrderDir()
