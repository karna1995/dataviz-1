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
function Filter(name, type) {
    this.name = name;
    this.type = type;
    this.html = "";
    this.stringMatcher = "general"; //general/wildcard
    //this.stringGeneral = {}; //object of string->general tab filter values and their checked status: foo:true
    this.stringGeneral = []; //list of string->general tab filter values
    this.stringGeneralExclude = false;
    this.stringWcValue = ""; //wildcard value
    this.stringWcIncludeAll = true; //whether to include all values if value is empty
    this.stringWcType = ""; //contains or startswith or endswith or equals
    this.stringWcExclude = false;
    
    this.condition = ""; //where/having
    this.clause = ""; //x=1
    return this;
}
