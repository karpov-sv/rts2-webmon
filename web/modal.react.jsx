// Messages log and command line
class LogModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, messages: [], error: "Loading...",
                      checkbox: {info: true, warning: true, error: true, debug: false}};

        this.last = 0;
        this.messages_end = React.createRef();
        this.modal_body = React.createRef();
        this.should_scroll = true;
    }

    componentDidMount() {
        this.requestState();
    }

    scrollToBottom() {
        if(this.messages_end && this.messages_end.current && this.should_scroll && this.state.show) {
            this.messages_end.current.scrollIntoView({ behavior: 'smooth' });
            this.should_scroll = false;
        } else if(this.messages_end && this.messages_end.current) {
            this.should_scroll = false;
        } else {
            // Not yet properly initialized
        }
    }

    componentDidUpdate() {
        this.scrollToBottom();
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(this.should_scroll)
            return true;

        if(nextProps.auth != this.props.auth)
            return true;

        if(!equal(this.state, nextState))
            return true;

        return false;
    }

    requestState() {
        if(!this.props.auth)
            return;

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/msgqueue",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {from: this.last, random: now()},

            success: function(json){
                var messages = deepCopy(this.state.messages);

                for (var i = 0; i < json.d.length; i++)
                    // if (json.d[i][0] > this.last) {
                    if (true) {
                        messages.push(json.d[i]);
                        this.last = Math.max(this.last, json.d[i][0]);

                        if (messages.length > 1000)
                            // Keep the length of messages reasonable
                            messages.shift();
                    }

                this.setState({error: null, messages: messages});
            },

            error: function(){
                this.setState({error: "API request error"});
            },

            complete: function(xhr, status) {
                clearTimeout(this.timer);

                if(this.state.show)
                    this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
                else
                    this.timer = setTimeout($.proxy(this.requestState, this), 30000.0);
            }
        });
    }

    handleCheckbox(evt, type) {
        var checkbox = deepCopy(this.state.checkbox);

        checkbox[type] = evt.target.checked;

        this.setState({checkbox: checkbox});
    }

    handleShow() {
        this.setState({show: true});
        this.should_scroll = true;
        this.requestState();
    }

    render() {
        var list = [];

        if(this.state.show)
            for (var i = 0; i < this.state.messages.length; i++) {
                var msg = this.state.messages[i];

                var type = ({0x01: "E", 0x02: "W", 0x04: "I", 0x08: "D"})[msg[2] & 0x1f];
                var ctype = ({0x01: "danger", 0x02: "warning", 0x04: "default", 0x08: "info"})[msg[2] & 0x1f];
                var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};

                /* MESSAGE_REPORTIT */
                if (msg[2] & 0x100000)
                    ctype = "success";

                if((type == 'I' && this.state.checkbox.info) ||
                   (type == 'W' && this.state.checkbox.warning) ||
                   (type == 'E' && this.state.checkbox.error) ||
                   (type == 'D' && this.state.checkbox.debug))
                    list.push(<tr key={i} className={ctype}><td nowrap={1} style={style}>{unixtime(msg[0], false)}</td><td style={style}>{msg[1]}</td><td style={style}>{type}</td><td nowrap={1} style={style}>{msg[3]}</td></tr>);
            }

        if(this.messages_end.current && this.modal_body.current &&
           this.messages_end.current.getBoundingClientRect().bottom <= this.modal_body.current.getBoundingClientRect().bottom + 10)
            this.should_scroll = true;

        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.handleShow()}>
                 {this.props.activator}
               </span>
              }
              {!this.props.activator &&
               <span className="glyphicon glyphicon-console icon" onClick={() => this.handleShow()} title="Messages Log + Command Line"/>
              }

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})} onEntered={() => this.scrollToBottom()}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title ? this.props.title : "Messages Log : " + this.props.client.description}</Modal.Title>
                </Modal.Header>
                <div ref={this.modal_body}>
                  <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                    {list.length ?
                     <Table striped bordered hover size="sm">
                       <tbody>
                         {list}
                       </tbody>
                     </Table>
                     : <p className="text-center">{this.state.error}</p>}
                    <div className="ref" ref={this.messages_end} id={"log_modal_end_"+this.props.client.name}/>
                  </Modal.Body>
                </div>
                <div style={{padding: "0.1em"}}>
                  <CmdLine client={this.props.client} onComplete={() => this.requestState()}/>
                </div>
                <Modal.Footer>
                  <Checkbox onChange={evt => this.handleCheckbox(evt, "info")} inline={1} className="pull-left" checked={this.state.checkbox.info}>Info</Checkbox>
                  <Checkbox onChange={evt => this.handleCheckbox(evt, "warning")} inline={1} className="pull-left" checked={this.state.checkbox.warning}>Warning</Checkbox>
                  <Checkbox onChange={evt => this.handleCheckbox(evt, "error")} inline={1} className="pull-left" checked={this.state.checkbox.error}>Error</Checkbox>
                  <Checkbox onChange={evt => this.handleCheckbox(evt, "debug")} inline={1} className="pull-left" checked={this.state.checkbox.debug}>Debug</Checkbox>
                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}
