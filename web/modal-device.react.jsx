// Device variables
class DeviceModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false};
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.show != this.state.show)
            return true;

        if(!equal(nextProps.variables, this.props.variables))
            return true;

        if(nextProps.title != this.props.title)
            return true;

        return false;
    }

    render() {
        var varlist = [];
        var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};

        if(this.state.show)
            for(var key in this.props.variables) {
                if(this.props.variables.hasOwnProperty(key)) {
                    var item = <tr key={key}><td style={style}>{key}</td><td style={style}>{JSON.stringify(this.props.variables[key])}</td></tr>;
                    varlist.push(item);
                }
            }

        return (
            <>
              {/* Activator element */}
              <span onClick={() => this.setState({show: true})}>
                {this.props.activator}
              </span>

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                  <Table striped bordered hover size="sm">
                    <tbody>
                      {varlist}
                    </tbody>
                  </Table>
                </Modal.Body>
                <Modal.Footer>
                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

// Device variables
class DeviceModalExt extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, vars: [], selvals: {}, message: null, message_icons: null, title: this.props.name};

        if (props.name == 'T0')
            this.state.show = true;
    }

    requestState() {
        if(!this.props.auth)
            return;

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/get",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {d: this.props.name, e: 1},

            success: function(json){
                window.json = json;
                this.setState({vars: json.d, title: json.statestring});
            },

            error: function(){
                this.message("API request error while updating state", "text-error");
            },

            complete: function(){
                // this.setState({inprogress: false});
                clearTimeout(this.timer);

                if (this.state.show)
                    this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
            }
        });
    }

    requestSelVal(name) {
        $.ajax({
            url: this.props.root + this.props.client.name + "/api/selval",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {d: this.props.name, n: name},

            success: function(json){
                var newselvals = deepCopy(this.state.selvals);
                newselvals[name] = deepCopy(json);

                this.setState({selvals: newselvals});
            },

            error: function(){
                this.message("API request error", "text-error");
            }
        });
    }

    sendCommand(command, device=this.props.name) {
        var cmd = 'cmd';
        var data = {d: device, c: command};

        this.message(command);

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                this.message(json.ret + ' ' + command, 'text-success');
                if(this.props.onSuccess)
                    this.props.onSuccess();
            },

            error: function(){
                this.message("API request error: " + device + ' ' + command, 'text-danger');
            },

            complete: function(){
                this.requestState();
            }
        });
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextState.show != this.state.show)
            return true;

        if(!equal(nextState, this.state))
            return true;

        if(nextProps.title != this.props.title)
            return true;

        if(nextProps.auth != this.props.auth)
            return true;

        return false;
    }

    componentDidMount() {
        this.requestState();
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    message(text, ctype="text-default", icons=null) {
        var msg = text ? <span className={"pull-left " + ctype}>{text}</span> : null;

        this.setState({message: msg, message_icons: icons});
    }

    handleShow() {
        this.setState({show: true, message: null});
        this.requestState();
    }

    handleHide() {
        this.setState({show: false});
        clearTimeout(this.timer);
    }

    render() {
        var varlist = [];
        var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};

        if(this.state.show)
            for(var key in this.state.vars) {
                if(this.state.vars.hasOwnProperty(key)) {
                    // Request SelVal meta if not yet cached
                    if ((this.state.vars[key][0] & 0x7f) == 0x07 && !this.state.selvals.hasOwnProperty(key))
                        this.requestSelVal(key);

                    var item = <DeviceVariable name={key} value={this.state.vars[key]} key={key} style={style} onMessage={(m,c,i)=>this.message(m,c,i)} selval={this.state.selvals[key]}/>;
                    varlist.push(item);
                }
            }

        return (
            <>
              {/* Activator element */}
              <span onClick={() => this.handleShow()}>
                {this.props.activator}
              </span>

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.handleHide()}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.name} {this.state.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                  <Table striped bordered hover size="sm">
                    <tbody>
                      {varlist}
                    </tbody>
                  </Table>
                </Modal.Body>
                <div style={{padding: "0.1em"}}>
                  <CmdLine name={this.props.name} client={this.props.client} onComplete={() => this.requestState()}/>
                </div>
                <Modal.Footer>
                  {this.state.message ? this.state.message : ""}

                  {this.state.message_icons ?
                   <><span style={{paddingRight: "0.5em"}}>
                   {this.state.message_icons.map((d,i) => <span key={i} style={{paddingRight: "0.3em"}}>{d}</span>)}
                     </span></> : null}

                  <Button bsStyle="default" onClick={() => this.sendCommand('info')}>Refresh</Button>
                  <Button bsStyle="default" onClick={() => this.handleHide()}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

DeviceModalExt.defaultProps = {refresh:"50000"};
DeviceModalExt = ReactRedux.connect(mapStateToProps)(DeviceModalExt);

class DeviceVariable extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {};
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(!equal(nextProps, this.props))
            return true;

        return false;
    }

    message(msg, cname='text-default', icons=null) {
        if (this.props.onMessage){
            this.props.onMessage(msg, cname, icons);
        }
    }

    render() {
        var name = this.props.name;
        var v = this.props.value;

        var flags = v[0];
        var type = flags & 0x7f;
        var basetype = flags & 0x0f;
        var dtype = flags & 0x003f0000;
        var is_fits = flags & 0x100;
        var is_writable = flags & 0x02000000;
        var is_autosave = flags & 0x00800000;

        var raw = v[1];
        var value = JSON.stringify(raw);
        var is_error = v[2];
        var is_warning = v[3];
        var desc = v[4];

        var style1 = deepCopy(this.props.style);
        var style2 = deepCopy(this.props.style);
        var cname = null;
        var icons = [];

        if (is_error)
            cname = "danger";
        else if(is_warning)
            cname = "warning";

        if (is_writable) {
            style1['fontWeight'] = 'bold';
            icons.push(<span className="glyphicon glyphicon-edit" style={{color:'lightgray'}}/>);
            // desc = <><span className="glyphicon glyphicon-edit" style={{color:'lightgray'}}/> {desc}</>;
        }

        if (is_autosave) {
            icons.push(<span className="glyphicon glyphicon-cloud" style={{color:'lightgray'}}/>);
            // desc = <><span className="glyphicon glyphicon-cloud" style={{color:'lightgray'}}/> {desc}</>;
        }

        if (is_fits) {
            style1['color'] = 'darkcyan';
            icons.push(<span className="glyphicon glyphicon-floppy-save" style={{color:'lightgray'}}/>);
            // desc = <><span className="glyphicon glyphicon-floppy-save" style={{color:'lightgray'}}/> {desc}</>;
        }

        if ((basetype == 0x04 || basetype == 0x05) && (dtype == 0x00040000 || dtype == 0x000c0000))
            // Float + deg dist
            value = toSexa(raw, 'deg', false, ' ');
        else if ((basetype == 0x04 || basetype == 0x05) && dtype == 0x00050000)
            // Float + percents
            value = raw + ' %';
        else if (basetype == 0x03)
            // Time
            value = <UnixTime time={raw}/>;
        else if (basetype == 0x06 && flags & 0x000b0000)
            // On/Off
            value = raw ? 'On' : 'Off';
        else if (basetype == 0x06)
            // Boolean
            value = raw ? 'True' : 'False';
        else if (basetype == 0x07 && this.props.selval && this.props.selval.length > raw)
        // Selection
            value = raw + ' : ' + this.props.selval[raw];
        else if (basetype == 0x09)
            // RA/Dec
            value = toSexa(raw['ra']/15, 'deg', false, ":", 3) + ' ' + toSexa(raw['dec'], 'deg', true, ":", 2);
        else if (basetype == 0x0a)
            // Alt/Az
            value = toSexa(raw['alt'], 'deg', false, " ", 2) + ' ' + toSexa(raw['az'], 'deg', true, " ", 2);

        return (
            <tr className={cname}><td style={style1} onMouseEnter={()=>this.message(desc, 'text-default', icons)} onMouseLeave={()=>this.message(null)}>{name}</td><td style={style2}>{value}</td></tr>
        );
    }
}
