Monitor = function(parent_id, root="/", base="monitor/", title="Monitor"){
    this.root = root;
    this.base = base;
    this.title = title;
    this.last_status = {};
    this.parent_id = parent_id;
    this.clients = [];

    // Render the main block from the template
    var template = getData(this.root + "template/monitor.html");
    var rendered = $.templates(template).render(this);
    this.id = $(this.parent_id).html(rendered);

    // Data-link the template to self
    $.link(true, this.id, this);

    // Buttons
    this.activateButtons(this.id);

    // Command line
    this.cmdline = $(this.id).find(".monitor-cmdline");
    this.cmdline.pressEnter($.proxy(function(event){
        this.sendCommand(this.cmdline.val());
        event.preventDefault();
    }, this));

    //
    this.timer = 0;
    this.refreshDelay = 2000;
    this.requestState();
}

// Synchronously request data from server and return it
getData = function(url){
    var result = "";

    $.ajax({
        url: url,
        async: false,
        context: this,
        dataType: "text",
        success: function(text){
            result = text;
        }
    });

    return result;
}

Monitor.prototype.sendCommand = function(command){
    $.ajax({
        url: this.base + "command",
        data: {string: command}
    });
}

Monitor.prototype.requestState = function(){
    $.ajax({
        url: this.root + this.base + "status",
        dataType : "json",
        timeout : 1000,
        context: this,

        success: function(json){
            $(this.id).find('.monitor-throbber').animate({opacity: 1.0}, 200).animate({opacity: 0.1}, 400);
            $(this.id).find(".monitor-body").removeClass("disabled-controls");

            this.json = json;

            this.updateStatus(json.status, json.clients);
        },

        error: function(){
            $(this.id).find(".monitor-body").addClass("disabled-controls");
        },

        complete: function(xhr, status) {
            clearTimeout(this.timer);
            this.timer = setTimeout($.proxy(this.requestState, this), this.refreshDelay);
        }
    });
}

Monitor.prototype.updateStatus = function(status, clients){
    show($(this.id).find(".monitor-body"));
    enable($(this.id).find(".monitor-body"));

    if(this.clients.length != Object.keys(clients).length){
        this.makeClients(clients, status);
    }

    for(var i=0; i < this.clients.length; i++){
        var client = clients[this.clients[i].name];
        var client_status = status[client['name']];
        var widget = this.clients[i]['widget'];

        $.observable(this.clients[i]['params']).setProperty(client);

        if(isEmpty(client_status) || client_status == '0' || !client['connected']) {
            hide(widget.find(".monitor-client-body"));
        } else {
            // Crude hack to re-render the template completely if structure of status has changed too much
            // It seems it can't be easily done using data-linking alone for our complex template logic
            var should_rerender = Math.abs(Object.keys(this.clients[i]['status']).length - Object.keys(client_status).length) > 1

            // Fix the incoming status so it is always an object, to be able to merge it with current status below
            if(typeof(client_status) != 'object')
                client_status = {};

            if(should_rerender){
                // Completely re-render the templated view
                this.clients[i]['status'] = client_status;
                this.renderClient(this.clients[i]);
            } else {
                // Remove entries no more in status
                for(var name in this.clients[i]['status']){
                    if(!(name in client_status) && (name.indexOf('jQuery') != 0)){
                        console.log('removeProperty', name, this.clients[i]['status'][name]);
                        $.observable(this.clients[i]['status']).removeProperty(name);
                    }
                }

                // Update templated view using data-linked values
                $.observable(this.clients[i]['status']).setProperty(client_status);
            }

            show(widget.find(".monitor-client-body"));
        }
    }

    $.observable(this.last_status).setProperty(status);
}

Monitor.prototype.makeClients = function(clients)
{
    var clientsdiv = $(this.id).find('.monitor-clients');
    var clientsstate = $(this.id).find('.monitor-clients-state');

    clientsdiv.html("");
    clientsstate.html("");

    this.clients = [];

    // Sort clients by 'order' field
    var order = Object.keys(clients).map(function(_){return [_,clients[_].order]}).sort(function(a,b) {return a[1]-b[1]});

    for(var i in order){
        var name = order[i][0];
        var client = {'name':name, 'params':clients[name]};

        this.clients.push(client);

        client['template'] = getData(this.root + 'template/' + clients[name]['template']);
        client['widget'] = $("<div/>").appendTo($(this.id).find('.monitor-clients'));
        client['status'] = typeof(status[name]) == 'object' ? status[name] : {};

        this.renderClient(client);
    }
}

Monitor.prototype.renderClient = function(client)
{
    // Render the template with data-linking to client object
    $.templates(client['template']).link(client['widget'], client);

    // Create updaters to refresh the plots
    for(var name in client['params']['plots']){
        new Updater(client['widget'].find('.monitor-plot-'+client['name']+'-'+name), 10000);
    }

    if(client['params']['webcam']){
        new Updater(client['widget'].find('.monitor-webcam-'+client['name']), 10000);
    }

    // Buttons
    this.activateButtons(client['widget']);
}

Monitor.prototype.activateButtons = function(parent)
{
    var monitor = this; // Will be re-defined inside .each()
    parent.find('button.monitor-button').each(function(i, button){
        var command = $(button).attr('data-command');
        var mode = $(button).attr('data-mode') || 'command';

        if(mode == 'input'){
            var prompt = $(button).attr('data-prompt');

            $(button).click($.proxy(function(event){
                bootbox.prompt(prompt, $.proxy(function(result){
                    if(result){
                        this.sendCommand(command.replace('${value}', result));
                    }
                }, monitor));
            }, monitor));
        } else if(mode == 'command' && command){
            $(button).click($.proxy(function(event){
                this.sendCommand(command);
                event.preventDefault();
            }, monitor));
        } else {
            $(button).addClass('disabled');
        }
    });
}
