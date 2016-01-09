/**
 * Classes for Dataviz app.
 * 
 * @author Prahlad Yeri (prahladyeri@yahoo.com)
 * */

/**
 * Constructor for the Filter object
 * 
 * @param name Name of the field.
 * @param type Type of filter - number/string/date.
 * */
function Filter = function(name, type) {
    this.name = name;
    this.type = type;
    this.condition = ""; //where/having
    this.clause = ""; //x=1
    this.exec = function() {
        //TODO: Calculate the where clause here
    }
    return this;
}
