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

        // if (props.name == 'C0')
        //     this.state.show = true;
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

    sendCommandEx(cmd, data) {
        $.ajax({
            url: this.props.root + this.props.client.name + "/api/" + cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                if (json.ret == 0)
                    this.message(json.ret + ' ' + cmd, 'text-success');
                else
                    this.message(json.ret + ' ' + cmd + ' ' + JSON.stringify(data), 'text-danger');

                if(this.props.onSuccess)
                    this.props.onSuccess();
            },

            error: function(){
                this.message("API request error: " + cmd + " " + JSON.stringify(data), 'text-danger');
            },

            complete: function(){
                this.requestState();
            }
        });
    }

    sendCommand(command, device=this.props.name) {
        this.message(command);
        this.sendCommandEx('cmd', {d: device, c: command});
    }

    sendVariable(name, value) {
        this.sendCommandEx('set', {d: this.props.name, n: name, v: value});
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
        // this.requestState();
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

                    var item = <DeviceVariable name={key} value={this.state.vars[key]} key={key} style={style} onMessage={(m,c,i)=>this.message(m,c,i)} onChange={(n,v)=>this.sendVariable(n,v)} selval={this.state.selvals[key]}/>;
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
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.handleHide()} keyboard={false}>
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

DeviceModalExt.defaultProps = {refresh:"5000"};
DeviceModalExt = ReactRedux.connect(mapStateToProps)(DeviceModalExt);

class CustomToggle extends React.Component {
    constructor(props, context) {
        super(props, context);
    }

    handleClick(e) {
        e.preventDefault();
        this.props.onClick(e);
    }

    render() {
        return (
            <span onClick={(e) => this.handleClick(e)}>
              {this.props.children}
              {this.props.caret && <span className="caret" />}
            </span>
        );
    }
}

