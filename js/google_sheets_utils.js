/*
 * Barton Lab Google Sheets Utilities
 *
 * Release Date: September 2019
 *
 * Author: John Maurer <jmaurer@hawaii.edu>
 *
 * This file provides map utilities for working with data via the Google Sheets
 * JavaScript API. Used for research pages in the lab of Kasey E. Barton
 * <kbarton@hawaii.edu> at the University of Hawaii at Manoa Department of
 * Botany.
 * */


/* Global variables: */

var google_api_key = 'AIzaSyAlwWZ8Fk0vhhyiNydkjrgU1HhbuEWPv3k'; // Allows us to use Google Sheets API
var google_sheets_baseurl = 'https://sheets.googleapis.com/v4/spreadsheets/';
var sheet_titles = {};
var sheet_ids = {};

/*
getSpreadsheetProperties()
Runs the Google Sheets sheets.properties request to determine the sheet
title (e.g., "Sheet1") and sheet identifier (a.k.a., gid) of the first
sheet in the spreadsheet document. Ignores all subsequent sheets if this
is a multi-sheet spreadsheet document. Returns the "properties" object.
*/

function getSpreadsheetProperties ( spreadsheet_id ) {

  var sheet_properties;

  // Construct the Google Sheets API sheets.properties URL to gather
  // further details about the first sheet in the document:

  var sheets_properties_url = google_sheets_baseurl + spreadsheet_id + '?key=' + google_api_key + '&fields=sheets.properties';

  // Run the above properties URL and return the sheet title and id:

  jQuery.ajax(
    {
      async: false,
      url: sheets_properties_url,
      dataType: 'json',
      success: function ( response ) {

        // Grab the details for the first sheet; all subsequent sheets
        // (if any) are ignored:

        var sheet = response.sheets[ 0 ];

        // Grab the "properties" object:

        sheet_properties = sheet[ 'properties' ];
      },
      error: function ( response, status_str ) {
        alert( 'Cannot load data!' );
        console.info( status_str );
        console.info( response.responseText );
      }
    }
  );

  return sheet_properties;

} // getSpreadsheetProperties()


/*
getSheetTitle()
Gets the title (e.g., "Sheet1") associated with the first available sheet
in the specified Google Sheets spreadsheet identifier. Unfortunately, to
get data values using the Google Sheets API, you must specify the sheet
id, even if the document only contains a single sheet. Also unfortunate is
the requirement to specify the free-text sheet title in the data request
rather than the numeric sheet id (a.k.a. gid).
*/

function getSheetTitle ( spreadsheet_id ) {

  // Have we already gotten this sheet title earlier?:

  if ( typeof( sheet_titles[ spreadsheet_id ] ) != 'undefined'
    && sheet_titles[ spreadsheet_id ] ) {
    var sheet_title = sheet_titles[ spreadsheet_id ];
    return sheet_title;
  }

  // If not, look it up using the Google Sheets API:

  var sheet_properties = getSpreadsheetProperties( spreadsheet_id );

  // Get the sheet title (e.g., "Sheet1") and id (e.g., 791785575):

  var sheet_title = sheet_properties[ 'title' ];
  var sheet_id = sheet_properties[ 'sheetId' ];

  // Add the sheet title to our global object for subsequent access
  // without further look-ups:

  sheet_titles[ spreadsheet_id ] = sheet_title;

  return sheet_title;

} // getSheetTitle()


/*
getSheetId()
Gets the id (e.g., "1115947088", a.k.a. "gid") associated with the first
available sheet in the specified Google Sheets spreadsheet identifier. This
is a numeric identifier that is assigned automatically by Google Spreadsheet
and can be gleaned from the URL when viewing a sheet:

https://docs.google.com/spreadsheets/d/1a8Rlm4E_yGrSAp14G8EhwixK3mRKLQSeJIXU174Urww/edit#gid=1390785662

In the above example, the sheet id (gid) is 1390785662. This differs from the
sheet title (e.g., "Sheet1"), which is any free-text name the user assigns to
the sheet in the lower tab of Google Spreadsheets.
*/

