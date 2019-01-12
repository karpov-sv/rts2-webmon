uid = 0;

getUUID = function(){
    return "_my_uuid_" + (uid++)
}

$.fn.pressEnter = function(fn) {

    return this.each(function() {
        $(this).bind('enterPress', fn);
        $(this).keyup(function(e){
            if(e.keyCode == 13)
            {
              $(this).trigger("enterPress");
            }
        })
    });
};

hideshow = function(obj){
    if(obj.is(":visible"))
        obj.slideUp();
    else if(obj.is(":hidden")){
        obj.slideDown();
        obj.removeClass('hide');
    }
}

hide = function(obj){
    if(obj.is(":visible"))
        obj.slideUp();
}

show = function(obj){
    obj.removeClass('hide');
    if(obj.is(":hidden"))
        obj.slideDown();
}

enable = function(obj){
    obj.prop('disabled', false);
}

disable = function(obj){
    obj.prop('disabled', true);
}

label = function(html, type, tooltip)
{
    var type = type || "primary";

    if(tooltip)
        return "<span class='label label-" + type + "' title='" + tooltip + "'>" + html + "</span>";
    else
        return "<span class='label label-" + type + "'>" + html + "</span>";
}

color = function(html, type)
{
    var type = type || "primary";

    return "<span class='text-" + type + "'>" + html + "</span>";
}

Updater = function(image_id, timeout){
    this.img = $(image_id);
    this.timeout = timeout;
    this.source = $(image_id).attr('src');

    this.timer = 0;

    this.img.on('load', $.proxy(this.run, this));
    this.img.on('error', $.proxy(this.run, this));

    this.run();
}

Updater.prototype.update = function(){
    if(this.img.is(":visible")){
        if(this.source.indexOf("?") > 0)
            this.img.attr('src', this.source + '&rnd=' + Math.random());
        else
            this.img.attr('src', this.source + '?rnd=' + Math.random());
    } else
        this.run();
}

Updater.prototype.run = function(){
    clearTimeout(this.timer);
    this.timer = setTimeout($.proxy(this.update, this), this.timeout);
}

popupImage = function(url, title, ok)
{
    var body = $("<div/>", {class: ""});

    image = $("<img/>", {class:"img img-responsive center-block", src:url, style:"width: 100%"}).appendTo(body);
    updater = new Updater(image, 10000);

    params = {
        title: title,
        message: body,
        onEscape: function() {},
    };

    if(ok){
        params.buttons = {
            success: {
                label: "Ok",
                className: "btn-default",
                callback: function() {}
            }
        };
    }

    bootbox.dialog(params);
}

function isEmpty(obj) {
    for(var key in obj) {
        // FIXME: better way of filtering out jsViews observables?
        if(obj.hasOwnProperty(key) && !key.startsWith('jQuery'))
            return false;
    }
    return true;
}

// Stuff for JsRender/JsViews
$.views.settings.allowCode(true);

var vars = {}; // Custom storage

$.views.helpers({
    // Create a list from arbitrary number of arguments
    list: function(...a) {return a;},
    // Shortcut for getting a status by its name
    status: function(name) {return this.root.data.status[name];},
    device_status: function(device, name) {return this.root.data.status[device][name];},
    device_status_var: function(device, name) {return this.root.data.status[device]['d'][name];},
    // Get value from our custom storage by name
    get: function(name) {return vars[name];},
    // Simple switch-case helper
    switch: function(value, ...arr) {for(var i = 0; i < arr.length; i+=2) if(value == arr[i]) return arr[i+1];},
    // Date formatter
    //date: function(unix) {return (!unix) ? '---' : new Date(unix*1000)},
    date: function(unix) {
        if (!unix)
            return '---';
        else {
            var t = moment.unix(unix);
            var dt = moment.duration(t.diff(moment()));
            return t.format('YYYY-MM-DD HH:mm:ss ZZ') + ' (' + dt.format() + ')';
        }
    },
    now: function() {return moment().unix(); },

    // Device state
    device_class: function(device)
    {
        var state = this.root.data.status[device]['state'];
        var type = this.root.data.status[device]['type'];

        console.log(device, state, type);

        if((state & 0x000f0000) == 0x00040000)
            return "text-warning bg-warning";
        else if((state & 0x000f0000))
            return "text-danger bg-danger";
    }
});

$.views.tags({
    // Generate a value display label data-linked to status field with given name
    status: function(name, aclass) {
        aclass = (typeof aclass === 'undefined') ? '' : aclass;
        return '<span class="label label-primary '+aclass+'" style="margin-right: 0em" data-link="~root.status.' + name + '"> - </span>';
    },
    device_var: function(device, name, aclass) {
        aclass = (typeof aclass === 'undefined') ? '' : aclass;
        return '<span data-link="~root.status.' + device + '^' + name + '" class="' + aclass + '"> - </span>';
    },
    device_status_var: function(device, name, aclass) {
        aclass = (typeof aclass === 'undefined') ? '' : aclass;
        return '<span class="'+aclass+'" data-link="~root.status.' + device + '^d.' + name + '"> - </span>';
    },
    device_status: function(device, name, aclass) {
        aclass = (typeof aclass === 'undefined') ? 'label-primary' : aclass;
        return '<span class="label '+aclass+'" style="margin-right: 0em" data-link="~root.status.' + device + '^' + name + '"> - </span>';
    },
    // The same with CSS class depending on the value using list of value-class pairs
    status_switch: function(name, ...arr) {
        text = '';
        for(var i = 0; i < arr.length; i+=2) text += ', \'' + arr[i] + '\', \'' + arr[i+1] + '\'';

        return '<span class="label label-primary" style="margin-right: 0em" data-link="{:~root.status.' + name + '} class{:~switch(~root.status.' + name + text + ')}"> - </span>';
    },
    device_state: function(name, aclass) {
        aclass = (typeof aclass === 'undefined') ? '' : aclass;

        // if(this.ctx.root.status[name] && 'state' in this.ctx.root.status[name])
            return '<span class="label label-primary '+aclass+'" style="margin-right: 0em" data-link="~root.status.' + name + '.state"> - </span>';
        // else
            // return '<span class="label label-primary '+aclass+'" style="margin-right: 0em" data-link="~root.status.' + name + '"> - </span>';

    },
    root: function(name, aclass) {
        aclass = (typeof aclass === 'undefined') ? '' : aclass;
        return '<span class="label label-primary '+aclass+'" style="margin-right: 0em" data-link="~root.' + name + '"> - </span>';
    },
    // Store value to our custom storage, to be later used by ~get helper
    set: function(name, value) {
        vars[name] = value;
        return;
    },
    log: function(value) { log_val = value; console.log(value); return value; },
    // Generic label
    label: label
});

$.views.settings.debugMode(true);
