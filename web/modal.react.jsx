class DeviceModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false};
    }

    render() {
        var varlist = [];
        var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};

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

class LogModal extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {show: false, messages: [], error: "Loading...",
                      checkbox: {info: true, warning: true, error: true, debug: false}};

        this.last = 0;
    }

    componentDidMount() {
        this.requestState();
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }

    requestState() {
        if(!this.props.auth)
            return;

        $.ajax({
            url: this.props.root + this.props.client.name + "/api/msgqueue",
            dataType : "json",
            timeout : 10000,
            context: this,

            success: function(json){
                var messages = this.state.messages;

                for (var i = 0; i < json.d.length; i++)
                    if (json.d[i][0] > this.last) {
                        messages.push(json.d[i]);
                        this.last = json.d[i][0];

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
                this.timer = setTimeout($.proxy(this.requestState, this), this.props.refresh);
            }
        });
    }

    handleCheckbox(evt, type) {
        var checkbox = this.state.checkbox;

        checkbox[type] = evt.target.checked;

        this.setState({checkbox: checkbox});
    }

    render() {
        var list = [];

        for (var i = 0; i < this.state.messages.length; i++) {
            var msg = this.state.messages[i];

            var type = ({0x01: "E", 0x02: "W", 0x04: "I", 0x08: "D"})[msg[2] & 0x1f];
            var ctype = ({0x01: "danger", 0x02: "warning", 0x04: "default", 0x08: "info"})[msg[2] & 0x1f];
            var style = {padding: '0.2em', paddingLeft: '0.5em', paddingRight: '0.5em'};

            if((type == 'I' && this.state.checkbox.info) ||
               (type == 'W' && this.state.checkbox.warning) ||
               (type == 'E' && this.state.checkbox.error) ||
               (type == 'D' && this.state.checkbox.debug))
                list.push(<tr key={i} className={ctype}><td nowrap={1} style={style}>{unixtime(msg[0], false)}</td><td style={style}>{msg[1]}</td><td style={style}>{type}</td><td nowrap={1} style={style}>{msg[3]}</td></tr>);
        }

        return (
            <>
              {/* Activator element */}
              {this.props.activator &&
               <span onClick={() => this.setState({show: true})}>
                 {this.props.activator}
               </span>
              }
              {!this.props.activator &&
               <span className="glyphicon glyphicon-list" onClick={() => this.setState({show: true})} title="Messages Log"/>
              }

              {/* Modal window */}
              <Modal bsSize="lg" show={this.state.show} onHide={() => this.setState({show: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.props.title ? this.props.title : "Messages Log"}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{'maxHeight': 'calc(100vh - 210px)', 'overflowY': 'auto', 'overflowX': 'auto', 'padding': 0}}>
                  {list.length ?
                   <Table striped bordered hover size="sm">
                     <tbody>
                       {list}
                     </tbody>
                   </Table>
                   : <p className="text-center">{this.state.error}</p>}
                </Modal.Body>
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
                 <a onClick={() => this.handleLogout()}><span className="glyphicon glyphicon-log-in"/> Log out</a>
               </>}
              {!this.props.activator && !this.props.auth &&
               <a onClick={() => this.handleShow()}><span className="glyphicon glyphicon-log-in"/> Log in</a>
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