function getSheetId ( spreadsheet_id ) {

  // Have we already gotten this sheet id earlier?:

  if ( typeof( sheet_ids[ spreadsheet_id ] ) != 'undefined'
    && sheet_ids[ spreadsheet_id ] ) {
    var sheet_id = sheet_ids[ spreadsheet_id ];
    return sheet_id;
  }

  // If not, look it up using the Google Sheets API:

  var sheet_properties = getSpreadsheetProperties( spreadsheet_id );

  // Get the sheet title (e.g., "Sheet1") and id (e.g., 791785575):

  var sheet_title = sheet_properties[ 'title' ];
  var sheet_id = sheet_properties[ 'sheetId' ];

  // Add the sheet id to our global object for subsequent access
  // without further look-ups:

  sheet_ids[ spreadsheet_id ] = sheet_id;

  return sheet_id;

} // getSheetId()


/*
getSpreadsheetCols()
Returns hash whose keys are column labels (e.g., "Island", "Site", "Latitude")
and whose values are column ids (A, B, C, D, etc.) in the Google Sheets
spreadsheet identified by spreadsheet_id. Since no sheet_title is specified,
it will default to the first sheet in the document.
*/

function getSpreadsheetCols ( spreadsheet_id ) {

  var sheet_cols = {};

  // Construct the Google Sheets API URL to grab the header (first) row of values:

  var sheets_url = google_sheets_baseurl + spreadsheet_id + '/values/!1:1?key=' + google_api_key;

  jQuery.ajax(
    {
      async: false,
      url: sheets_url,
      dataType: 'json',
      success: function ( response ) {

        var values = response[ 'values' ][ 0 ];

        for ( var i = 0; i < values.length; i++ ) {
          var col_name = values[ i ];
          var col_id = getColId( i );
          sheet_cols[ col_name ] = col_id;
        }

      },
      error: function ( response, status_str ) {
        alert( 'Cannot load data!' );
        console.info( status_str );
        console.info( response.responseText );
      }
    }
  );

  return sheet_cols;

} // getSpreadsheetCols()


/*
getColId()
Returns Google Sheets API column identifier for a spreadsheet column at the
specified index number (zero-based). Google Sheets identifies the columns
according to upper-case letters and does not easily allow us to use the
column names in a header row to query. Thus, we are stuck figuring out the
letter associated with each column index ourselves. This proceeds from
A through Z (upper-case only), then AA through AZ, then BA through BZ, etc.
*/

function getColId ( index ) {

  var col_id;

  // There are 26 letters in the alphabet. This gives us zero-based index values
  // ranging from 0 to 25:

  var col_id = String.fromCharCode( 'A'.charCodeAt() + ( index % 25 ) );

  // If index goes beyond 25, then we need to pre-pend the above identifier with
  // the next alphabet letter (e.g., A-Z becomes AA-AZ, then BA-BZ, then CA-CZ etc.:

  var increment = parseInt( index / 25 );

  if ( increment ) {
    var increment_id = String.fromCharCode( 'A'.charCodeAt() + ( increment - 1 ) );
    col_id = increment_id + col_id;
  }

  return col_id;

} // getColId()


/*
findLatIndex()
Searches Google Sheets header row for a column named "Latitude" or "Lat"
(case-insensitive) and returns the array index.
*/

function findLatIndex ( header ) {

  for ( var i = 0; i < header.length; i++ ) {

    var col_name = header[ i ];

    if ( col_name.toLowerCase() == 'latitude'
      || col_name.toLowerCase() == 'lat' ) {
      return i;
    }
  }

  return;

} // findLatIndex()


/*
findLonIndex()
Search Google Sheets header row for a column named "Longitude" or "Lon"
or "Lng" or "Long" (case-insensitive) and returns the array index.
*/

function findLonIndex ( header ) {

  for ( var i = 0; i < header.length; i++ ) {

    var col_name = header[ i ];

    if ( col_name.toLowerCase() == 'longitude'
      || col_name.toLowerCase() == 'lon'
      || col_name.toLowerCase() == 'long'
      || col_name.toLowerCase() == 'lng' ) {
      return i;
    }
  }

  return;

} // findLonIndex()


/*
 * findColIndex()
 * Searches Google Sheets header row for a column named col_name
 * (case-insensitive) and returns the array index.
 * */

function findColIndex ( header, col_name ) {

  for ( var i = 0; i < header.length; i++ ) {

    var this_col_name = header[ i ];

    if ( col_name.toLowerCase() == this_col_name.toLowerCase() ) {
      return i;
    }
  }

  return;

} // findColIndex()