LogModal.defaultProps = {refresh:"5000"};
LogModal = ReactRedux.connect(mapStateToProps)(LogModal);

// Authentication window and indicator
class AuthModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, disabled: false, message: null, username: "", password: ""};
    }

    handleChange(event) {
        this.setState({[event.target.id]: event.target.value});
    }

    handleSubmit(event) {
        this.setState({disabled: true});

        this.sendAuth(this.state.username, this.state.password);

        event.preventDefault();
    }

    sendAuth(username, password) {
        $.ajax({
            url: this.props.root + "monitor/auth",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: {username: username, password: password},

            success: function(json){
                if(json.auth) {
                    this.setState({message: null, show: false});
                    this.props.dispatch(globalSetAuth(true));
                } else {
                    this.setState({message: "Invalid username or password"});
                    this.props.dispatch(globalSetAuth(false));
                }
            },

            error: function(){
                this.setState({message: "API request error"});
            },

            complete: function(xhr, status) {
                this.setState({disabled: false});
            }
        });
    }

    handleLogout() {
        this.sendAuth("","");
    }

    handleShow() {
        this.setState({username: "", password: "", show: true, message: ""});
    }

    render() {
        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.handleShow()}>
                 {this.props.activator}
               </span>}
              {!this.props.activator && this.props.auth &&
               <>
                 Logged in as <strong>{this.props.username}</strong>.
                 <a onClick={() => this.handleLogout()}><span className="glyphicon glyphicon-log-out icon"/> Log out</a>
               </>}
              {!this.props.activator && !this.props.auth &&
               <a onClick={() => this.handleShow()}><span className="glyphicon glyphicon-log-in icon"/> Log in</a>
              }

              {/* Modal window */}
              <Modal bsSize="sm" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>Authentication</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form onSubmit={evt => this.handleSubmit(evt)}>
                    <FormGroup controlId="username" bsSize="large">
                      <ControlLabel>Username</ControlLabel>
                      <FormControl autoFocus type="text" value={this.state.username} onChange={(evt) => this.handleChange(evt)}/>
                    </FormGroup>
                    <FormGroup controlId="password" bsSize="large">
                      <ControlLabel>Password</ControlLabel>
                      <FormControl value={this.state.password} type="password" onChange={(evt) => this.handleChange(evt)}/>
                    </FormGroup>
                    {this.state.message &&
                     <p className="text-danger text-center">{this.state.message}</p>}
                    <Button block bsSize="large" type="submit" disabled={this.state.disabled}>Login</Button>
                  </Form>
                </Modal.Body>
              </Modal>
            </>
        );
    }
}

AuthModal = ReactRedux.connect(mapStateToProps)(AuthModal);