class DeviceVariable extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {edit: false, newvalue: null};
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(!equal(nextProps, this.props))
            return true;

        if(!equal(nextState, this.state))
            return true;

        return false;
    }

    message(msg, cname='text-default', icons=null) {
        if (this.props.onMessage){
            this.props.onMessage(msg, cname, icons);
        }
    }

    sendValue(value) {
        if (value === null)
            // unchanged value
            return;

        if((this.basetype >= 0x02 && this.basetype <= 0x08) && typeof(value) == 'string' && !value.length)
            value='nan';

        if(this.basetype == 0x01) {
            // String
            value = '"' + value + '"';
        } else if (this.basetype == 0x03) {
            // Time
            value = moment(value, 'YYYY-MM-DD HH:mm:ss ZZ').unix();
        } else if (this.basetype == 0x09) {
            // RA/Dec
            var s = value.trim().split(/\s+/);

            if (s.length == 2 && isNaN(s[0]))
                value = 15.0*fromSexa(s[0]) + ' ' + fromSexa(s[1]);
            else if (s.length == 2)
                value = fromSexa(s[0]) + ' ' + fromSexa(s[1]);
            else if (s.length == 6)
                value = 15.0*fromSexa(s[0] + ' ' + s[1] + ' ' + s[2]) + ' ' + fromSexa(s[3] + ' ' + s[4] + ' ' + s[5]);
            else
                return;
        } else if (this.basetype == 0x0a) {
            // Alt/Az
            var s = value.trim().split(/\s+/);

            if (s.length == 2)
                value = fromSexa(s[0]) + ' ' + fromSexa(s[1]);
            else if (s.length == 6)
                value = fromSexa(s[0] + ' ' + s[1] + ' ' + s[2]) + ' ' + fromSexa(s[3] + ' ' + s[4] + ' ' + s[5]);
            else
                return;
        }

        if(this.props.onChange)
            this.props.onChange(this.props.name, value);
    }

    handleChange(event, submit=false) {
        const value = event.target.value;

        this.setState({newvalue: value});

        if(submit) {
            this.sendValue(value);
            this.setState({edit: false});
        }
    }

    handleKeyDown(event) {
        if(event.key == 'Escape'){
            this.setState({edit: false});
            event.preventDefault();
        }
    }

    handleKeyPress(event) {
        if(event.key == 'Enter'){
            this.setState({edit: false});

            this.sendValue(this.state.newvalue);

            event.preventDefault();
        }
    }

    render() {
        var name = this.props.name;
        var v = this.props.value;

        var flags = v[0];
        var type = flags & 0x7f;
        var basetype = flags & 0x0f;
        var extype = flags & 0x70;
        var dtype = flags & 0x003f0000;

        this.flags = flags;
        this.type = type;
        this.basetype = basetype;
        this.extype = extype;
        this.dtype = dtype;

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

        var selval = this.props.selval;

        if (is_error)
            cname = "danger";
        else if(is_warning)
            cname = "warning";

        if (is_writable) {
            style1['fontWeight'] = 'bold';
            icons.push(<span className="glyphicon glyphicon-edit" style={{color:'lightgray'}}/>);
        }

        if (is_autosave) {
            icons.push(<span className="glyphicon glyphicon-cloud" style={{color:'lightgray'}}/>);
        }

        if (is_fits) {
            style1['color'] = 'darkcyan';
            icons.push(<span className="glyphicon glyphicon-floppy-save" style={{color:'lightgray'}}/>);
        }

        // Selections
        if (basetype == 0x06 && flags & 0x000b0000)
            // On/Off
            selval = ['Off', 'On'];
        else if (basetype == 0x06)
            // Boolean
            selval = ['False', 'True'];

        if (selval && selval.length > raw) {

            // Selection value
            value = raw + ' : ' + selval[raw];

            if (is_writable){// && this.state.edit){
                value = <Dropdown id='dropdown'
                                  onSelect={(v) => {this.setState({edit: false}); this.sendValue(v);}}>

                          <CustomToggle caret bsRole="toggle">{raw + ' : ' + selval[raw]}</CustomToggle>
                          <Dropdown.Menu>
                            {selval.map((d,i) => <MenuItem key={i} eventKey={i} active={i==raw}>{d}</MenuItem>)}
                          </Dropdown.Menu>


                        </Dropdown>;
            }
        } else {

            // Normal text-based values
            var evalue = raw;

            if (extype == 0x40 && basetype == 0x01)
                // Array
                value = <i>{raw.map((d) => '"'+d+'"').join(' ')}</i>;
            else if (extype == 0x40 && basetype >= 0x02 && basetype <= 0x08) {
                // Array
                value = raw.join(' ');
                evalue = raw.map((d) => (basetype == 0x06 ? (d ? 1 : 0) : d)).join(' ');
            } else if (extype == 0x40)
                // Array
                value = raw.join(' ');

            else if (extype == 0x30) {
                // Rectangle
                value = '[ ' + raw.join(' ') + ' ]';
                // value = 'x:' + raw[0] + ' y:' + raw[1] + ' w:' + raw[2] + ' h:' + raw[3];
                evalue = raw.join(' ');
            } else if (basetype == 0x01)
                // Single string
                value = <i>{raw}</i>;

            else if (basetype == 0x02 && dtype == 0x00070000)
                // HEX value
                value = "0x" + raw.toString(16);

            else if ((basetype == 0x04 || basetype == 0x05) && (dtype == 0x00040000 || dtype == 0x000c0000))
                // Float + deg dist
                value = toSexa(raw, 'deg', false, ' ');
            else if ((basetype == 0x04 || basetype == 0x05) && dtype == 0x00050000)
                // Float + percents
                value = raw + ' %';
            else if (basetype == 0x03) {
                // Time
                value = <UnixTime time={raw}/>;
                evalue = raw ? unixtime(raw, false) : unixtime(now(), false);
            } else if (basetype == 0x09) {
                // RA/Dec
                value = toSexa(raw['ra']/15, 'deg', false, ":", 3) + ' ' + toSexa(raw['dec'], 'deg', true, ":", 2);
                evalue = value;
            } else if (basetype == 0x0a) {
                // Alt/Az
                value = toSexa(raw['alt'], 'deg', false, " ", 2) + ' ' + toSexa(raw['az'], 'deg', true, " ", 2);
                evalue = value;
            }

            if (is_writable && this.state.edit){
                value = <input defaultValue={evalue} autoFocus
                               style={{border: '1px', padding: 0, width: '100%'}}
                               onChange={(evt) => this.handleChange(evt)}
                               onKeyPress={(evt) => this.handleKeyPress(evt)}
                               onKeyDown={(evt) => this.handleKeyDown(evt)}
                               onBlur={() => this.setState({edit: false})}/>;
            }
        }

        return (
            <tr className={cname}>
              <td style={style1} onMouseEnter={()=>this.message(desc, 'text-default', icons)} onMouseLeave={()=>this.message(null)}>
                {name}
              </td>
              <td style={style2}
                  onClick={()=>{if (is_writable) this.setState({edit: true});}}>
                {value}
              </td>
            </tr>
        );
    }
}
