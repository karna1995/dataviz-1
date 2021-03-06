/**
 * A bunch of basic javascript utilities and helper functions.
 * Depends on jQuery, Bootstrap.
 * 
 * @author Prahlad Yeri (prahladyeri@yahoo.com)
 * */
 

//http://stackoverflow.com/questions/2540969/remove-querystring-from-url 
function getPathFromUrl(url) {
  return url.split("?")[0];
}
 
/**
 * Get the value of a querystring (http://gomakethings.com/how-to-get-the-value-of-a-querystring-with-native-javascript/)
 * 
 * @param  {String} field The field to get the value of
 * @param  {String} url   The URL to get the value from (optional)
 * @return {String}       The field value
 */
var getQueryString = function ( field, url ) {
	if (url==undefined) {
		url = window.location.href;
	}
    var href = url ? url : window.location.href;
    var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
    var string = reg.exec(href);
    return string ? string[1] : null;
};
 
/**
 * Validates a date as per European format (yyyy-mm-dd).
 * 
 * @return Empty string if valid, error message otherwise.
 * */
function checkDate(theDate)
{
    //var re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/; //British Format
    var re = /^(\d{4})-(\d{1,2})-(\d{1,2})$/; //American Format
    var errorMsg = "";
    var allowBlank = true;
    var minYear = 1000;
    //var maxYear = (new Date()).getFullYear();
    var maxYear = 9999;
    
    if(theDate.length > 0) {
      if(regs = theDate.match(re)) {
        if(regs[3] < 1 || regs[3] > 31) {
          errorMsg = "Invalid value for day: " + regs[3];
        } else if(regs[2] < 1 || regs[2] > 12) {
          errorMsg = "Invalid value for month: " + regs[2];
        } else if(regs[1] < minYear || regs[1] > maxYear) {
          errorMsg = "Invalid value for year: " + regs[1] + " - must be between " + minYear + " and " + maxYear;
        }
      } else {
        errorMsg = "Invalid date format: " + theDate;
      }
    } else if(!allowBlank) {
      errorMsg = "Empty date not allowed!";
    }
    return errorMsg;

    //~ if(errorMsg != "") {
      //~ return false;
    //~ }
    //~ return true; 
}

/**
 * jQuery function to center screen
 * */
jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) + 
                                                $(window).scrollTop()) + "px");
    this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) + 
                                                $(window).scrollLeft()) + "px");
    return this;
}


/**
 * Alias to bspopup(string) dialog box.
 * */
function bsalert(message) {
    bspopup(message);
}

/**
 * Shows a bootstrap popup dialog on the center of screen.
 * Depends on jQuery and Bootstrap.
 * */
function bspopup(options, success) {
    if ($(".popupBox").length == 0) {
        $.get("js/bootui.dat", function(data){
            $('body').append(data);
            bspopup(options, success);
            return;
        });
    }
    
	//text, type, title
	if (typeof(options)=='string') {
		text = options;
        options = {type:"text", text:text};
	}
    if (options==undefined) options={};
	if (options.type==undefined) options.type='text';
	if (options.text==undefined) options.text='';
    
    var text = options.text;
	var type = options.type;
	var title = options.title;
	//if (obj.delay!=undefined) delay = obj.delay;
    var proto = '';
    if (type=='text') {
        proto = 'Generic';
    }
    else if (type=='input' || type=='radiolist') {
        proto = 'Input';
    }
    
    var theBox = $("#popupBox" + proto).clone();
    theBox.attr("id", "popupBox" + (Math.random() + "").replace(".","") )
        .removeClass("hidden");
    theBox.find(".messageText").text(text);
    if (type=='radiolist') {
        theBox.find("#txtInput").remove();
        html = '<select class="form-control">';
        for(var i=0;i<options.list.length;i++) {
            html += '<option value="' + options.list[i] + '">' + options.list[i] +  '</option>';
        }
        html += '<select>';
        theBox.find(".modal-body").append(html);
    }
    
    if (type=='text') 
    {
        if (options.button1 != undefined) {
            theBox.find("#btnClose").text(options.button1);
            theBox.find("#btnClose").click(function(){
                ev = {};
                ev.button = "button1";
                options.success(ev);
            });
        }
        if (options.button2 != undefined) {
            theBox.find(".modal-footer").append("<button id='button2' class='btn btn-default'  data-dismiss='modal'>" + options.button2 + "</button>")
            theBox.find("#button2").click(function(){
                ev = {};
                ev.button = "button2";
                options.success(ev);
            });
        }
    }
    
    if (options.success!=undefined) {
        theBox.find("#btnOK").click(function() {
            var ev = {};
            if (type=='input') {
                ev.value = theBox.find("#txtInput").val(); 
            }
            else if (type=='radiolist') {
                ev.value = theBox.find(".modal-body select").val(); 
            }
            options.success(ev);
        });
    }
    
    theBox.on("hidden.bs.modal", function(e) {
        if (options.complete!=undefined) {
            var ev = {};
            //ev.id = theBox.attr("id");
            options.complete(ev);
        }
        theBox.remove();
    });
    
    theBox.modal('show');
}

//http://stackoverflow.com/questions/985272/selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
function selectText(element) {
    var doc = document
        , text = doc.getElementById(element)
        , range, selection
    ;    
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    } else if (window.getSelection) {
        selection = window.getSelection();        
        range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}


/**
* Normalize and remove special chars from a string about to be used as a link or href.
*/  
function removeSpecialChars(text)
{
	s = text.toLowerCase();
	s = s.replace("/","");
	s = s.replace("\\","");
	s = s.replace("+","");
	s = s.replace("/","");
	s = s.replace(" ","");
	return s;
}

/**
* Quick way to return the type of an object
*/
function type(obj)
{
	return Object.prototype.toString.call(obj).slice(8,-1).toLowerCase();
}

/**
 * Array prototype to remove matched item from array
 * See http://stackoverflow.com/questions/3954438/remove-item-from-array-by-value
 * 
 * */
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

// source: http://stackoverflow.com/a/18405800/849365
// example: "{0} is dead, but {1} is alive! {0} {2}".format("ASP", "ASP.NET")
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

if (!String.prototype.capitalize) {
	String.prototype.capitalize =  function() {
		return this.replace(/^./, function(match){return match.toUpperCase()} );
	}
}