// List of buttons for a quick commands
class CmdModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, disabled: false, message: null, ret: 0};
    }

    handleShow() {
        this.setState({show: true, message: null});
        this.pos = 0;
    }

    sendCommand(command) {
        var cmd;
        var data;
        var m = parseCommand(command);

        if(m)
            [cmd,data] = m;
        else {
            this.setState({message: "Can't parse command: " + command});
            return;
        }

        this.setState({message: "", disabled: true});

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/"+cmd,
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                this.setState({message: json.ret + ' ' + command, ret: json.ret});
            },

            error: function(){
                this.setState({message: "API request error", ret: -1});
            },

            complete: function(xhr, status) {
                this.setState({disabled: false});
            }
        });
    }

    render() {
        var cmdlist = [];

        for(var key in this.props.commands) {
            if(this.props.commands.hasOwnProperty(key)) {
                var buttonlist = [];

                for(var ckey in this.props.commands[key]) {
                    buttonlist.push(<Button key={ckey} onClick={this.sendCommand.bind(this, this.props.commands[key][ckey])}>{ckey}</Button>);
                }

                cmdlist.push(
                    <span style={{paddingLeft: "1em"}} key={key}>
                      <ButtonGroup>
                        <Button disabled>{key}:</Button>
                        {buttonlist}
                      </ButtonGroup>
                    </span>
                );
            }
        }

        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.handleShow()}>
                 {this.props.activator}
               </span>}
              {!this.props.activator && this.props.auth &&
               <span className="glyphicon glyphicon-cog icon" onClick={() => this.handleShow()} title="Quick Commands"/>
              }

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>Quick Commands : {this.props.client.description}</Modal.Title>
                </Modal.Header>
                <Modal.Body>

                  {cmdlist}

                </Modal.Body>
                <Modal.Footer>
                  <span className="pull-left">
                    {this.state.message &&
                     <span className={this.state.ret ? "text-danger" : "text-success"}>{this.state.message}</span>}
                  </span>
                  <Button bsStyle="default" onClick={() => this.setState({show: false})}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

CmdModal = ReactRedux.connect(mapStateToProps)(CmdModal);

