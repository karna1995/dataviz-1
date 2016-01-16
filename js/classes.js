/**
 * Classes for Dataviz app.
 * 
 * @author Prahlad Yeri (prahladyeri@yahoo.com)
 * */

/**
 * Constructor for the Filter object.
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

    this.numOper = "all"; //all, sum, count, distinct count.
    this.numMatcher = "range"; //range, gte, lte.
    this.numValues = [];//only 0th element, except in case of range.
    this.numIncludeNull = false; //include null values.
    this.numIsDistinct = false; //whether to prefix field with distinct clause in group queries.

    this.dateMatcher = "relative"; //relative, range, gte, lte.
    this.dateRelativeType = "days"; //days, weeks, months, quarters, years.
    this.dateValues = []; //only 0th element, except in case of range.
    this.dateIncludeNull = false; //include null values.

    //this.condition = ""; //where, having
    //this.clause = ""; //x=1
    return this;
}

/**
 * Constructor for the Field object.
 * 
 * @param name Name of the field.
 * @param dataType Data type of the field.
 * */
function Field(name, dataType) {
    this.name = name;
    this.dataType = dataType;
    return this;
}
