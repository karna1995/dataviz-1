/**
 * A bunch of basic javascript utilities and helper functions.
 * 
 * @author Prahlad Yeri (prahladyeri@yahoo.com)
 * */

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
 * Shows a bootstrap popup alert on the center of screen.
 * Depends on jQuery and Bootstrap.
 * */
function bspopup(options, success) {
    if ($(".popupBox").length == 0) {
        $.get("js/modals.dat", function(data){
            $('body').append(data);
            bspopup(options, success);
            return;
        });
    }
    
	//text, type, title
	if (typeof(options)=='string') {
		text = options;
	}
	else {
		text = options.text; //.replace("\n","<br>");
	}
	
	type = options.type;
	title = options.title;
	//if (obj.delay!=undefined) delay = obj.delay;
	if (type==undefined) type='text';
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