// List of observations
class ObsModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, observations: [], messages: [], error: "Loading..."};

        this.observations_end = React.createRef();
        this.modal_body = React.createRef();
        this.should_scroll = true;
        this.should_update = false;

        this.night = null;
        this.night_input = null;
    }

    componentDidMount() {
        // this.requestState();
    }

    scrollToBottom() {
        if(this.observations_end && this.observations_end.current && this.should_scroll && this.state.show) {
            this.observations_end.current.scrollIntoView({ behavior: 'smooth' });
            this.should_scroll = false;
        } else if(this.observations_end && this.observations_end.current)
            this.should_scroll = false;
        else {
            // Not yet properly initialized?..
        }
    }

    componentDidUpdate() {
        this.scrollToBottom();
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(this.should_scroll)
            return true;

        if(nextProps.auth != this.props.auth)
            return true;

        if(!equal(this.state, nextState))
            return true;

        return this.should_update;
    }

    requestState() {
        if(!this.props.auth)
            return;

        var data = {};

        if (this.state.night)
            data['night'] = this.state.night;

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/obytime",
            dataType : "json",
            timeout : 10000,
            context: this,
            data: data,

            success: function(json){
                this.setState({error: null, observations: json.d, h: json.h, messages: json.messages.d});
                this.should_update = true;
            },

            error: function(){
                this.setState({error: "API request error"});
            },

            complete: function(xhr, status) {
                clearTimeout(this.timer);
                this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
            }
        });
    }

    handleShow() {
        this.setState({show: true, night: null, night_input: null}, () => this.requestState());
        this.should_scroll = true;
    }

    handleHide() {
        this.setState({show: false});
        clearTimeout(this.timer);
    }

    handleChange(event) {
        this.setState({night_input: event.target.value});
    }

    handleSubmit(event) {
        this.setState({night: this.state.night_input, observations: [], messages: []}, () => this.requestState());
        event.preventDefault();
    }

    render() {
        var list = [];

        if(this.state.show) {
            var prev = null;
            var mi = 0;

            var add_msg = (mi) => {
                var msg = this.state.messages[mi];
                var type = ({0x01: "E", 0x02: "W", 0x04: "I", 0x08: "D"})[msg[2] & 0x1f];
                var ctype = ({0x01: "danger", 0x02: "warning", 0x04: "success", 0x08: "info"})[msg[2] & 0x1f];
                var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};

                list.push(<li key={'mi_' + mi} className={"list-group-item list-group-item-" + ctype} style={style}>
                            <span style={{minWidth: "20em", display: "inline-block"}}>
                              {unixtime(msg[0], false)}
                            </span>
                            <span style={{minWidth: "5em", display: "inline-block"}}>
                              {msg[1]}
                            </span>
                            {type}
                            &emsp;
                            {msg[3]}
                          </li>);};

            for (var i = 0; i < this.state.observations.length; i++) {
                var obs = this.state.observations[i];
                var reuse = false;
                var style = {paddingTop: '0.1em', paddingBottom: '0.1em'};

                if (prev && prev[6] == obs[6]) {
                    reuse = true;
                    style['borderTop'] = 0;
                }

                // Messages before current observation
                while (mi < this.state.messages.length && this.state.messages[mi][0] < obs[1]) {
                    add_msg(mi);
                    mi ++;
                    reuse = false;
                }

                var aclass = "";
                if (obs[4] == 0 && obs[6] != 1 && obs[6] != 2 && obs[6] != 21)
                    aclass = "list-group-item-warning";
                if (obs[4] == 0 && obs[6] == 12)
                    aclass = "list-group-item-danger";

                list.push(<li key={i} className={"list-group-item " + aclass} style={style}>
                            <span style={{minWidth: "5em", display: "inline-block"}}>
                              <a href={this.state.h[0].prefix + obs[0]} target="_blank">{ obs[0] }</a>
                            </span>

                            <span style={{minWidth: "5em", display: "inline-block"}}>
                              { !reuse ?
                                <a href={this.state.h[6].prefix + obs[6]} target="_blank">{ obs[6] }</a>
                                : ''
                              }
                            </span>

                            <span style={{minWidth: "8em", display: "inline-block", marginRight: "0.5em"}}>
                              { !reuse ? obs[7] : '' }
                            </span>

                            <span style={{minWidth: "4em", display: "inline-block"}}>
                              {obs[4] == obs[5] ? obs[4] : obs[4] + '/' + obs[5]}
                            </span>

                            {unixtime(obs[2], false)}
                            &emsp;&mdash;&emsp;
                            {unixtime(obs[3], false)}

                          </li>);
                prev = obs;
            }

            // Messages after end of all observations
            while (mi < this.state.messages.length) {
                add_msg(mi);
                mi ++;
            }
        }

        if(this.observations_end.current && this.modal_body.current &&
           this.observations_end.current.getBoundingClientRect().bottom <= this.modal_body.current.getBoundingClientRect().bottom + 10)
            this.should_scroll = true;

        this.should_update = false;

        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.handleShow()}>
                 {this.props.activator}
               </span>
              }
              {!this.props.activator &&
               <span className="glyphicon glyphicon-list icon" onClick={() => this.handleShow()} title="List of Observations"/>
              }

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.handleHide()} onEntered={() => this.scrollToBottom()}>
                <Modal.Header closeButton>
                  <Modal.Title>
                    {this.props.title ? this.props.title : "List of Observations : " + this.props.client.description}
                    {this.state.night ? ' : ' + this.state.night : ''}
                  </Modal.Title>
                </Modal.Header>
                <div ref={this.modal_body}>
                  <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0, 'whiteSpace': 'nowrap'}}>
                    {list.length ?
                     <ul className="list-group">
                       { list }
                     </ul>
                     : <p className="text-center">{this.state.error}</p>}
                    <div className="ref" ref={this.observations_end} />
                  </Modal.Body>
                </div>
                <Modal.Footer>
                  <span className="pull-left">

                    <Form inline onSubmit={evt => this.handleSubmit(evt)}>

                      <FormControl
                        type="text"
                        value={this.state.night_input}
                        onChange={(evt) => this.handleChange(evt)}
                        placeholder="YYYY-MM-DD"/>
                      {' '}
                      <Button type="submit">Show Night</Button>
                    </Form>
                  </span>

                  <Button bsStyle="default" onClick={() => this.handleHide()}>Close</Button>
                </Modal.Footer>
              </Modal>
            </>
        );
    }
}

ObsModal.defaultProps = {refresh:"30000"};
ObsModal = ReactRedux.connect(mapStateToProps)(ObsModal);
